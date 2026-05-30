"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Heart, Users, BookOpen, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChurchScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isWarping, setIsWarping] = useState(false);
  
  // Height increased to 1500vh to give plenty of room for sequenced animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Background Opacities (Crossfades happen while the star flashes)
  const sec1BgOp = useTransform(scrollYProgress, [0.18, 0.20], [1, 0]);
  const sec2BgOp = useTransform(scrollYProgress, [0.18, 0.20, 0.38, 0.40], [0, 1, 1, 0]);
  const sec3BgOp = useTransform(scrollYProgress, [0.38, 0.40, 0.58, 0.60], [0, 1, 1, 0]);
  const sec4BgOp = useTransform(scrollYProgress, [0.58, 0.60, 0.78, 0.80], [0, 1, 1, 0]);
  const sec5BgOp = useTransform(scrollYProgress, [0.78, 0.80, 1], [0, 1, 1]);

  // Background Scales (Slow constant zoom for depth)
  const sec1BgScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.15]);
  const sec2BgScale = useTransform(scrollYProgress, [0.2, 0.4], [1, 1.15]);
  const sec3BgScale = useTransform(scrollYProgress, [0.4, 0.6], [1, 1.15]);
  const sec4BgScale = useTransform(scrollYProgress, [0.6, 0.8], [1, 1.15]);
  const sec5BgScale = useTransform(scrollYProgress, [0.8, 1], [1, 1.15]);

  // --- Sequenced Text Animations ---
  // Text slides in AFTER background is set, and slides out BEFORE background fades.

  // Sec 1 text: fades up and out, moves completely off-screen upwards
  const sec1TextOp = useTransform(scrollYProgress, [0.12, 0.15], [1, 0]);
  const sec1TextY = useTransform(scrollYProgress, [0.12, 0.15], ["0vh", "-100vh"]);

  // Sec 2 text: slides in from right, stays, slides out left
  const sec2TextOp = useTransform(scrollYProgress, [0.22, 0.24, 0.34, 0.36], [0, 1, 1, 0]);
  const sec2TextX = useTransform(scrollYProgress, [0.22, 0.24, 0.34, 0.36], ["100vw", "0vw", "0vw", "-100vw"]);

  // Sec 3 text: slides in from left, stays, slides out right
  const sec3TextOp = useTransform(scrollYProgress, [0.42, 0.44, 0.54, 0.56], [0, 1, 1, 0]);
  const sec3TextX = useTransform(scrollYProgress, [0.42, 0.44, 0.54, 0.56], ["-100vw", "0vw", "0vw", "100vw"]);

  // Sec 4 text: slides in from right, stays, slides out left
  const sec4TextOp = useTransform(scrollYProgress, [0.62, 0.64, 0.74, 0.76], [0, 1, 1, 0]);
  const sec4TextX = useTransform(scrollYProgress, [0.62, 0.64, 0.74, 0.76], ["100vw", "0vw", "0vw", "-100vw"]);

  // Sec 5 text: fades up and stays
  const sec5TextOp = useTransform(scrollYProgress, [0.82, 0.84], [0, 1]);
  const sec5TextY = useTransform(scrollYProgress, [0.82, 0.84], ["100vh", "0vh"]);

  // --- The Star Flash Transition ---
  // A glowing star spins, grows massive, and flashes ONLY during the first background crossfade (0.14 - 0.22)
  const starOp = useTransform(
    scrollYProgress,
    [0.14, 0.17, 0.20, 0.22],
    [0, 1, 1, 0]
  );
  const starScale = useTransform(
    scrollYProgress,
    [0.14, 0.19, 0.20],
    [0, 1, 40]
  );
  const starRotate = useTransform(scrollYProgress, [0, 1], [0, 2160]);

  const handleWarp = () => {
    setIsWarping(true);
    setTimeout(() => {
      router.push("/ministries");
    }, 1500); 
  };

  return (
    <>
      <div ref={containerRef} className="relative h-[1500vh] bg-stone-50">
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-stone-50 text-stone-900">
          
          {/* ================= BACKGROUNDS ================= */}
          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec1BgOp, scale: sec1BgScale }}>
            <img src="/images/church_ext1.jpg" alt="만수교회 전경" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/40" />
          </motion.div>
          
          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec2BgOp, scale: sec2BgScale }}>
            <img src="/images/church_int.jpg" alt="만수교회 예배당" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/40" />
          </motion.div>

          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec3BgOp, scale: sec3BgScale }}>
            <img src="/images/church_gallery.jpg" alt="만수교회 갤러리" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/50" />
          </motion.div>

          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec4BgOp, scale: sec4BgScale }}>
            <img src="/images/church_ext2.jpg" alt="만수교회 외관" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/50" />
          </motion.div>

          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec5BgOp, scale: sec5BgScale }}>
            <img src="/images/church_ext3.jpg" alt="만수교회 광장" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/60" />
          </motion.div>


          {/* ================= STAR TRANSITION EFFECT ================= */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            style={{ opacity: starOp }}
          >
            <motion.div style={{ scale: starScale, rotate: starRotate }}>
              <svg width="150" height="150" viewBox="0 0 200 200" className="text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,1)] fill-current">
                <path d="M100 0 C100 50 150 100 200 100 C150 100 100 150 100 200 C100 150 50 100 0 100 C50 100 100 50 100 0 Z" />
              </svg>
            </motion.div>
          </motion.div>


          {/* ================= FOREGROUND TEXTS ================= */}
          
          {/* Section 1: Welcome */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              className="text-center mt-20"
              style={{ opacity: sec1TextOp, y: sec1TextY }}
            >
              <img src="/images/logo2.png" alt="만수교회 로고" className="h-20 md:h-28 mx-auto mb-6 object-contain drop-shadow-xl brightness-0 invert" />
              <p className="text-2xl md:text-4xl text-orange-200 font-bold mb-4 drop-shadow-md">
                교회가 당신의 소망입니다
              </p>
              <p className="text-xl md:text-2xl text-stone-200 font-light max-w-2xl mx-auto px-4 drop-shadow-md">
                당신이 하나님의 기쁨입니다.
              </p>
              <div className="mt-20 flex flex-col items-center opacity-70">
                <span className="text-white text-sm tracking-widest uppercase mb-2">Scroll Down</span>
                <motion.div 
                  animate={{ y: [0, 10, 0] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent"
                />
              </div>
            </motion.div>
          </div>

          {/* Section 2: Pastor's Greeting */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              style={{ opacity: sec2TextOp, x: sec2TextX }}
              className="bg-white/95 backdrop-blur-md p-10 md:p-14 rounded-3xl shadow-2xl border border-stone-200 max-w-4xl w-full text-center pointer-events-auto"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-8 text-stone-900 tracking-tight">담임목사님 인사말</h2>
              <div className="text-lg md:text-xl text-stone-700 leading-relaxed font-light space-y-6">
                <p>사람을 변화시킬 수 있는 것은 그 사람의 의지와 확신이라고 말합니다.<br/>하지만 그 사람을 빨리 변화시키는 것은 개인의 의지보다는<br/>주변의 도움과 믿음이 오히려 그 사람을 더 빨리 쉽게 변화하게 만듭니다.</p>
                <p>신앙과 믿음생활도 마찬가지입니다.<br/>지금 힘들고 어려우십니까? 고통과 고난 중에 계십니까? 혼자 힘으로 힘드시죠?</p>
                <p className="font-bold text-blue-600 text-2xl md:text-3xl mt-8 tracking-tight">
                  예수님이 여러분과 함께 계십니다.<br/>그리고 저희가 여러분과 함께 하겠습니다.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Section 3: Vision */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              style={{ opacity: sec3TextOp, x: sec3TextX }}
              className="bg-stone-900/85 backdrop-blur-md p-10 md:p-14 rounded-3xl shadow-2xl border border-stone-600 max-w-5xl w-full text-white pointer-events-auto"
            >
              <Users className="w-12 h-12 mx-auto mb-6 text-sky-400 drop-shadow-md" />
              <h2 className="text-4xl md:text-5xl font-black mb-10 tracking-tight text-center">비전과 핵심가치</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <h3 className="text-2xl font-bold text-sky-300 mb-4 border-b border-sky-500/30 pb-3">교회비전</h3>
                  <ul className="space-y-3 font-light text-lg">
                    <li>• 1만 사역자 세우기</li>
                    <li>• 1만 가정(지역) 교회 세우기</li>
                    <li>• 1만 선교사 파송하기</li>
                  </ul>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <h3 className="text-2xl font-bold text-orange-300 mb-4 border-b border-orange-500/30 pb-3">목회비전</h3>
                  <ul className="space-y-3 font-light text-lg">
                    <li>• 하나님의 기쁨이 되는 교회</li>
                    <li>• 세상의 소망이 되는 교회</li>
                    <li>• 항상 감사가 넘치는 교회</li>
                    <li>• 서로 사랑하며 섬기는 교회</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Section 4: Core Values & Mission */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              style={{ opacity: sec4TextOp, x: sec4TextX }}
              className="bg-white/95 backdrop-blur-md p-10 md:p-14 rounded-3xl shadow-2xl border border-stone-200 max-w-4xl w-full text-stone-900 pointer-events-auto"
            >
              <BookOpen className="w-12 h-12 mx-auto mb-6 text-emerald-500" />
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center tracking-tight">교인사명 및 핵심가치</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div>
                  <h3 className="text-xl font-bold text-emerald-600 mb-4 bg-emerald-50 inline-block px-4 py-1 rounded-full">교인사명</h3>
                  <ul className="space-y-3 font-light text-stone-700 text-lg">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 믿음과 기도로 세워가는 영•성</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 사랑과 섬김으로 나누는 생활</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 기쁨과 감사로 드리는 예배</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 세상과 영혼을 구원하는 선교</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-emerald-600 mb-4 bg-emerald-50 inline-block px-4 py-1 rounded-full">핵심가치</h3>
                  <ul className="space-y-3 font-light text-stone-700 text-lg">
                    <li><strong className="font-bold text-stone-900">교육</strong> : 꿈이 이루어지는 교회</li>
                    <li><strong className="font-bold text-stone-900">예배</strong> : 찬양과 기도, 말씀이 있는 예배</li>
                    <li><strong className="font-bold text-stone-900">섬김</strong> : 사랑과 헌신으로 섬김</li>
                    <li><strong className="font-bold text-stone-900">선교</strong> : 한 영혼과 온 열방을 향한 구원</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Section 5: Logo & Outro */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              style={{ opacity: sec5TextOp, y: sec5TextY }}
              className="text-center bg-white/95 p-10 md:p-16 rounded-[2rem] shadow-2xl max-w-4xl w-full border border-stone-200 pointer-events-auto"
            >
              <img src="/images/logo2.png" alt="만수교회 로고" className="h-16 md:h-20 mx-auto mb-8 object-contain" />
              <h2 className="text-3xl md:text-5xl font-black mb-8 tracking-tight text-stone-900">
                만수교회 <span className="text-blue-600">로고소개</span>
              </h2>
              
              <div className="text-base md:text-lg text-stone-600 font-light mb-12 space-y-4 max-w-2xl mx-auto leading-relaxed text-left md:text-center">
                <p>국문 만수의 <strong className="text-stone-900">‘ㅁ’</strong>과 영문 Mansu의 <strong className="text-stone-900">‘S’</strong>를 형상화하여 건강한 교회공동체를 의미하고 하늘과 대지의 풍요로움을 의미합니다.</p>
                <p>상단의 <strong className="text-stone-900">별</strong>은 교회의 머리되시고 어둠을 밝혀주시고 모든 사람이 구원에 이르기 원하시는 하나님을 상징합니다.</p>
                <p>중앙의 <strong className="text-stone-900">‘S’</strong>는 올바른 길로 인도하시는 하나님의 말씀을 믿고 따르는 성도들이 나아 갈 바른 길, 바른 자세를 의미하여 세상 밖으로의 교회를 전파하는 의미를 담고 있습니다.</p>
              </div>
              
              <button 
                onClick={handleWarp}
                className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-blue-600 rounded-full hover:bg-blue-700 hover:scale-105 shadow-xl"
              >
                <span className="relative text-lg">교회 사역 갤러리 입장하기</span>
              </button>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Warp Animation Overlay */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeIn" }}
            className="fixed inset-0 bg-white z-[110]"
          />
        )}
      </AnimatePresence>
    </>
  );
}
