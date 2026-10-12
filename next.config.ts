import type { NextConfig } from "next";

// 성경 찾기만 따로 배포하는 Vercel 프로젝트에서는 환경 변수 BIBLE_ONLY=1 을 주면
// 첫 화면과 초대장 페이지가 모두 /bible 로 넘어간다. (초대장 사이트에는 영향 없음)
const bibleOnly = process.env.BIBLE_ONLY === "1";

const nextConfig: NextConfig = {
  async redirects() {
    if (!bibleOnly) return [];
    return ["/", "/invitation", "/ministries"].map((source) => ({
      source,
      destination: "/bible",
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        // /bible/sw.js가 /bible 페이지 자체를 맡을 수 있도록 범위를 넓혀 준다
        source: "/bible/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
