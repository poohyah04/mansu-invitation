"use client";

import { useMemo, useState } from "react";
import ClipCard from "@/components/ClipCard";
import type { AnalyzeOptions, ClipPlan, Transcript } from "@/lib/types";
import { parsePastedTranscript } from "@/lib/transcript";
import { formatClock } from "@/lib/time";
import type { CropMode } from "@/lib/ffmpeg";

type Mode = "youtube" | "paste";

const DEFAULT_OPTIONS: AnalyzeOptions = {
  clipCount: 6,
  minSeconds: 25,
  maxSeconds: 60,
  context: "",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("youtube");
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [options, setOptions] = useState<AnalyzeOptions>(DEFAULT_OPTIONS);
  const [cropMode, setCropMode] = useState<CropMode>("center");
  const [inputName, setInputName] = useState("input.mp4");

  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [plan, setPlan] = useState<ClipPlan | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const planMarkdown = useMemo(() => {
    if (!plan) return "";
    const lines = [`# 숏폼 기획안`, "", plan.overview, ""];
    for (const clip of plan.clips) {
      lines.push(
        `## ${clip.rank}. ${clip.title} (${clip.virality_score}점)`,
        `- 구간: ${formatClock(clip.start_sec)} – ${formatClock(clip.end_sec)}`,
        `- 훅: “${clip.hook_line}”`,
        `- 이유: ${clip.summary}`,
        `- 키워드: ${clip.keywords.join(", ")}`,
        "",
        clip.caption,
        "",
      );
    }
    return lines.join("\n");
  }, [plan]);

  async function resolveTranscript(): Promise<Transcript> {
    if (mode === "paste") {
      const parsed = parsePastedTranscript(pasted);
      if (parsed.cues.length === 0) {
        throw new Error(
          "자막을 읽지 못했습니다. SRT/VTT 파일 내용이나 “[01:23] 내용” 형식으로 넣어 주세요.",
        );
      }
      return parsed;
    }

    setStatus("유튜브에서 자막을 가져오는 중…");
    const res = await fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.fallback === "paste") setMode("paste");
      throw new Error(data.error ?? "자막을 가져오지 못했습니다.");
    }
    return data as Transcript;
  }

  async function run() {
    setBusy(true);
    setError(null);
    setPlan(null);
    try {
      const resolved = await resolveTranscript();
      setTranscript(resolved);

      setStatus(
        `자막 ${resolved.cues.length}줄 · ${formatClock(resolved.duration)} 분량을 분석하는 중… (1~2분 걸립니다)`,
      );
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: resolved, options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석에 실패했습니다.");

      setPlan(data.plan as ClipPlan);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const canRun = !busy && (mode === "youtube" ? url.trim().length > 0 : pasted.trim().length > 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Shorts Studio</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          긴 영상의 자막을 읽고 숏폼으로 쓸 만한 구간을 골라, 훅 문구·설명문·자막·
          <span className="font-mono text-xs">ffmpeg</span> 명령까지 한 번에 만들어 줍니다.
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
          {(["youtube", "paste"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-2 transition-colors ${
                mode === m ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {m === "youtube" ? "유튜브 링크" : "자막 붙여넣기"}
            </button>
          ))}
        </div>

        {mode === "youtube" ? (
          <>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-muted">
              자막이 켜져 있는 영상만 됩니다. 유튜브가 요청을 막으면 자막 탭으로 넘어가니
              직접 붙여넣어 주세요.
            </p>
          </>
        ) : (
          <>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder={"1\n00:00:03,000 --> 00:00:07,200\n오늘 이야기할 주제는…\n\n또는\n\n[00:03] 오늘 이야기할 주제는…"}
              className="mt-4 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-muted">
              SRT · WebVTT · “[분:초] 내용” 형식을 모두 읽습니다.
            </p>
          </>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="text-xs text-muted">
            클립 개수
            <input
              type="number"
              min={1}
              max={20}
              value={options.clipCount}
              onChange={(e) =>
                setOptions((o) => ({ ...o, clipCount: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            최소 길이(초)
            <input
              type="number"
              min={5}
              max={180}
              value={options.minSeconds}
              onChange={(e) =>
                setOptions((o) => ({ ...o, minSeconds: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            최대 길이(초)
            <input
              type="number"
              min={10}
              max={180}
              value={options.maxSeconds}
              onChange={(e) =>
                setOptions((o) => ({ ...o, maxSeconds: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="mt-4 block text-xs text-muted">
          기획 의도 (선택)
          <input
            type="text"
            value={options.context}
            onChange={(e) => setOptions((o) => ({ ...o, context: e.target.value }))}
            placeholder="예: 20~30대 대상, 설교 중 적용 부분 위주로"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>

        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "분석 중…" : "핵심 구간 찾기"}
        </button>

        {status && <p className="mt-3 text-center text-xs text-muted">{status}</p>}
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {plan && transcript && (
        <section className="mt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                클립 {plan.clips.length}개
                {transcript.title && (
                  <span className="ml-2 text-sm font-normal text-muted">
                    · {transcript.title}
                  </span>
                )}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{plan.overview}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(planMarkdown)}
              className="shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground"
            >
              전체 복사
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
            <span>세로 변환</span>
            {(["center", "blur"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCropMode(m)}
                className={`rounded-md px-2 py-1 ${
                  cropMode === m ? "bg-background text-foreground" : "hover:text-foreground"
                }`}
              >
                {m === "center" ? "가운데 잘라내기" : "흐린 배경"}
              </button>
            ))}
            <span className="ml-auto">원본 파일명</span>
            <input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="w-40 rounded-md border border-border bg-background px-2 py-1 font-mono text-foreground outline-none focus:border-accent"
            />
          </div>

          <div className="mt-4 space-y-4">
            {plan.clips.map((clip) => (
              <ClipCard
                key={clip.rank}
                clip={clip}
                cues={transcript.cues}
                videoId={transcript.videoId}
                cropMode={cropMode}
                inputName={inputName}
              />
            ))}
          </div>

          <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
            자막 <span className="font-mono">.srt</span> 를 내려받아 명령과 같은 폴더에 두고
            <span className="font-mono"> ffmpeg</span> 명령을 실행하면 9:16 세로 영상이 나옵니다.
            원본 영상 파일은 직접 준비해 주세요.
          </p>
        </section>
      )}
    </main>
  );
}
