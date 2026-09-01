import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { rm } from "node:fs/promises";
import { createJob, failJob, serializeJob, updateJob } from "@/lib/jobs";
import { MissingBinaryError, probeDuration, requireFfmpeg } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 3600;

const ALLOWED = /\.(mp4|mov|m4v|mkv|webm|avi|mp3|m4a|wav|aac|flac)$/i;

/**
 * 원본 영상을 통째로 받는다. multipart 대신 원시 본문으로 받아서
 * 디스크로 흘려보내므로, 몇 기가짜리 설교 영상도 메모리에 올리지 않는다.
 */
export async function POST(request: Request) {
  try {
    await requireFfmpeg();
  } catch (error) {
    if (error instanceof MissingBinaryError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  const name = request.headers.get("x-file-name");
  if (!name) {
    return Response.json({ error: "파일 이름이 없습니다." }, { status: 400 });
  }

  const originalName = decodeURIComponent(name);
  if (!ALLOWED.test(originalName)) {
    return Response.json(
      { error: "지원하지 않는 형식입니다. mp4 · mov · mkv · webm · mp3 · m4a 등을 올려 주세요." },
      { status: 415 },
    );
  }
  if (!request.body) {
    return Response.json({ error: "본문이 비어 있습니다." }, { status: 400 });
  }

  const job = await createJob(originalName);
  try {
    await pipeline(
      Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(job.sourcePath),
    );

    const duration = await probeDuration(job.sourcePath);
    if (duration <= 0) {
      throw new Error(
        "영상 길이를 읽지 못했습니다. 파일이 손상되었거나 지원하지 않는 코덱입니다.",
      );
    }

    updateJob(job.id, { duration, message: "업로드 완료" });
    return Response.json(serializeJob(job));
  } catch (error) {
    await rm(job.workDir, { recursive: true, force: true }).catch(() => {});
    failJob(job.id, error);
    console.error("upload failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
