/** 자막 한 줄(큐). start/end 는 원본 영상 기준 초 단위. */
export type Cue = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptSource = "youtube" | "srt" | "vtt" | "plain";

export type Transcript = {
  source: TranscriptSource;
  /** 감지된 언어 코드(있을 때). 예: "ko", "en" */
  language: string | null;
  /** 원본 영상 길이(초). 알 수 없으면 마지막 큐의 end 로 대체. */
  duration: number;
  cues: Cue[];
  /** 유튜브에서 가져온 경우에만 채워짐 */
  videoId?: string;
  title?: string;
};

export type Clip = {
  rank: number;
  start_sec: number;
  end_sec: number;
  title: string;
  hook_line: string;
  summary: string;
  virality_score: number;
  score_reason: string;
  keywords: string[];
  caption: string;
};

export type ClipPlan = {
  overview: string;
  clips: Clip[];
};

export type AnalyzeOptions = {
  clipCount: number;
  minSeconds: number;
  maxSeconds: number;
  /** 영상의 성격/타깃. 프롬프트에 그대로 전달된다. */
  context: string;
};
