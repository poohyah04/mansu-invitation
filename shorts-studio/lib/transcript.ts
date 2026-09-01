import type { Cue, Transcript, TranscriptSource } from "./types";
import { parseTimecode } from "./time";

const TIME_RANGE =
  /(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:[.,]\d{1,3})?)/;

/**
 * SRT / WebVTT 를 큐 배열로 변환한다.
 * 두 포맷은 타임코드 구분자(`,` vs `.`)와 헤더만 다르므로 같은 파서로 처리한다.
 */
export function parseSubtitles(raw: string): Cue[] {
  const body = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const cues: Cue[] = [];

  for (const block of body.split(/\n{2,}/)) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;

    const timeIndex = lines.findIndex((l) => TIME_RANGE.test(l));
    if (timeIndex === -1) continue;

    const match = lines[timeIndex].match(TIME_RANGE)!;
    const start = parseTimecode(match[1]);
    const end = parseTimecode(match[2]);
    if (start === null || end === null) continue;

    const text = lines
      .slice(timeIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text) cues.push({ start, end, text });
  }

  return cues;
}

/**
 * `[01:23] 내용` 또는 `01:23 내용` 형태의 평문 스크립트를 큐로 변환한다.
 * 다음 타임스탬프가 나올 때까지를 한 큐의 길이로 본다.
 */
export function parsePlainTimestamped(raw: string): Cue[] {
  const rough: { start: number; text: string }[] = [];

  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const m = line.match(
      /^\s*[[(]?\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?)\s*[\])]?\s*[-–:]?\s*(.*)$/,
    );
    if (!m) {
      if (rough.length > 0 && line.trim()) {
        rough[rough.length - 1].text += ` ${line.trim()}`;
      }
      continue;
    }
    const start = parseTimecode(m[1]);
    if (start === null) continue;
    rough.push({ start, text: m[2].trim() });
  }

  return rough
    .filter((r) => r.text.length > 0)
    .map((r, i, all) => ({
      start: r.start,
      end: i + 1 < all.length ? all[i + 1].start : r.start + 5,
      text: r.text,
    }));
}

/** 붙여넣은 텍스트의 형식을 추정해서 파싱한다. */
export function parsePastedTranscript(raw: string): Transcript {
  const isVtt = /^﻿?WEBVTT/.test(raw.trimStart());
  let source: TranscriptSource = isVtt ? "vtt" : "srt";
  let cues = parseSubtitles(raw);

  if (cues.length === 0) {
    source = "plain";
    cues = parsePlainTimestamped(raw);
  }

  return {
    source,
    language: null,
    duration: cues.length > 0 ? cues[cues.length - 1].end : 0,
    cues,
  };
}

/**
 * 큐를 LLM 입력용 텍스트로 직렬화한다.
 * 짧은 큐가 수천 개씩 들어오면 토큰만 먹고 의미 단위가 끊기므로,
 * `windowSeconds` 단위로 묶어서 문단처럼 만든다.
 */
export function serializeCues(cues: Cue[], windowSeconds = 12): string {
  const lines: string[] = [];
  let bucketStart: number | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (bucketStart === null || buffer.length === 0) return;
    lines.push(`[${bucketStart.toFixed(1)}] ${buffer.join(" ")}`);
    buffer = [];
    bucketStart = null;
  };

  for (const cue of cues) {
    if (bucketStart === null) bucketStart = cue.start;
    buffer.push(cue.text);
    if (cue.end - bucketStart >= windowSeconds) flush();
  }
  flush();

  return lines.join("\n");
}

/** 지정 구간에 걸치는 큐만 잘라내고, 시작을 0초로 재배치한다. */
export function sliceCues(cues: Cue[], start: number, end: number): Cue[] {
  return cues
    .filter((c) => c.end > start && c.start < end)
    .map((c) => ({
      start: Math.max(0, c.start - start),
      end: Math.min(end, c.end) - start,
      text: c.text,
    }));
}
