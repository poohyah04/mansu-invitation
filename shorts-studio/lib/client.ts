import type { ClipPlan } from "./types";

export type RenderState = {
  status: "pending" | "running" | "done" | "error";
  progress: number;
  error?: string;
};

export type JobStatus = {
  id: string;
  originalName: string;
  duration: number;
  stage:
    | "uploaded"
    | "transcribing"
    | "transcribed"
    | "analyzing"
    | "analyzed"
    | "rendering"
    | "error";
  progress: number;
  message: string;
  error: string | null;
  transcript: { language: string | null; cueCount: number; source: string } | null;
  plan: ClipPlan | null;
  renders: Record<number, RenderState>;
};

/**
 * 원본 영상을 올린다. fetch 는 업로드 진행률을 알려 주지 않으므로,
 * 기가바이트 단위 파일에서 화면이 멈춘 것처럼 보이지 않도록 XHR 을 쓴다.
 */
export function uploadVideo(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/jobs");
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });

    xhr.addEventListener("load", () => {
      let payload: unknown;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("서버 응답을 읽지 못했습니다."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload as JobStatus);
      else reject(new Error((payload as { error?: string }).error ?? "업로드에 실패했습니다."));
    });

    xhr.addEventListener("error", () => reject(new Error("업로드 중 연결이 끊겼습니다.")));
    xhr.addEventListener("abort", () => reject(new Error("업로드를 취소했습니다.")));

    xhr.send(file);
  });
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data as T;
}

export async function fetchJob(id: string): Promise<JobStatus> {
  const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "상태를 읽지 못했습니다.");
  return data as JobStatus;
}

/** 작업이 더 이상 스스로 진행되지 않는 상태인지. */
export function isSettled(job: JobStatus): boolean {
  if (job.stage === "error") return true;
  const busy = ["transcribing", "analyzing", "rendering"];
  return !busy.includes(job.stage);
}
