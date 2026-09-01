import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shorts Studio — 긴 영상에서 숏폼 뽑아내기",
  description:
    "유튜브 링크나 자막을 넣으면 핵심 구간을 찾아 숏폼 편집 기획안과 자막을 만들어 줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
