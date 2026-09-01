/** 초 -> "1:23" 또는 "1:02:03" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(sec).padStart(2, "0")}`
    : `${mm}:${String(sec).padStart(2, "0")}`;
}

/** 초 -> "00:01:23,456" (SRT 타임코드) */
export function formatSrtTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/** 초 -> "00:01:23.456" (ffmpeg -ss 용) */
export function formatFfmpegTime(seconds: number): string {
  return formatSrtTime(seconds).replace(",", ".");
}

/** "00:01:23,456" / "00:01:23.456" / "01:23.4" -> 초 */
export function parseTimecode(raw: string): number | null {
  const m = raw
    .trim()
    .match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, h, mm, ss, frac] = m;
  const ms = frac ? Number(frac.padEnd(3, "0")) : 0;
  return Number(h ?? 0) * 3600 + Number(mm) * 60 + Number(ss) + ms / 1000;
}
