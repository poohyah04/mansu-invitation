import type { Cue, Transcript } from "./types";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

/** 유튜브 URL(watch / youtu.be / shorts / live / embed)에서 영상 ID를 뽑는다. */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (!host.endsWith("youtube.com")) return null;

  const v = url.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;

  const m = url.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/);
  return m ? m[1] : null;
}

/** `key = {...};` 형태에서 중괄호 균형을 세어 JSON 오브젝트만 잘라낸다. */
function extractJsonObject(html: string, key: string): string | null {
  const anchor = html.indexOf(key);
  if (anchor === -1) return null;
  const start = html.indexOf("{", anchor);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { simpleText?: string };
};

/** 요청 언어 -> 한국어 -> 영어 -> 첫 번째 순으로 자막 트랙을 고른다. 자동 생성 자막은 후순위. */
function pickTrack(
  tracks: CaptionTrack[],
  preferred?: string,
): CaptionTrack | null {
  const order = [preferred, "ko", "en"].filter(Boolean) as string[];
  for (const lang of order) {
    const manual = tracks.find(
      (t) => t.languageCode.startsWith(lang) && t.kind !== "asr",
    );
    if (manual) return manual;
    const auto = tracks.find((t) => t.languageCode.startsWith(lang));
    if (auto) return auto;
  }
  return tracks[0] ?? null;
}

type Json3 = {
  events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[];
};

function json3ToCues(data: Json3): Cue[] {
  const cues: Cue[] = [];
  for (const ev of data.events ?? []) {
    const text = (ev.segs ?? [])
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const start = (ev.tStartMs ?? 0) / 1000;
    cues.push({ start, end: start + (ev.dDurationMs ?? 3000) / 1000, text });
  }
  return cues;
}

export class TranscriptUnavailableError extends Error {}

/**
 * 유튜브 watch 페이지에 박혀 있는 플레이어 응답에서 자막 트랙 주소를 찾아 받아온다.
 * 유튜브는 이 경로를 자주 막으므로, 실패하면 사용자가 자막을 직접 붙여넣도록 안내한다.
 */
export async function fetchYoutubeTranscript(
  videoId: string,
  preferredLanguage?: string,
): Promise<Transcript> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko`, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new TranscriptUnavailableError(
      `유튜브 페이지를 불러오지 못했습니다 (HTTP ${res.status}).`,
    );
  }

  const html = await res.text();
  const rawPlayer = extractJsonObject(html, "ytInitialPlayerResponse");
  if (!rawPlayer) {
    throw new TranscriptUnavailableError(
      "유튜브가 자동 요청을 차단했습니다. 자막을 직접 붙여넣어 주세요.",
    );
  }

  let player: {
    captions?: {
      playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
    };
    videoDetails?: { title?: string; lengthSeconds?: string };
    playabilityStatus?: { status?: string; reason?: string };
  };
  try {
    player = JSON.parse(rawPlayer);
  } catch {
    throw new TranscriptUnavailableError(
      "유튜브 응답을 해석하지 못했습니다. 자막을 직접 붙여넣어 주세요.",
    );
  }

  const status = player.playabilityStatus?.status;
  if (status && status !== "OK") {
    throw new TranscriptUnavailableError(
      `재생할 수 없는 영상입니다: ${player.playabilityStatus?.reason ?? status}`,
    );
  }

  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) {
    throw new TranscriptUnavailableError(
      "이 영상에는 자막 트랙이 없습니다. 자막을 직접 붙여넣어 주세요.",
    );
  }

  const track = pickTrack(tracks, preferredLanguage);
  if (!track) {
    throw new TranscriptUnavailableError("사용할 수 있는 자막 트랙이 없습니다.");
  }

  const capRes = await fetch(`${track.baseUrl}&fmt=json3`, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
  });
  if (!capRes.ok) {
    throw new TranscriptUnavailableError(
      `자막을 내려받지 못했습니다 (HTTP ${capRes.status}).`,
    );
  }

  const cues = json3ToCues((await capRes.json()) as Json3);
  if (cues.length === 0) {
    throw new TranscriptUnavailableError("자막이 비어 있습니다.");
  }

  const declared = Number(player.videoDetails?.lengthSeconds ?? 0);
  return {
    source: "youtube",
    language: track.languageCode,
    duration: declared > 0 ? declared : cues[cues.length - 1].end,
    cues,
    videoId,
    title: player.videoDetails?.title,
  };
}

/** 특정 시점으로 바로 이동하는 유튜브 링크 */
export function youtubeTimestampUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
}
