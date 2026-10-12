"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API는 TS 기본 타입에 없어서 필요한 만큼만 선언
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "마이크 사용이 허용되지 않았습니다. 브라우저 설정에서 마이크를 허용해 주세요.",
  "service-not-allowed": "이 브라우저에서는 음성 인식을 쓸 수 없습니다.",
  "no-speech": "말소리가 들리지 않았습니다. 다시 눌러 말씀해 주세요.",
  "audio-capture": "마이크를 찾을 수 없습니다.",
  network: "음성 인식은 인터넷 연결이 필요합니다.",
};

type Handlers = {
  onInterim: (text: string) => void;
  /** 말이 끝났을 때 한 번 */
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

/** 한국어 음성 인식 */
export function useSpeech(h: Handlers) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const handlers = useRef(h);
  useEffect(() => {
    handlers.current = h;
  });

  useEffect(() => {
    // 서버 렌더와 맞추기 위해 지원 여부는 마운트 후에 판단
    const id = requestAnimationFrame(() => setSupported(!!getCtor()));
    return () => {
      cancelAnimationFrame(id);
      rec.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = "ko-KR";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      handlers.current.onInterim(finalText + interim);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") {
        handlers.current.onError(ERRORS[e.error] ?? "음성을 알아듣지 못했습니다. 다시 시도해 주세요.");
      }
    };
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) handlers.current.onFinal(finalText);
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, start, stop };
}
