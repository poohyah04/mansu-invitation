import assert from "node:assert/strict";
import { after, before, test, type TestContext } from "node:test";
import { mkdtemp, rm, writeFile, chmod, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { run, which } from "../lib/proc.ts";
import { extractAudio, probeDuration, renderClip } from "../lib/media.ts";
import { resolveWhisper, transcribe } from "../lib/whisper.ts";
import type { Clip } from "../lib/types.ts";

let dir: string;
let hasFfmpeg = false;
/** 720p 40초짜리 시험용 영상. ffmpeg 가 있으면 그 자리에서 만든다. */
let FIXTURE: string | null = process.env.SAMPLE_VIDEO ?? null;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "shorts-test-"));
  hasFfmpeg = Boolean(await which("ffmpeg"));
  if (!hasFfmpeg || FIXTURE) return;

  FIXTURE = path.join(dir, "sample.mp4");
  await run("ffmpeg", [
    "-nostdin", "-y",
    "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=40",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=40",
    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-shortest",
    FIXTURE,
  ]);
});

/** ffmpeg 나 샘플 영상이 없는 환경에서는 미디어 테스트를 건너뛴다. */
function needsMedia(t: TestContext): boolean {
  if (!hasFfmpeg) {
    t.skip("ffmpeg 가 설치되어 있지 않습니다");
    return false;
  }
  if (!FIXTURE) {
    t.skip("시험용 영상을 만들지 못했습니다");
    return false;
  }
  return true;
}
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

const clip: Clip = {
  rank: 3,
  start_sec: 5,
  end_sec: 13,
  title: "제목",
  hook_line: "훅",
  summary: "요약",
  virality_score: 70,
  score_reason: "이유",
  keywords: [],
  caption: "설명",
};

test("영상 길이를 읽는다", async (t) => {
  if (!needsMedia(t)) return;
  assert.equal(Math.round(await probeDuration(FIXTURE!)), 40);
});

test("길이를 못 읽는 파일은 0 을 돌려준다", async (t) => {
  if (!hasFfmpeg) return t.skip("ffmpeg 가 설치되어 있지 않습니다");
  const junk = path.join(dir, "junk.mp4");
  await writeFile(junk, "이건 영상이 아니다");
  assert.equal(await probeDuration(junk), 0);
});

test("16kHz 모노 wav 로 음성을 뽑는다", async (t) => {
  if (!needsMedia(t)) return;
  const wav = path.join(dir, "audio.wav");
  const seen: number[] = [];
  await extractAudio(FIXTURE!, wav, (s) => seen.push(s));

  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=sample_rate,channels,codec_name",
    "-of", "default=nw=1",
    wav,
  ]);
  assert.match(stdout, /codec_name=pcm_s16le/);
  assert.match(stdout, /sample_rate=16000/);
  assert.match(stdout, /channels=1/);
  assert.ok(seen.length > 0, "진행률이 보고되어야 한다");
  assert.ok(seen.at(-1)! > 30, `마지막 진행 시각이 너무 이르다: ${seen.at(-1)}`);
});

test("클립을 9:16 으로 잘라낸다", async (t) => {
  if (!needsMedia(t)) return;
  const seen: number[] = [];
  const out = await renderClip(
    FIXTURE!,
    clip,
    { mode: "center", burnSubtitles: false, cues: [], workDir: dir },
    (f) => seen.push(f),
  );

  assert.ok(out.endsWith("clip-03.mp4"), out);
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-show_entries", "format=duration",
    "-of", "default=nw=1",
    out,
  ]);
  assert.match(stdout, /width=1080/);
  assert.match(stdout, /height=1920/);

  const seconds = Number(stdout.match(/duration=([\d.]+)/)![1]);
  assert.ok(Math.abs(seconds - 8) < 1.0, `구간 길이가 8초여야 하는데 ${seconds}초`);
  assert.ok(seen.length > 0, "진행률이 보고되어야 한다");
});

