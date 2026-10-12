"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * /bible 전용 서비스 워커를 등록하고, 지금 페이지가 쓰는 파일(스크립트·글꼴·성경 데이터)을
 * 캐시에 담아 다음부터 인터넷 없이 열리게 한다.
 */
export function useOffline() {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallPrompt | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const id = requestAnimationFrame(() => {
      sync();
      setStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as unknown as { standalone?: boolean }).standalone === true,
      );
    });
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/bible/sw.js", { scope: "/bible" })
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const urls = [
            location.pathname,
            ...performance
              .getEntriesByType("resource")
              .map((e) => e.name)
              .filter((u) => u.startsWith(location.origin + "/_next/static/") || u.endsWith("/bible/krv.json")),
          ];
          const ch = new MessageChannel();
          ch.port1.onmessage = (e) => setReady(e.data === "cached");
          reg.active?.postMessage({ type: "cache", urls }, [ch.port2]);
        })
        .catch(() => {});
    }
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  return { ready, online, canInstall: !!installEvent, install, standalone };
}
