import "server-only";
import { run, which, ProcessError } from "./proc";
import type { Clip, Cue } from "./types";
import { formatFfmpegTime } from "./time";
import { buildClipSrt } from "./ffmpeg";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export type CropMode = "center" | "blur";

const FFMPEG = process.env.FFMPEG_BIN ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_BIN ?? "ffprobe";

export class MissingBinaryError extends Error {}

export async function requireFfmpeg(): Promise<void> {
  if (await which(FFMPEG)) return;
  throw new MissingBinaryError(
    "ffmpeg 를 찾지 못했습니다. macOS 는 `brew install ffmpeg`, Ubuntu 는 `sudo apt install ffmpeg` 로 설치해 주세요.",
  );
}

/** 영상 길이(초)를 읽는다. 컨테이너에 길이 정보가 없으면 0 을 돌려준다. */
export async function probeDuration(file: string): Promise<number> {
  try {
    const { stdout } = await run(FFPROBE, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const seconds = Number.parseFloat(stdout.trim());
    return Number.isFinite(seconds) ? seconds : 0;
  } catch (error) {
    if (error instanceof ProcessError) return 0;
    throw error;
  }
}

/**
 * whisper 가 받는 형식(16kHz 모노 16비트 wav)으로 음성만 뽑는다.
 * 영상 트랙을 버리므로 원본이 몇 기가여도 음성 파일은 시간당 100MB 남짓이다.
 */
export async function extractAudio(
  input: string,
  output: string,
  onProgress?: (seconds: number) => void,
): Promise<string> {
  await run(
    FFMPEG,
    [
      "-nostdin", "-y",
      "-i", input,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-c:a", "pcm_s16le",
      "-progress", "pipe:1",
      output,
    ],
    {
      onLine: (line) => {
        const m = line.match(/^out_time_ms=(\d+)/);
        if (m && onProgress) onProgress(Number(m[1]) / 1_000_000);
      },
    },
  );
  return output;
}

export type RenderOptions = {
  mode: CropMode;
  burnSubtitles: boolean;
  /** 자막 굽기를 켤 때 클립 구간의 자막을 만들 원본 큐 */
  cues: Cue[];
  workDir: string;
};

/** 자막 필터 인자에서 경로 구분자와 콜론을 이스케이프한다. */
function escapeForFilter(file: string): string {
  return file.replace(/\\/g, "/").replace(/:/g, "\\\\:").replace(/'/g, "\\\\'");
}

function buildFilter(mode: CropMode, subtitlePath: string | null): string[] {
  const burn = subtitlePath
    ? `,subtitles='${escapeForFilter(subtitlePath)}':force_style='Fontsize=18,Outline=2,MarginV=120'`
    : "";

  if (mode === "center") {
    return ["-vf", `crop=ih*9/16:ih,scale=1080:1920${burn}`];
  }
  return [
    "-filter_complex",
    "[0:v]split=2[bg][fg];" +
      "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5[bgb];" +
      `[fg]scale=1080:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2${burn}`,
  ];
}

/**
 * 클립 한 개를 9:16 mp4 로 뽑는다.
 *
 * `-ss` 를 `-i` 앞에 두어 빠르게 탐색하고, 길이는 `-to` 가 아니라 `-t` 로 준다.
 * `-ss` 뒤의 `-to` 는 원본 타임라인 기준으로 해석되어 구간이 어긋난다.
 */
export async function renderClip(
  source: string,
  clip: Clip,
  options: RenderOptions,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const index = String(clip.rank).padStart(2, "0");
  const output = path.join(options.workDir, `clip-${index}.mp4`);
  const duration = Math.max(1, clip.end_sec - clip.start_sec);

  let subtitlePath: string | null = null;
  if (options.burnSubtitles) {
    const srt = buildClipSrt(clip, options.cues);
    if (srt.trim()) {
      subtitlePath = path.join(options.workDir, `clip-${index}.srt`);
      await writeFile(subtitlePath, srt, "utf8");
    }
  }

  await run(
    FFMPEG,
    [
      "-nostdin", "-y",
      "-ss", formatFfmpegTime(clip.start_sec),
      "-i", source,
      "-t", duration.toFixed(3),
      ...buildFilter(options.mode, subtitlePath),
      "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      "-progress", "pipe:1",
      output,
    ],
    {
      onLine: (line) => {
        const m = line.match(/^out_time_ms=(\d+)/);
        if (m && onProgress) {
          onProgress(Math.min(1, Number(m[1]) / 1_000_000 / duration));
        }
      },
    },
  );

  return output;
}
