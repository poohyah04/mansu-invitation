import assert from "node:assert/strict";
import { test } from "node:test";

import { parseTimecode, formatSrtTime, formatClock } from "../lib/time.ts";
import {
  parsePastedTranscript,
  parseSubtitles,
  parsePlainTimestamped,
  serializeCues,
  sliceCues,
} from "../lib/transcript.ts";
import { buildClipSrt, buildFfmpegCommand } from "../lib/ffmpeg.ts";
import { extractVideoId, youtubeTimestampUrl } from "../lib/youtube.ts";
import type { Clip } from "../lib/types.ts";

test("타임코드 파싱", () => {
  assert.equal(parseTimecode("00:01:23,456"), 83.456);
  assert.equal(parseTimecode("01:23"), 83);
  assert.equal(parseTimecode("1:02:03"), 3723);
  assert.equal(parseTimecode("아무 말"), null);
});

test("타임코드 출력", () => {
  assert.equal(formatSrtTime(83.456), "00:01:23,456");
  assert.equal(formatClock(83), "1:23");
  assert.equal(formatClock(3723), "1:02:03");
});

test("SRT 파싱", () => {
  const cues = parseSubtitles(
    "1\n00:00:03,000 --> 00:00:07,200\n첫 문장입니다.\n\n2\n00:00:07,200 --> 00:00:11,000\n두 번째 <i>문장</i>입니다.\n",
  );
  assert.equal(cues.length, 2);
  assert.equal(cues[0].start, 3);
  assert.equal(cues[1].text, "두 번째 문장입니다.");
});

test("WebVTT 파싱", () => {
  const t = parsePastedTranscript(
    "WEBVTT\n\n00:00.000 --> 00:04.000\n안녕하세요\n\n00:04.000 --> 00:09.500\n반갑습니다\n",
  );
  assert.equal(t.source, "vtt");
  assert.equal(t.cues.length, 2);
  assert.equal(t.duration, 9.5);
});

test("평문 타임스탬프 파싱 — 줄바꿈된 본문은 앞 큐에 이어 붙는다", () => {
  const cues = parsePlainTimestamped(
    "[00:03] 첫 문장\n이어지는 내용\n[00:20] 두 번째 문장",
  );
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, "첫 문장 이어지는 내용");
  assert.equal(cues[0].end, 20);
  assert.equal(cues[1].end, 25);
});

test("큐 직렬화는 창 단위로 묶는다", () => {
  const cues = Array.from({ length: 6 }, (_, i) => ({
    start: i * 5,
    end: i * 5 + 5,
    text: `문장${i}`,
  }));
  const lines = serializeCues(cues, 12).split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^\[0\.0\] 문장0 문장1 문장2$/);
  assert.match(lines[1], /^\[15\.0\] 문장3 문장4 문장5$/);
});

test("구간 자르기는 0초 기준으로 재배치한다", () => {
  const cues = [
    { start: 0, end: 10, text: "밖" },
    { start: 12, end: 18, text: "안" },
    { start: 19, end: 30, text: "걸침" },
  ];
  const sliced = sliceCues(cues, 11, 25);
  assert.equal(sliced.length, 2);
  assert.deepEqual(sliced[0], { start: 1, end: 7, text: "안" });
  assert.equal(sliced[1].end, 14);
});

const clip: Clip = {
  rank: 1,
  start_sec: 83.456,
  end_sec: 113.456,
  title: "제목",
  hook_line: "훅",
  summary: "요약",
  virality_score: 72,
  score_reason: "이유",
  keywords: ["a"],
  caption: "설명",
};

test("ffmpeg 명령 — 구간 길이는 -t 로 준다", () => {
  const cmd = buildFfmpegCommand(clip);
  assert.match(cmd, /-ss 00:01:23\.456 -i input\.mp4 -t 30\.000/);
  assert.match(cmd, /crop=ih\*9\/16:ih,scale=1080:1920/);
  assert.ok(cmd.trim().endsWith("clip-01.mp4"), "출력 파일이 마지막 인자여야 한다");
});

test("ffmpeg 명령 — 자막은 필터 체인 안에 들어간다", () => {
  const cmd = buildFfmpegCommand(clip, { burnSubtitles: true, mode: "blur" });
  assert.equal(cmd.match(/-vf /g), null, "blur 모드는 -filter_complex 만 쓴다");
  assert.match(cmd, /overlay=\(W-w\)\/2:\(H-h\)\/2,subtitles=clip-01\.srt/);
  assert.ok(cmd.trim().endsWith("clip-01.mp4"));
});

