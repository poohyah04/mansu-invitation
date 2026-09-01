import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { clipPath, getJob } from "@/lib/jobs";

export const runtime = "nodejs";

/** 만들어진 클립을 그대로 내보낸다. 미리보기와 내려받기가 같은 주소를 쓴다. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; rank: string }> },
) {
  const { id, rank } = await ctx.params;
  const job = getJob(id);
  if (!job) return new Response("작업을 찾을 수 없습니다.", { status: 404 });

  const parsedRank = Number.parseInt(rank, 10);
  if (!Number.isInteger(parsedRank)) {
    return new Response("잘못된 클립 번호입니다.", { status: 400 });
  }

  const file = clipPath(job, parsedRank);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("아직 만들어지지 않았습니다.", { status: 404 });
  }

  const download = new URL(request.url).searchParams.has("download");
  const name = `${job.originalName.replace(/\.[^.]+$/, "")}-clip-${parsedRank}.mp4`;

  return new Response(
    Readable.toWeb(createReadStream(file)) as ReadableStream,
    {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(size),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    },
  );
}
