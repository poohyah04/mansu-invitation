import "server-only";
import { spawn } from "node:child_process";

export class ProcessError extends Error {
  constructor(
    readonly command: string,
    readonly code: number | null,
    readonly stderr: string,
  ) {
    // stderr 는 길어서 그대로 붙이면 화면을 덮는다. 끝부분만 남긴다.
    const tail = stderr.trim().split("\n").slice(-4).join("\n");
    super(`${command} 실행이 실패했습니다 (종료 코드 ${code}).\n${tail}`);
    this.name = "ProcessError";
  }
}

export type RunOptions = {
  /** stdout/stderr 를 줄 단위로 받아 진행률을 갱신할 때 쓴다. */
  onLine?: (line: string, stream: "stdout" | "stderr") => void;
  signal?: AbortSignal;
};

/** 자식 프로세스를 끝까지 실행하고 stdout 을 돌려준다. */
export function run(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { signal: options.signal });

    let stdout = "";
    let stderr = "";
    const partial = { stdout: "", stderr: "" };

    const consume = (stream: "stdout" | "stderr") => (chunk: Buffer) => {
      const text = chunk.toString();
      if (stream === "stdout") stdout += text;
      else stderr += text;

      if (!options.onLine) return;
      // whisper 와 ffmpeg 는 캐리지 리턴으로 같은 줄을 덮어쓴다. 둘 다 줄 끝으로 본다.
      partial[stream] += text;
      const lines = partial[stream].split(/\r\n|\r|\n/);
      partial[stream] = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) options.onLine(line, stream);
    };

    child.stdout.on("data", consume("stdout"));
    child.stderr.on("data", consume("stderr"));

    child.on("error", (error) =>
      reject(
        error.name === "AbortError"
          ? error
          : new ProcessError(command, null, `${error.message}`),
      ),
    );
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new ProcessError(command, code, stderr));
    });
  });
}

/** PATH 에 실행 파일이 있는지 확인한다. */
export async function which(binary: string): Promise<string | null> {
  try {
    const { stdout } = await run(process.platform === "win32" ? "where" : "which", [
      binary,
    ]);
    const first = stdout.trim().split("\n")[0];
    return first || null;
  } catch {
    return null;
  }
}
