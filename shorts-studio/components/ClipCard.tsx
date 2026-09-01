"use client";

import { useState } from "react";
import type { Clip, Cue } from "@/lib/types";
import { formatClock } from "@/lib/time";
import { buildClipSrt, buildFfmpegCommand, type CropMode } from "@/lib/ffmpeg";
import { youtubeTimestampUrl } from "@/lib/youtube";

function scoreColor(score: number): string {
  if (score >= 80) return "#3ddc84";
  if (score >= 60) return "#ffc24b";
  return "#8b95a3";
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
    >
      {copied ? "복사됨" : label}
    </button>
  );
}

export default function ClipCard({
  clip,
  cues,
  videoId,
  cropMode,
  inputName,
}: {
  clip: Clip;
  cues: Cue[];
  videoId?: string;
  cropMode: CropMode;
  inputName: string;
}) {
  const [showCommand, setShowCommand] = useState(false);

  const duration = Math.round(clip.end_sec - clip.start_sec);
  const command = buildFfmpegCommand(clip, {
    input: inputName,
    mode: cropMode,
    burnSubtitles: true,
  });
  const srt = buildClipSrt(clip, cues);

  const downloadSrt = () => {
    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clip-${String(clip.rank).padStart(2, "0")}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="rounded bg-background px-1.5 py-0.5 font-mono">
              #{clip.rank}
            </span>
            <span className="font-mono">
              {formatClock(clip.start_sec)} – {formatClock(clip.end_sec)}
            </span>
            <span>· {duration}초</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-snug">{clip.title}</h3>
        </div>

        <div className="shrink-0 text-right">
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: scoreColor(clip.virality_score) }}
          >
            {clip.virality_score}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted">score</div>
        </div>
      </header>

      <p className="mt-3 border-l-2 border-accent pl-3 text-sm italic text-foreground/90">
        “{clip.hook_line}”
      </p>

      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{clip.summary}</p>
      <p className="mt-2 text-xs text-muted">{clip.score_reason}</p>

      {clip.keywords.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {clip.keywords.map((kw) => (
            <li
              key={kw}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
            >
              {kw}
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">
          업로드용 설명문
        </summary>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-3 text-sm text-foreground/85">
          {clip.caption}
        </p>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {videoId && (
          <a
            href={youtubeTimestampUrl(videoId, clip.start_sec)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            원본에서 보기 ↗
          </a>
        )}
        <CopyButton label="설명문 복사" value={clip.caption} />
        <CopyButton label="ffmpeg 명령 복사" value={command} />
        <button
          type="button"
          onClick={downloadSrt}
          disabled={srt.length === 0}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-40"
        >
          자막 .srt 내려받기
        </button>
        <button
          type="button"
          onClick={() => setShowCommand((v) => !v)}
          className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
        >
          {showCommand ? "명령 숨기기" : "명령 보기"}
        </button>
      </div>

      {showCommand && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-3 text-[11px] leading-relaxed text-foreground/70">
          {command}
        </pre>
      )}
    </article>
  );
}
