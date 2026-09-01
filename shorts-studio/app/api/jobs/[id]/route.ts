import { getJob, serializeJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  return Response.json(serializeJob(job));
}
