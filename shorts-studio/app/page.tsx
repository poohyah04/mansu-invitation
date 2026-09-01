"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClipCard from "@/components/ClipCard";
import type { AnalyzeOptions, Clip, ClipPlan, Transcript } from "@/lib/types";
import { parsePastedTranscript } from "@/lib/transcript";
import { formatClock } from "@/lib/time";
import type { CropMode } from "@/lib/ffmpeg";
import { fetchJob, isSettled, postJson, uploadVideo, type JobStatus } from "@/lib/client";

type Mode = "upload" | "youtube" | "paste";

const DEFAULT_OPTIONS: AnalyzeOptions = {
  clipCount: 6,
  minSeconds: 25,
  maxSeconds: 60,
  context: "",
};

const TABS: { key: Mode; label: string }[] = [
  { key: "upload", label: "영상 파일" },
  { key: "youtube", label: "유튜브 링크" },
  { key: "paste", label: "자막 붙여넣기" },
];

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export default function Home() {
  const [mode, setMode] = useState<Mode>("upload");
  const [options, setOptions] = useState<AnalyzeOptions>(DEFAULT_OPTIONS);
  const [language, setLanguage] = useState("ko");
  const [cropMode, setCropMode] = useState<CropMode>("center");
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 영상 파일 경로
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const analyzeStarted = useRef<string | null>(null);

  // 유튜브 · 자막 경로
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [plan, setPlan] = useState<ClipPlan | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inputName, setInputName] = useState("input.mp4");

  // --- 작업 폴링: 스스로 진행 중인 동안만 상태를 다시 읽는다 ---
  useEffect(() => {
    if (!job || isSettled(job)) return;
    const timer = setInterval(async () => {
      try {
        setJob(await fetchJob(job.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "상태를 읽지 못했습니다.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [job]);

  // 전사가 끝나면 곧바로 구간 분석으로 넘어간다. 작업당 한 번만 시작한다.
  useEffect(() => {
    if (job?.stage !== "transcribed" || analyzeStarted.current === job.id) return;
    analyzeStarted.current = job.id;
    postJson<JobStatus>(`/api/jobs/${job.id}/analyze`, options)
      .then(setJob)
      .catch((e) => setError(e instanceof Error ? e.message : "분석을 시작하지 못했습니다."));
  }, [job, options]);

  useEffect(() => {
    if (job?.plan) setSelected(new Set(job.plan.clips.map((c) => c.rank)));
  }, [job?.plan]);

  const startUpload = useCallback(async () => {
    if (!file) return;
    setError(null);
    setJob(null);
    setPlan(null);
    analyzeStarted.current = null;
    setUploadProgress(0);

    try {
      const created = await uploadVideo(file, setUploadProgress);
      setUploadProgress(null);
      setJob(await postJson<JobStatus>(`/api/jobs/${created.id}/transcribe`, { language }));
    } catch (e) {
      setUploadProgress(null);
      setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    }
  }, [file, language]);

  const startRender = useCallback(async () => {
    if (!job || selected.size === 0) return;
    setError(null);
    try {
      setJob(
        await postJson<JobStatus>(`/api/jobs/${job.id}/render`, {
          ranks: [...selected],
          mode: cropMode,
          burnSubtitles,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상 만들기를 시작하지 못했습니다.");
    }
  }, [job, selected, cropMode, burnSubtitles]);

  // --- 유튜브 · 붙여넣기 경로 ---
  async function runTranscriptOnly() {
    setBusy(true);
    setError(null);
    setPlan(null);
    setJob(null);
    try {
      let resolved: Transcript;
      if (mode === "paste") {
        resolved = parsePastedTranscript(pasted);
        if (resolved.cues.length === 0) {
          throw new Error(
            "자막을 읽지 못했습니다. SRT/VTT 내용이나 “[01:23] 내용” 형식으로 넣어 주세요.",
          );
        }
      } else {
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
        resolved = data as Transcript;
      }

      setTranscript(resolved);
      setStatus(
        `자막 ${resolved.cues.length}줄 · ${formatClock(resolved.duration)} 분량을 분석하는 중…`,
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

  const working = uploadProgress !== null || (job !== null && !isSettled(job)) || busy;

  const clips: Clip[] = useMemo(
    () => (mode === "upload" ? (job?.plan?.clips ?? []) : (plan?.clips ?? [])),
    [mode, job, plan],
  );
  const overview = mode === "upload" ? job?.plan?.overview : plan?.overview;

  const planMarkdown = useMemo(() => {
    if (clips.length === 0) return "";
    const lines = ["# 숏폼 기획안", "", overview ?? "", ""];
    for (const clip of clips) {
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
  }, [clips, overview]);

  const toggle = (rank: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Shorts Studio</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          영상을 올리면 음성을 받아쓰고, 숏폼으로 쓸 만한 구간을 골라 9:16 세로 영상까지
          만들어 줍니다.
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              className={`flex-1 rounded-md px-3 py-2 transition-colors ${
                mode === tab.key ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "upload" && (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-accent">
              <input
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="text-sm text-foreground">
                {file ? file.name : "영상 파일 선택"}
              </span>
              <span className="mt-1 text-xs text-muted">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(0)} MB`
                  : "mp4 · mov · mkv · webm · mp3 · m4a"}
              </span>
            </label>

            <label className="mt-4 block text-xs text-muted">
              말하는 언어
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`mt-1 ${field}`}
              >
                <option value="ko">한국어</option>
                <option value="en">영어</option>
                <option value="ja">일본어</option>
                <option value="">자동 감지</option>
              </select>
            </label>
          </div>
        )}

        {mode === "youtube" && (
          <>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`mt-4 ${field} py-2.5`}
            />
            <p className="mt-2 text-xs text-muted">
              자막이 켜져 있는 영상만 됩니다. 유튜브가 요청을 막으면 자막 탭에 직접
              붙여넣어 주세요. 이 경로는 영상 파일이 없으므로 기획안까지만 만듭니다.
            </p>
          </>
        )}

        {mode === "paste" && (
          <>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={9}
              placeholder={"1\n00:00:03,000 --> 00:00:07,200\n오늘 이야기할 주제는…\n\n또는\n\n[00:03] 오늘 이야기할 주제는…"}
              className={`mt-4 resize-y font-mono text-xs leading-relaxed ${field}`}
            />
            <p className="mt-2 text-xs text-muted">
              SRT · WebVTT · “[분:초] 내용” 형식을 모두 읽습니다.
            </p>
          </>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["clipCount", "클립 개수", 1, 20],
              ["minSeconds", "최소 길이(초)", 5, 180],
              ["maxSeconds", "최대 길이(초)", 10, 180],
            ] as const
          ).map(([key, label, min, max]) => (
            <label key={key} className="text-xs text-muted">
              {label}
              <input
                type="number"
                min={min}
                max={max}
                value={options[key]}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, [key]: Number(e.target.value) }))
                }
                className={`mt-1 ${field}`}
              />
            </label>
          ))}
        </div>

        <label className="mt-4 block text-xs text-muted">
          기획 의도 (선택)
          <input
            type="text"
            value={options.context}
            onChange={(e) => setOptions((o) => ({ ...o, context: e.target.value }))}
            placeholder="예: 20~30대 대상, 설교 중 적용 부분 위주로"
            className={`mt-1 ${field}`}
          />
        </label>

        <button
          type="button"
          onClick={mode === "upload" ? startUpload : runTranscriptOnly}
          disabled={
            working ||
            (mode === "upload"
              ? !file
              : mode === "youtube"
                ? url.trim().length === 0
                : pasted.trim().length === 0)
          }
          className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {working ? "진행 중…" : mode === "upload" ? "받아쓰고 구간 찾기" : "핵심 구간 찾기"}
        </button>

        {uploadProgress !== null && (
          <Progress
            label={`올리는 중 ${Math.round(uploadProgress * 100)}%`}
            value={uploadProgress}
          />
        )}
        {job && !isSettled(job) && (
          <Progress label={job.message} value={job.progress} />
        )}
        {status && <p className="mt-3 text-center text-xs text-muted">{status}</p>}
        {(error || job?.error) && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error ?? job?.error}
          </p>
        )}
      </section>

      {clips.length > 0 && (
        <section className="mt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">클립 {clips.length}개</h2>
              {overview && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{overview}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(planMarkdown)}
              className="shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground"
            >
              전체 복사
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
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

              {mode === "upload" ? (
                <label className="ml-auto flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={burnSubtitles}
                    onChange={(e) => setBurnSubtitles(e.target.checked)}
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  자막 굽기
                </label>
              ) : (
                <>
                  <span className="ml-auto">원본 파일명</span>
                  <input
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    className="w-40 rounded-md border border-border bg-background px-2 py-1 font-mono text-foreground outline-none focus:border-accent"
                  />
                </>
              )}
            </div>

            {mode === "upload" && job && (
              <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={startRender}
                  disabled={selected.size === 0 || job.stage === "rendering"}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {job.stage === "rendering"
                    ? "만드는 중…"
                    : `선택한 ${selected.size}개 영상 만들기`}
                </button>
                <a
                  href={`/api/jobs/${job.id}/subtitles`}
                  className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
                >
                  전체 자막 .srt
                </a>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {clips.map((clip) => (
              <ClipCard
                key={clip.rank}
                clip={clip}
                cues={transcript?.cues ?? []}
                jobId={mode === "upload" ? job?.id : undefined}
                render={job?.renders[clip.rank]}
                selected={mode === "upload" ? selected.has(clip.rank) : undefined}
                onToggle={mode === "upload" ? toggle : undefined}
                videoId={transcript?.videoId}
                cropMode={cropMode}
                inputName={inputName}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-3">
      <div className="h-1 overflow-hidden rounded-full bg-background">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${Math.max(2, Math.round(value * 100))}%` }}
        />
      </div>
      <p className="mt-1.5 text-center text-xs text-muted">{label}</p>
    </div>
  );
}
