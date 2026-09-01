import { getJob } from "@/lib/jobs";
import { buildClipSrt } from "@/lib/ffmpeg";
import { formatSrtTime } from "@/lib/time";

export const runtime = "nodejs";

/** `?rank=N` 이면 그 클립만, 없으면 영상 전체 자막을 SRT 로 내보낸다. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job?.transcript) return new Response("자막이 없습니다.", { status: 404 });

  const rankParam = new URL(request.url).searchParams.get("rank");
  let srt: string;
  let name: string;

  if (rankParam) {
    const clip = job.plan?.clips.find((c) => c.rank === Number(rankParam));
    if (!clip) return new Response("클립을 찾을 수 없습니다.", { status: 404 });
    srt = buildClipSrt(clip, job.transcript.cues);
    name = `clip-${String(clip.rank).padStart(2, "0")}.srt`;
  } else {
    srt = job.transcript.cues
      .map((cue, i) =>
        [i + 1, `${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}`, cue.text, ""].join("\n"),
      )
      .join("\n");
    name = `${job.originalName.replace(/\.[^.]+$/, "")}.srt`;
  }

  return new Response(srt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