test("흐린 배경 모드와 자막 굽기가 함께 동작한다", async (t) => {
  if (!needsMedia(t)) return;
  const out = await renderClip(
    FIXTURE!,
    { ...clip, rank: 4 },
    {
      mode: "blur",
      burnSubtitles: true,
      cues: [
        { start: 6, end: 9, text: "첫 자막" },
        { start: 9, end: 12, text: "둘째 자막" },
      ],
      workDir: dir,
    },
  );

  assert.ok((await stat(out)).size > 0);
  // 자막 파일이 함께 남아야 다음에 다시 쓸 수 있다.
  assert.ok((await stat(path.join(dir, "clip-04.srt"))).size > 0);

  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "default=nw=1", out,
  ]);
  assert.match(stdout, /width=1080/);
  assert.match(stdout, /height=1920/);
});

// --- whisper: 모델 없이 CLI 규약만 확인한다 ---

/** whisper.cpp 처럼 굴게 만든 가짜 실행 파일. 인자를 그대로 기록하고 SRT 를 남긴다. */
async function makeFakeWhisper(root: string): Promise<string> {
  const bin = path.join(root, "whisper-cli");
  await writeFile(
    bin,
    `#!/bin/bash
if [ "$1" = "--help" ]; then
  echo "  -osrt,     --output-srt           output result in a srt file"
  exit 0
fi
echo "$@" > "${root}/args.txt"
of=""
while [ $# -gt 0 ]; do
  case "$1" in -of) of="$2"; shift 2;; *) shift;; esac
done
echo "[00:00:05.000 --> 00:00:09.000]  받아쓴 첫 줄"
echo "[00:00:09.000 --> 00:00:13.000]  받아쓴 둘째 줄"
printf '1\\n00:00:05,000 --> 00:00:09,000\\n받아쓴 첫 줄\\n\\n2\\n00:00:09,000 --> 00:00:13,000\\n받아쓴 둘째 줄\\n' > "$of.srt"
`,
    "utf8",
  );
  await chmod(bin, 0o755);
  return bin;
}

test("whisper.cpp 규약대로 인자를 넘기고 SRT 를 읽는다", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "whisper-fake-"));
  try {
    const bin = await makeFakeWhisper(root);
    const model = path.join(root, "ggml-tiny.bin");
    await writeFile(model, "model");

    process.env.WHISPER_BIN = bin;
    process.env.WHISPER_MODEL = model;

    const setup = await resolveWhisper();
    assert.equal(setup.flavor, "cpp", "도움말에 -osrt 가 있으면 cpp 로 본다");
    assert.equal(setup.model, model);

    const seen: number[] = [];
    const cues = await transcribe(path.join(root, "audio.wav"), setup, {
      workDir: root,
      language: "ko",
      duration: 40,
      onProgress: (f) => seen.push(f),
    });

    const args = (await run("cat", [path.join(root, "args.txt")])).stdout;
    assert.match(args, /-m .*ggml-tiny\.bin/);
    assert.match(args, /-osrt/);
    assert.match(args, /-l ko/);

    assert.equal(cues.length, 2);
    assert.deepEqual(cues[0], { start: 5, end: 9, text: "받아쓴 첫 줄" });
    assert.ok(seen.length > 0, "전사 진행률이 보고되어야 한다");
    assert.ok(Math.abs(seen.at(-1)! - 13 / 40) < 0.01, `진행률 계산이 틀렸다: ${seen.at(-1)}`);
  } finally {
    delete process.env.WHISPER_BIN;
    delete process.env.WHISPER_MODEL;
    await rm(root, { recursive: true, force: true });
  }
});

test("모델이 없으면 설치 방법을 알려 준다", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "whisper-fake-"));
  try {
    process.env.WHISPER_BIN = await makeFakeWhisper(root);
    delete process.env.WHISPER_MODEL;
    await assert.rejects(resolveWhisper, /모델 파일이 없습니다/);
  } finally {
    delete process.env.WHISPER_BIN;
    await rm(root, { recursive: true, force: true });
  }
});
