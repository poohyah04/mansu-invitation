import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { run, which } from "./proc";
import { MissingBinaryError } from "./media";
import { parseSubtitles } from "./transcript";
import { parseTimecode } from "./time";
import type { Cue } from "./types";

/**
 * whisper.cpp 계열(`whisper-cli`)과 OpenAI 파이썬 구현(`whisper`)은
 * 인자 이름이 완전히 다르다. 실행 파일을 찾은 뒤 도움말로 어느 쪽인지 가린다.
 */
export type WhisperFlavor = "cpp" | "openai";

export type WhisperSetup = {
  binary: string;
  flavor: WhisperFlavor;
  /** cpp 계열에서만 필요한 ggml 모델 파일 경로 */
  model: string | null;
};

const CANDIDATES = ["whisper-cli", "whisper-cpp", "whisper"];
const MODELS_DIR = path.join(process.cwd(), "models");

async function detectFlavor(binary: string): Promise<WhisperFlavor> {
  try {
    const { stdout, stderr } = await run(binary, ["--help"]);
    const help = stdout + stderr;
    if (/--output-srt|-osrt/.test(help)) return "cpp";
    if (/--output_format|--output_dir/.test(help)) return "openai";
  } catch {
    // whisper.cpp 는 인자가 없으면 사용법을 찍고 0 이 아닌 코드로 끝난다.
  }
  return "cpp";
}

async function findModel(): Promise<string | null> {
  if (process.env.WHISPER_MODEL) return process.env.WHISPER_MODEL;
  try {
    const entries = await readdir(MODELS_DIR);
    // 여러 개면 가장 큰(= 대체로 가장 정확한) 모델을 고르지 않고 이름순 첫 번째를 쓴다.
    const model = entries.filter((f) => f.endsWith(".bin")).sort()[0];
    return model ? path.join(MODELS_DIR, model) : null;
  } catch {
    return null;
  }
}

export async function resolveWhisper(): Promise<WhisperSetup> {
  const configured = process.env.WHISPER_BIN;
  const found = configured
    ? ((await which(configured)) ?? configured)
    : (await Promise.all(CANDIDATES.map(which))).find(Boolean) ?? null;

  if (!found) {
    throw new MissingBinaryError(
      "whisper 를 찾지 못했습니다. macOS 는 `brew install whisper-cpp`, " +
        "그 밖에는 https://github.com/ggml-org/whisper.cpp 를 빌드해 주세요. " +
        "설치 경로가 특이하면 WHISPER_BIN 환경 변수로 지정할 수 있습니다.",
    );
  }

  const flavor = await detectFlavor(found);
  const model = flavor === "cpp" ? await findModel() : null;

  if (flavor === "cpp" && !model) {
    throw new MissingBinaryError(
      "whisper 모델 파일이 없습니다. ggml 모델(예: ggml-large-v3-turbo.bin)을 " +
        `${MODELS_DIR} 에 두거나 WHISPER_MODEL 환경 변수로 경로를 지정해 주세요. ` +
        "모델은 https://huggingface.co/ggerganov/whisper.cpp 에서 받을 수 있습니다.",
    );
  }

  return { binary: found, flavor, model };
}

/**
 * 전사 중 출력되는 `[00:01:20.000 --> 00:01:23.000]` 줄에서 진행 시각을 읽는다.
 * 구간의 시작이 아니라 끝을 본다. 그 줄이 나왔다는 것은 끝 시각까지 처리했다는 뜻이다.
 */
function progressSeconds(line: string): number | null {
  const m = line.match(/-->\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?[.,]\d{1,3})/);
  return m ? parseTimecode(m[1]) : null;
}

export type TranscribeOptions = {
  /** 결과 파일을 둘 폴더 */
  workDir: string;
  /** "ko", "en" 등. 비우면 whisper 가 자동 감지한다. */
  language?: string;
  /** 전체 길이(초). 진행률 계산에만 쓴다. */
  duration?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/** 16kHz 모노 wav 를 전사해서 큐 배열로 돌려준다. */
export async function transcribe(
  audioPath: string,
  setup: WhisperSetup,
  options: TranscribeOptions,
): Promise<Cue[]> {
  const base = path.join(options.workDir, "transcript");
  const language = options.language?.trim();

  const args =
    setup.flavor === "cpp"
      ? [
          "-m", setup.model!,
          "-f", audioPath,
          "-osrt",
          "-of", base,
          ...(language ? ["-l", language] : ["-l", "auto"]),
        ]
      : [
          audioPath,
          "--output_format", "srt",
          "--output_dir", options.workDir,
          ...(language ? ["--language", language] : []),
        ];

  await run(setup.binary, args, {
    signal: options.signal,
    onLine: (line) => {
      const at = progressSeconds(line);
      if (at !== null && options.duration && options.onProgress) {
        options.onProgress(Math.min(1, at / options.duration));
      }
    },
  });

  // cpp 는 `-of` 로 준 이름에, 파이썬 구현은 입력 파일 이름에 맞춰 저장한다.
  const srtPath =
    setup.flavor === "cpp"
      ? `${base}.srt`
      : path.join(
          options.workDir,
          `${path.basename(audioPath, path.extname(audioPath))}.srt`,
        );

  const cues = parseSubtitles(await readFile(srtPath, "utf8"));
  if (cues.length === 0) {
    throw new Error("전사 결과가 비어 있습니다. 영상에 음성이 있는지 확인해 주세요.");
  }
  return cues;
}
