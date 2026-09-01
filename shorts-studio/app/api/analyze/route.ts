import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeTranscript } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 300;

const RequestSchema = z.object({
  transcript: z.object({
    source: z.enum(["youtube", "srt", "vtt", "plain"]),
    language: z.string().nullable(),
    duration: z.number(),
    cues: z
      .array(z.object({ start: z.number(), end: z.number(), text: z.string() }))
      .min(1, "자막이 비어 있습니다."),
    videoId: z.string().optional(),
    title: z.string().optional(),
  }),
  options: z.object({
    clipCount: z.number().int().min(1).max(20),
    minSeconds: z.number().min(5).max(180),
    maxSeconds: z.number().min(10).max(180),
    context: z.string().max(2000),
  }),
});

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env.local 을 확인해 주세요." },
      { status: 500 },
    );
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join(", ")
        : "요청 형식이 올바르지 않습니다.";
    return Response.json({ error: message }, { status: 400 });
  }

  const { transcript, options } = parsed;
  if (options.minSeconds > options.maxSeconds) {
    return Response.json(
      { error: "최소 길이가 최대 길이보다 깁니다." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeTranscript(
      { ...transcript, duration: transcript.duration || transcript.cues.at(-1)!.end },
      options,
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "API 키가 올바르지 않습니다." }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "요청이 몰렸습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("anthropic error", error.status, error.message);
      return Response.json(
        { error: `분석 요청이 실패했습니다 (${error.status}).` },
        { status: 502 },
      );
    }
    console.error("analyze failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "분석에 실패했습니다." },
      { status: 500 },
    );
  }
}
