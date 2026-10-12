"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { type Verse, refLabel } from "@/lib/bible";

type WakeLock = { release(): Promise<void> };

/** 한 화면에 한 절씩 크게 보여주는 화면 (소그룹·교회 TV용) */
export default function Presenter({ verses, start = 0, onClose }: { verses: Verse[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const root = useRef<HTMLDivElement>(null);
  const v = verses[i];
  const prev = () => setI((n) => Math.max(0, n - 1));
  const next = () => setI((n) => Math.min(verses.length - 1, n + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setI((n) => Math.min(verses.length - 1, n + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setI((n) => Math.max(0, n - 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    // 보여주는 동안 화면이 꺼지지 않게
    let lock: WakeLock | null = null;
    const nav = navigator as unknown as { wakeLock?: { request(t: "screen"): Promise<WakeLock> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l), () => {});
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      lock?.release().catch(() => {});
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [verses.length, onClose]);

  if (!v) return null;
  const len = v.text.length;
  // 긴 절은 글자를 조금 줄여 한 화면에 들어가게
  const size = len > 140 ? "clamp(22px, 4.2vw, 52px)" : len > 80 ? "clamp(26px, 5vw, 64px)" : "clamp(30px, 6vw, 80px)";

  return (
    <div ref={root} className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-stone-50 select-none">
      <div className="flex items-center justify-between px-4 py-3 text-sm text-stone-400">
        <span className="tabular-nums">
          {i + 1} / {verses.length}
        </span>
        <div className="flex gap-1">
          <button
            aria-label="전체 화면"
            onClick={() => root.current?.requestFullscreen?.().catch(() => {})}
            className="rounded-lg p-2 hover:bg-stone-800"
          >
            <Maximize className="h-5 w-5" />
          </button>
          <button aria-label="닫기" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-800">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-6 pb-6 sm:px-16">
        {/* 화면 왼쪽·오른쪽을 누르면 이전·다음 절 */}
        <button aria-label="이전 절" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
        <button aria-label="다음 절" onClick={next} className="absolute inset-y-0 right-0 w-2/3" />
        <figure className="pointer-events-none max-w-5xl text-center">
          <blockquote className="font-serif leading-[1.6] [text-wrap:balance]" style={{ fontSize: size }}>
            {v.text}
          </blockquote>
          <figcaption className="mt-8 text-[clamp(16px,2.4vw,30px)] text-amber-400">{refLabel(v)}</figcaption>
        </figure>
      </div>
      <div className="flex justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={prev} disabled={i === 0} className="flex items-center gap-1 rounded-lg px-3 py-2 text-stone-300 hover:bg-stone-800 disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" /> 이전
        </button>
        <button onClick={next} disabled={i === verses.length - 1} className="flex items-center gap-1 rounded-lg px-3 py-2 text-stone-300 hover:bg-stone-800 disabled:opacity-30">
          다음 <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
