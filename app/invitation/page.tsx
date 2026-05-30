import { Metadata } from "next";
import InvitationScroll from "@/components/InvitationScroll";

export const metadata: Metadata = {
  title: "만수교회 리모델링 감사·봉헌 예배 초대장",
  description: "끊기지 않은 은혜, 멈추지 않는 강물처럼. 새롭게 단장한 만수교회에 여러분을 정중히 초대합니다.",
  openGraph: {
    title: "만수교회 리모델링 감사·봉헌 예배",
    description: "2026년 10월 4일 주일 오전 11시, 만수교회 본당. 은혜의 큰 잔치에 정중히 초대합니다.",
    images: [
      {
        url: "/images/church_ext1.jpg", 
        width: 1200,
        height: 630,
        alt: "만수교회 새 성전 전경",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function InvitationPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-blue-500/30">
      <InvitationScroll />
    </main>
  );
}
