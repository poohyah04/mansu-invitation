import type { Clip, Cue } from "./types";
import { formatFfmpegTime, formatSrtTime } from "./time";
import { sliceCues } from "./transcript";

export type CropMode = "center" | "blur";

/**
 * 클립 하나를 9:16 세로 영상으로 뽑는 ffmpeg 명령을 만든다.
 *
 * `-ss` 를 `-i` 앞에 두면 키프레임 단위로 빠르게 탐색하고,
 * 길이는 `-to` 대신 `-t`(구간 길이)로 줘야 입력 기준으로 해석되어 어긋나지 않는다.
 */
export function buildFfmpegCommand(
  clip: Clip,
  opts: { input?: string; mode?: CropMode; burnSubtitles?: boolean } = {},
): string {
  const input = opts.input ?? "input.mp4";
  const mode = opts.mode ?? "center";
  const index = String(clip.rank).padStart(2, "0");
  const output = `clip-${index}.mp4`;
  const duration = Math.max(1, clip.end_sec - clip.start_sec);

  // 자막 굽기는 별도 `-vf` 가 아니라 기존 필터 체인 끝에 이어 붙여야 한다.
  const burn = opts.burnSubtitles
    ? `,subtitles=clip-${index}.srt:force_style='Fontsize=18,Outline=2,MarginV=120'`
    : "";

  const videoArgs =
    mode === "center"
      ? // 가운데를 9:16 으로 잘라내고 1080x1920 으로 맞춘다.
        `-vf "crop=ih*9/16:ih,scale=1080:1920${burn}"`
      : // 원본을 흐린 배경 위에 얹는다. 화면 밖으로 잘려나가는 내용이 없다.
        `-filter_complex "[0:v]split=2[bg][fg];` +
        `[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5[bgb];` +
        `[fg]scale=1080:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2${burn}"`;

  return [
    "ffmpeg",
    `-ss ${formatFfmpegTime(clip.start_sec)}`,
    `-i ${input}`,
    `-t ${duration.toFixed(3)}`,
    videoArgs,
    "-c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p",
    "-c:a aac -b:a 128k",
    output,
  ].join(" ");
}

/** 클립 구간의 자막만 잘라 0초 기준 SRT 로 만든다. */
export function buildClipSrt(clip: Clip, cues: Cue[]): string {
  const sliced = sliceCues(cues, clip.start_sec, clip.end_sec);
  return sliced
    .map((cue, i) =>
      [
        i + 1,
        `${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}`,
        cue.text,
        "",
      ].join("\n"),
    )
    .join("\n");
}
