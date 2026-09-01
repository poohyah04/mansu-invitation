import path from "node:path";
import { failJob, getJob, serializeJob, updateJob, type Job } from "@/lib/jobs";
import { MissingBinaryError, extractAudio } from "@/lib/media";
import { resolveWhisper, transcribe } from "@/lib/whisper";

export const runtime = "nodejs";
export const maxDuration = 3600;

/**
 * 음성 추출과 전사는 한 시간짜리 영상이면 몇 분씩 걸린다.
 * 요청을 붙잡아 두지 않고 백그라운드로 돌린 뒤, 진행률은 작업 상태로 알린다.
 */
async function work(job: Job, language: string | undefined) {
  const setup = await resolveWhisper();

  updateJob(job.id, {
    stage: "transcribing",
    progress: 0,
    message: "음성을 추출하는 중",
    error: null,
  });

  const audioPath = path.join(job.workDir, "audio.wav");
  await extractAudio(job.sourcePath, audioPath, (seconds) => {
    // 음성 추출은 전체의 앞 10% 로 잡는다. 전사보다 훨씬 빠르다.
    updateJob(job.id, { progress: Math.min(0.1, (seconds / job.duration) * 0.1) });
  });

  updateJob(job.id, {
    message: `음성을 받아쓰는 중 (${setup.flavor === "cpp" ? "whisper.cpp" : "whisper"})`,
  });

  const cues = await transcribe(audioPath, setup, {
    workDir: job.workDir,
    language,
    duration: job.duration,
    onProgress: (fraction) => updateJob(job.id, { progress: 0.1 + fraction * 0.9 }),
  });

  updateJob(job.id, {
    stage: "transcribed",
    progress: 1,
    message: `자막 ${cues.length}줄 완성`,
    transcript: {
      source: "whisper",
      language: language ?? null,
      duration: job.duration,
      cues,
      title: job.originalName,
    },
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  if (job.stage === "transcribing") {
    return Response.json(serializeJob(job));
  }

  let language: string | undefined;
  try {
    language = (await request.json())?.language || undefined;
  } catch {
    language = undefined;
  }

  // whisper 설치 여부는 요청을 끝내기 전에 알려 준다. 없으면 시작할 이유가 없다.
  try {
    await resolveWhisper();
  } catch (error) {
    if (error instanceof MissingBinaryError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  updateJob(id, { stage: "transcribing", progress: 0, message: "준비 중", error: null });
  void work(job, language).catch((error) => {
    console.error("transcribe failed", error);
    failJob(id, error);
  });

  return Response.json(serializeJob(getJob(id)!));
}
