import "server-only";
import { mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { ClipPlan, Transcript } from "./types";

export type JobStage =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "analyzing"
  | "analyzed"
  | "rendering"
  | "error";

export type RenderState = {
  status: "pending" | "running" | "done" | "error";
  progress: number;
  error?: string;
};

export type Job = {
  id: string;
  createdAt: number;
  workDir: string;
  sourcePath: string;
  originalName: string;
  duration: number;
  stage: JobStage;
  /** 현재 단계의 진행률 0~1 */
  progress: number;
  message: string;
  error: string | null;
  transcript: Transcript | null;
  plan: ClipPlan | null;
  renders: Record<number, RenderState>;
};

/**
 * 작업은 메모리에만 둔다. 이 도구는 자기 컴퓨터에서 하나씩 돌리는 용도이고,
 * 결과물(영상·자막)은 작업 폴더에 파일로 남으므로 서버가 재시작해도 잃는 것은
 * 진행 상태뿐이다. 개발 서버의 코드 갱신에도 살아남도록 전역에 붙인다.
 */
const registry: Map<string, Job> = ((
  globalThis as { __shortsJobs?: Map<string, Job> }
).__shortsJobs ??= new Map());

export const WORK_ROOT = path.join(process.cwd(), ".shorts-work");

/** 12시간이 지난 작업 폴더는 지운다. 원본 영상이 쌓이면 디스크를 금방 채운다. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export async function createJob(originalName: string): Promise<Job> {
  await sweep();

  const id = randomUUID();
  const workDir = path.join(WORK_ROOT, id);
  await mkdir(workDir, { recursive: true });

  const job: Job = {
    id,
    createdAt: Date.now(),
    workDir,
    sourcePath: path.join(workDir, `source${path.extname(originalName) || ".mp4"}`),
    originalName,
    duration: 0,
    stage: "uploaded",
    progress: 0,
    message: "업로드됨",
    error: null,
    transcript: null,
    plan: null,
    renders: {},
  };

  registry.set(id, job);
  return job;
}

export function getJob(id: string): Job | null {
  return registry.get(id) ?? null;
}

export function updateJob(id: string, patch: Partial<Job>): Job | null {
  const job = registry.get(id);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}

export function failJob(id: string, error: unknown): void {
  updateJob(id, {
    stage: "error",
    progress: 0,
    error: error instanceof Error ? error.message : String(error),
    message: "실패",
  });
}

export function clipPath(job: Job, rank: number): string {
  return path.join(job.workDir, `clip-${String(rank).padStart(2, "0")}.mp4`);
}

async function sweep(): Promise<void> {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [id, job] of registry) {
    if (job.createdAt >= cutoff) continue;
    registry.delete(id);
    await rm(job.workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** 폴링 응답용. 자막 큐 수천 개를 매번 실어 보내지 않는다. */
export function serializeJob(job: Job) {
  return {
    id: job.id,
    originalName: job.originalName,
    duration: job.duration,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    error: job.error,
    transcript: job.transcript
      ? {
          language: job.transcript.language,
          cueCount: job.transcript.cues.length,
          source: job.transcript.source,
        }
      : null,
    plan: job.plan,
    renders: job.renders,
  };
}

export type JobStatus = ReturnType<typeof serializeJob>;
