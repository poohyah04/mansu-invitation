import { z } from "zod";
import { analyzeTranscript } from "@/lib/analyze";
import { failJob, getJob, serializeJob, updateJob, type Job } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 900;

const OptionsSchema = z.object({
  clipCount: z.number().int().min(1).max(20),
  minSeconds: z.number().min(5).max(180),
  maxSeconds: z.number().min(10).max(180),
  context: z.string().max(2000),
});

async function work(job: Job, options: z.infer<typeof OptionsSchema>) {
  const { plan } = await analyzeTranscript(job.transcript!, options);
  updateJob(job.id, {
    stage: "analyzed",
    progress: 1,
    message: `구간 ${plan.clips.length}개를 찾았습니다`,
    plan,
    renders: {},
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  if (!job.transcript) {
    return Response.json({ error: "먼저 전사를 끝내야 합니다." }, { status: 409 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY 가 없습니다. .env.local 을 확인해 주세요." },
      { status: 500 },
    );
  }

  let options: z.infer<typeof OptionsSchema>;
  try {
    options = OptionsSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "설정값이 올바르지 않습니다." }, { status: 400 });
  }
  if (options.minSeconds > options.maxSeconds) {
    return Response.json({ error: "최소 길이가 최대 길이보다 깁니다." }, { status: 400 });
  }

  updateJob(id, {
    stage: "analyzing",
    progress: 0,
    message: "핵심 구간을 고르는 중",
    error: null,
    plan: null,
  });
  void work(job, options).catch((error) => {
    console.error("analyze failed", error);
    failJob(id, error);
  });

  return Response.json(serializeJob(getJob(id)!));
}
