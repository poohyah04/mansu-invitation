// /bible 오프라인용 서비스 워커.
// 페이지: 네트워크 우선, 실패하면 캐시. 정적 파일과 성경 데이터: 캐시 우선.
const CACHE = "bible-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/bible", "/bible/krv.json", "/bible/manifest.webmanifest"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bible-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 페이지가 지금 쓰고 있는 스크립트·글꼴 목록을 보내오면 캐시에 담는다
self.addEventListener("message", (e) => {
  if (e.data?.type !== "cache") return;
  const port = e.ports[0];
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(e.data.urls.map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => {})))))
      .then(() => port?.postMessage("cached"), () => port?.postMessage("failed")),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname === "/bible") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/bible", copy));
          }
          return res;
        })
        .catch(() => caches.match("/bible")),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/bible/")) {
    e.respondWith(
      caches.match(req, { ignoreSearch: url.pathname.startsWith("/bible/") }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