test("클립 SRT 는 1번부터 다시 번호를 매긴다", () => {
  const srt = buildClipSrt(clip, [
    { start: 80, end: 90, text: "앞" },
    { start: 90, end: 100, text: "뒤" },
  ]);
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:06,544\n앞\n/);
  assert.match(srt, /\n2\n00:00:06,544 --> 00:00:16,544\n뒤\n/);
});

test("유튜브 영상 ID 추출", () => {
  const id = "dQw4w9WgXcQ";
  for (const input of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?t=30`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `youtube.com/embed/${id}`,
    id,
  ]) {
    assert.equal(extractVideoId(input), id, input);
  }
  assert.equal(extractVideoId("https://vimeo.com/12345"), null);
  assert.equal(extractVideoId("그냥 문장"), null);
});

test("타임스탬프 링크", () => {
  assert.equal(
    youtubeTimestampUrl("dQw4w9WgXcQ", 83.9),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s",
  );
});

// --- 유튜브 자막 수집: 네트워크 없이 fetch 를 갈아끼워 경로 전체를 확인한다 ---

import { fetchYoutubeTranscript, TranscriptUnavailableError } from "../lib/youtube.ts";

function stubFetch(handler: (url: string) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input)));
  return () => {
    globalThis.fetch = original;
  };
}

function watchPage(player: unknown): string {
  // 실제 페이지처럼 앞뒤에 다른 스크립트를 두고, 본문에 중괄호/따옴표를 섞어 둔다.
  return `<html><script>var ytcfg={"a":"}"};ytInitialPlayerResponse = ${JSON.stringify(
    player,
  )};var other={"b":1};</script></html>`;
}

const PLAYER = {
  playabilityStatus: { status: "OK" },
  videoDetails: { title: "제목 { 중괄호 } 포함", lengthSeconds: "600" },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: "https://yt/en?x=1", languageCode: "en", kind: "asr" },
        { baseUrl: "https://yt/ko?x=1", languageCode: "ko" },
      ],
    },
  },
};

test("유튜브 자막 수집 — 수동 한국어 트랙을 고르고 큐로 변환한다", async () => {
  const restore = stubFetch((url) => {
    if (url.includes("watch")) return new Response(watchPage(PLAYER));
    assert.ok(url.startsWith("https://yt/ko"), `한국어 트랙이어야 한다: ${url}`);
    assert.ok(url.includes("fmt=json3"));
    return Response.json({
      events: [
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "안녕" }, { utf8: "하세요" }] },
        { tStartMs: 2000, dDurationMs: 3000, segs: [{ utf8: "\n" }] },
        { tStartMs: 5000, dDurationMs: 4000, segs: [{ utf8: "반갑습니다" }] },
      ],
    });
  });

  try {
    const t = await fetchYoutubeTranscript("dQw4w9WgXcQ");
    assert.equal(t.language, "ko");
    assert.equal(t.title, "제목 { 중괄호 } 포함");
    assert.equal(t.duration, 600, "선언된 길이를 쓴다");
    assert.equal(t.cues.length, 2, "빈 큐는 버린다");
    assert.deepEqual(t.cues[0], { start: 0, end: 2, text: "안녕하세요" });
  } finally {
    restore();
  }
});

test("유튜브 자막 수집 — 자막이 없으면 붙여넣기로 안내한다", async () => {
  const restore = stubFetch(() =>
    new Response(watchPage({ ...PLAYER, captions: undefined })),
  );
  try {
    await assert.rejects(
      () => fetchYoutubeTranscript("dQw4w9WgXcQ"),
      (e: Error) =>
        e instanceof TranscriptUnavailableError && /직접 붙여넣어/.test(e.message),
    );
  } finally {
    restore();
  }
});

test("유튜브 자막 수집 — 차단당하면 붙여넣기로 안내한다", async () => {
  const restore = stubFetch(() => new Response("blocked", { status: 403 }));
  try {
    await assert.rejects(
      () => fetchYoutubeTranscript("dQw4w9WgXcQ"),
      (e: Error) => e instanceof TranscriptUnavailableError && /403/.test(e.message),
    );
  } finally {
    restore();
  }
});
