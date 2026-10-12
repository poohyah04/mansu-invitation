import type { Metadata } from "next";
import BibleApp from "@/components/BibleApp";

export const metadata: Metadata = {
  title: "성경 찾기",
  description: "성경 본문 찾기와 단어 검색 (개역한글)",
};

export default function BiblePage() {
  return <BibleApp />;
}
