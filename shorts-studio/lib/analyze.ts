import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { AnalyzeOptions, ClipPlan, Transcript } from "./types";
import { serializeCues } from "./transcript";
import { formatClock } from "./time";

const ClipSchema = z.object({
  start_sec: z
    .number()
    .describe("클립 시작 시각(초). 스크립트에 실제로 존재하는 타임스탬프를 기준으로 한다."),
  end_sec: z.number().describe("클립 끝 시각(초). start_sec 보다 반드시 커야 한다."),
  title: z.string().describe("영상 상단에 얹을 8~20자 훅 문구. 낚시성 과장은 금지."),
  hook_line: z
    .string()
    .describe("첫 3초에 나오는 실제 대사 한 문장. 스크립트에서 그대로 가져온다."),
  summary: z.string().describe("이 구간을 고른 이유를 2문장 이내로."),
  virality_score: z
    .number()
    .describe("0~100 점. 훅의 세기, 하나의 완결된 메시지인지, 감정의 진폭을 기준으로."),
  score_reason: z.string().describe("점수 근거 한 문장."),
  keywords: z.array(z.string()).describe("검색/해시태그용 핵심어 3~6개."),
  caption: z.string().describe("업로드용 설명문. 마지막 줄에 해시태그를 붙인다."),
});

const PlanSchema = z.object({
  overview: z.string().describe("영상 전체가 무엇에 관한 것인지 3문장 이내 요약."),
  clips: z.array(ClipSchema),
});

const SYSTEM = `당신은 롱폼 영상을 숏폼으로 재가공하는 편집 기획자다.

주어진 것은 타임스탬프가 붙은 자막이다. 각 줄은 "[초] 내용" 형식이며, 대괄호 안 숫자가 그 문장이 시작하는 시각(초)이다.

원칙:
- 구간은 반드시 자막에 실재하는 시각을 근거로 잡는다. 시각을 지어내지 않는다.
- 한 클립은 그 자체로 완결되어야 한다. 앞뒤 맥락을 몰라도 이해되는 구간만 고른다.
- 말이 중간에 끊기는 지점에서 자르지 않는다. 문장이 시작하는 곳에서 시작하고, 끝나는 곳에서 끝낸다.
- 첫 3초 안에 사람을 붙잡을 문장이 있는 구간을 우선한다.
- 점수는 후하게 주지 않는다. 평범한 구간은 40~60점대이며, 80점 이상은 정말 강한 구간에만 준다.
- 훅 문구와 설명문은 자막에 실제로 나온 내용만 사용한다. 없는 사실을 만들어내지 않는다.
- 출력 언어는 자막의 언어를 따른다.`;

export type AnalyzeResult = {
  plan: ClipPlan;
  usage: { input_tokens: number; output_tokens: number };
};

/** 상한/하한 길이와 영상 길이를 벗어난 구간을 정리하고, 점수 순으로 순위를 매긴다. */
function normalize(plan: ClipPlan, transcript: Transcript, opts: AnalyzeOptions): ClipPlan {
  const limit = transcript.duration || Number.POSITIVE_INFINITY;

  const clips = plan.clips
    .map((clip) => {
      const start = Math.max(0, Math.min(clip.start_sec, limit));
      let end = Math.min(Math.max(clip.end_sec, start + 1), limit);
      if (end - start > opts.maxSeconds) end = start + opts.maxSeconds;
      return { ...clip, start_sec: start, end_sec: end };
    })
    .filter((clip) => clip.end_sec - clip.start_sec >= Math.min(opts.minSeconds, 5))
    .sort((a, b) => b.virality_score - a.virality_score)
    .map((clip, i) => ({ ...clip, rank: i + 1 }));

  return { ...plan, clips };
}

export async function analyzeTranscript(
  transcript: Transcript,
  opts: AnalyzeOptions,
): Promise<AnalyzeResult> {
  const client = new Anthropic({ timeout: 10 * 60 * 1000 });
  const script = serializeCues(transcript.cues);

  const brief = [
    transcript.title ? `영상 제목: ${transcript.title}` : null,
    `영상 길이: ${formatClock(transcript.duration)} (${Math.round(transcript.duration)}초)`,
    opts.context.trim() ? `기획 의도: ${opts.context.trim()}` : null,
    `요청: 서로 겹치지 않는 클립 ${opts.clipCount}개. 각 클립 길이는 ${opts.minSeconds}~${opts.maxSeconds}초.`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.beta.messages.parse({
    model: process.env.SHORTS_MODEL ?? "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${brief}\n\n--- 자막 시작 ---\n${script}\n--- 자막 끝 ---`,
      },
    ],
    output_config: { format: betaZodOutputFormat(PlanSchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error(
      `모델이 요청을 거부했습니다: ${message.stop_details?.explanation ?? "사유 없음"}`,
    );
  }
  if (!message.parsed_output) {
    throw new Error("분석 결과를 해석하지 못했습니다. 다시 시도해 주세요.");
  }

  const plan: ClipPlan = {
    overview: message.parsed_output.overview,
    clips: message.parsed_output.clips.map((c, i) => ({ ...c, rank: i + 1 })),
  };

  return {
    plan: normalize(plan, transcript, opts),
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  };
}
