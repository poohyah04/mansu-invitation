import {
  TranscriptUnavailableError,
  extractVideoId,
  fetchYoutubeTranscript,
} from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { url?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 본문을 읽지 못했습니다." }, { status: 400 });
  }

  const videoId = extractVideoId(body.url ?? "");
  if (!videoId) {
    return Response.json(
      { error: "유튜브 주소를 인식하지 못했습니다. watch / youtu.be / shorts 링크를 넣어 주세요." },
      { status: 400 },
    );
  }

  try {
    const transcript = await fetchYoutubeTranscript(videoId, body.language);
    return Response.json(transcript);
  } catch (error) {
    if (error instanceof TranscriptUnavailableError) {
      // 자막을 못 가져온 것은 사용자가 직접 붙여넣어 우회할 수 있는 상황이다.
      return Response.json({ error: error.message, fallback: "paste" }, { status: 422 });
    }
    console.error("transcript fetch failed", error);
    return Response.json(
      { error: "자막을 가져오는 중 오류가 발생했습니다.", fallback: "paste" },
      { status: 502 },
    );
  }
}
