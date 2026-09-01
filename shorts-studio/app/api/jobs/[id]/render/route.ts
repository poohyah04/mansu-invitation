import { z } from "zod";
import { failJob, getJob, serializeJob, updateJob, type Job } from "@/lib/jobs";
import { MissingBinaryError, renderClip, requireFfmpeg } from "@/lib/media";
import type { Clip } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 3600;

const BodySchema = z.object({
  ranks: z.array(z.number().int()).min(1),
  mode: z.enum(["center", "blur"]),
  burnSubtitles: z.boolean(),
});

async function work(job: Job, clips: Clip[], body: z.infer<typeof BodySchema>) {
  // 인코딩은 CPU 를 다 쓴다. 동시에 여러 개를 돌리면 서로 느려지므로 한 번에 하나씩.
  for (const clip of clips) {
    updateJob(job.id, {
      message: `${clips.length}개 중 ${clip.rank}번 클립을 만드는 중`,
      renders: { ...job.renders, [clip.rank]: { status: "running", progress: 0 } },
    });

    try {
      await renderClip(
        job.sourcePath,
        clip,
        {
          mode: body.mode,
          burnSubtitles: body.burnSubtitles,
          cues: job.transcript?.cues ?? [],
          workDir: job.workDir,
        },
        (fraction) => {
          updateJob(job.id, {
            renders: { ...job.renders, [clip.rank]: { status: "running", progress: fraction } },
          });
        },
      );
      updateJob(job.id, {
        renders: { ...job.renders, [clip.rank]: { status: "done", progress: 1 } },
      });
    } catch (error) {
      // 한 클립이 실패해도 나머지는 계속 만든다.
      console.error(`render clip ${clip.rank} failed`, error);
      updateJob(job.id, {
        renders: {
          ...job.renders,
          [clip.rank]: {
            status: "error",
            progress: 0,
            error: error instanceof Error ? error.message : "인코딩 실패",
          },
        },
      });
    }
  }

  const failed = clips.filter((c) => job.renders[c.rank]?.status === "error").length;
  updateJob(job.id, {
    stage: "analyzed",
    progress: 1,
    message: failed > 0 ? `${failed}개 실패, 나머지는 완료` : "영상 만들기 완료",
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  if (!job.plan) {
    return Response.json({ error: "먼저 구간 분석을 끝내야 합니다." }, { status: 409 });
  }
  if (job.stage === "rendering") return Response.json(serializeJob(job));

  try {
    await requireFfmpeg();
  } catch (error) {
    if (error instanceof MissingBinaryError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const wanted = new Set(body.ranks);
  const clips = job.plan.clips.filter((c) => wanted.has(c.rank));
  if (clips.length === 0) {
    return Response.json({ error: "선택한 클립이 없습니다." }, { status: 400 });
  }

  const renders = { ...job.renders };
  for (const clip of clips) renders[clip.rank] = { status: "pending", progress: 0 };

  updateJob(id, { stage: "rendering", progress: 0, message: "인코딩 준비 중", error: null, renders });
  void work(job, clips, body).catch((error) => {
    console.error("render failed", error);
    failJob(id, error);
  });

  return Response.json(serializeJob(getJob(id)!));
}
