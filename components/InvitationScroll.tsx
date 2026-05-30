"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MapPin, Calendar, Phone, Share2, CheckCircle2, ChevronRight, Star } from "lucide-react";

export default function InvitationScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Height increased to 3000vh for 6 sections with plenty of hold time
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // ================= SCROLL TIMING CONFIGURATION =================
  // bg fades
  const sec1BgOp = useTransform(scrollYProgress, [0.13, 0.16], [1, 0]);
  const sec2BgOp = useTransform(scrollYProgress, [0.13, 0.16, 0.29, 0.32], [0, 1, 1, 0]);
  const sec3BgOp = useTransform(scrollYProgress, [0.29, 0.32, 0.45, 0.48], [0, 1, 1, 0]);
  const sec4BgOp = useTransform(scrollYProgress, [0.45, 0.48, 0.61, 0.64], [0, 1, 1, 0]);
  const sec5BgOp = useTransform(scrollYProgress, [0.61, 0.64, 0.77, 0.80], [0, 1, 1, 0]);
  const sec6BgOp = useTransform(scrollYProgress, [0.77, 0.80, 1], [0, 1, 1]);

  // bg scales (subtle zoom effect)
  const sec1BgScale = useTransform(scrollYProgress, [0, 0.16], [1.1, 1.3]);
  const sec2BgScale = useTransform(scrollYProgress, [0.13, 0.32], [1.1, 1.3]);
  const sec3BgScale = useTransform(scrollYProgress, [0.29, 0.48], [1.1, 1.3]);
  const sec4BgScale = useTransform(scrollYProgress, [0.45, 0.64], [1.1, 1.3]);
  const sec5BgScale = useTransform(scrollYProgress, [0.61, 0.80], [1.1, 1.3]);
  const sec6BgScale = useTransform(scrollYProgress, [0.77, 1], [1.1, 1.3]);

  // --- Sequenced Text Animations ---
  // Text slides in AFTER background is set, and slides out BEFORE background fades.

  // Sec 1 (Hero) text: fades up and out, moves completely off-screen upwards
  const sec1TextOp = useTransform(scrollYProgress, [0.08, 0.11], [1, 0]);
  const sec1TextY = useTransform(scrollYProgress, [0.08, 0.11], ["0vh", "-100vh"]);

  // Sec 2 (Greeting) text: slides in from right, stays, slides out left
  const sec2TextOp = useTransform(scrollYProgress, [0.17, 0.21, 0.27, 0.30], [0, 1, 1, 0]);
  const sec2TextX = useTransform(scrollYProgress, [0.17, 0.21, 0.27, 0.30], ["100vw", "0vw", "0vw", "-100vw"]);

  // Sec 3 (When & Where) text: slides in from left, stays, slides out right
  const sec3TextOp = useTransform(scrollYProgress, [0.33, 0.37, 0.43, 0.46], [0, 1, 1, 0]);
  const sec3TextX = useTransform(scrollYProgress, [0.33, 0.37, 0.43, 0.46], ["-100vw", "0vw", "0vw", "100vw"]);

  // Sec 4 (Order of Service) text: slides in from right, stays, slides out left
  const sec4TextOp = useTransform(scrollYProgress, [0.49, 0.53, 0.59, 0.62], [0, 1, 1, 0]);
  const sec4TextX = useTransform(scrollYProgress, [0.49, 0.53, 0.59, 0.62], ["100vw", "0vw", "0vw", "-100vw"]);
  
  // Sec 5 (130th Journey) text: slides in from bottom, stays, slides out top
  const sec5TextOp = useTransform(scrollYProgress, [0.65, 0.69, 0.75, 0.78], [0, 1, 1, 0]);
  const sec5TextY = useTransform(scrollYProgress, [0.65, 0.69, 0.75, 0.78], ["100vh", "0vh", "0vh", "-100vh"]);

  // Sec 6 (Outro / Actions) text: fades up and stays
  const sec6TextOp = useTransform(scrollYProgress, [0.81, 0.85], [0, 1]);
  const sec6TextY = useTransform(scrollYProgress, [0.81, 0.85], ["100vh", "0vh"]);

  // --- The Star Flash Transition ---
  // A glowing star spins, grows massive, and flashes ONLY during the first background crossfade (0.13 - 0.16)
  const starOp = useTransform(
    scrollYProgress,
    [0.13, 0.145, 0.155, 0.17],
    [0, 1, 1, 0]
  );
  const starScale = useTransform(
    scrollYProgress,
    [0.13, 0.15, 0.16],
    [0, 1, 40]
  );
  const starRotate = useTransform(scrollYProgress, [0, 1], [0, 2160]);

  // Color schemes for invitations
  const goldColor = "text-[#d4af37]";
  const darkNavy = "bg-[#0a192f]/90";
  const goldBorder = "border-[#d4af37]/30";

  return (
    <div className="relative">
      
      {/* The scrolling container */}
      <div ref={containerRef} className="h-[3000vh] relative">
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-stone-900">
          
          {/* ================= BACKGROUNDS ================= */}
          {/* Section 1 Background: Deep Navy with subtle gradient for 130th design */}
          <motion.div className="absolute inset-0 w-full h-full bg-[#071324] overflow-hidden" style={{ opacity: sec1BgOp, scale: sec1BgScale }}>
            {/* Subtle decorative curved lines (using pure CSS/SVG) */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <path d="M 0,300 C 300,400 700,200 1000,300" stroke="#d4af37" strokeWidth="1" fill="none" />
              <path d="M 0,700 C 400,600 600,800 1000,700" stroke="#ffffff" strokeWidth="0.5" fill="none" />
              <path d="M 0,500 C 200,600 800,400 1000,500" stroke="#ffffff" strokeWidth="0.5" fill="none" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-b from-[#071324]/80 via-transparent to-[#071324]" />
          </motion.div>
          
          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec2BgOp, scale: sec2BgScale }}>
            <img src="/images/church_int.jpg" alt="만수교회 예배당" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#0a192f]/85 backdrop-blur-sm" />
          </motion.div>

          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec3BgOp, scale: sec3BgScale }}>
            <img src="/images/new_church_1.jpg" alt="일시 및 장소 배경" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#0a192f]/85 backdrop-blur-sm" />
          </motion.div>

          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec4BgOp, scale: sec4BgScale }}>
            <img src="/images/new_church_2.jpg" alt="예배 순서 배경" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#0a192f]/85 backdrop-blur-sm" />
          </motion.div>
          
          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec5BgOp, scale: sec5BgScale }}>
            <img src="/images/church_gallery.jpg" alt="130주년 배경" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#0a192f]/90 backdrop-blur-md" />
          </motion.div>

          <motion.div className="absolute inset-0 w-full h-full" style={{ opacity: sec6BgOp, scale: sec6BgScale }}>
            <img src="/images/church_ext3.jpg" alt="피날레 배경" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-lg" />
          </motion.div>

          {/* ================= STAR TRANSITION EFFECT ================= */}
          <motion.div 
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none mix-blend-screen"
            style={{ opacity: starOp }}
          >
            <motion.div style={{ scale: starScale, rotate: starRotate }}>
              <Star className="w-24 h-24 text-yellow-200 fill-yellow-200 drop-shadow-[0_0_50px_rgba(255,255,0,0.8)]" />
            </motion.div>
          </motion.div>

          {/* ================= FOREGROUND TEXTS ================= */}
          
          {/* Section 1: Hero (130th Anniversary Design) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-4">
            <motion.div 
              className="text-center mt-0 w-full max-w-4xl flex flex-col items-center"
              style={{ opacity: sec1TextOp, y: sec1TextY }}
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <Star className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
                <span className="text-white text-base md:text-lg tracking-[0.3em] font-light">만수교회</span>
              </div>
              
              <div className="flex items-center justify-center gap-4 w-full mb-12 opacity-70">
                <div className="h-[1px] flex-1 max-w-[60px] bg-[#d4af37]"></div>
                <span className="text-[#d4af37] text-xs md:text-sm tracking-[0.4em] font-serif uppercase">EST. 1895 — 2026</span>
                <div className="h-[1px] flex-1 max-w-[60px] bg-[#d4af37]"></div>
              </div>

              {/* Huge 130 Typography */}
              <div className="relative flex items-end justify-center mb-10 leading-none">
                <span className="text-white text-8xl md:text-[180px] font-serif font-light tracking-tighter">1</span>
                <span className="text-[#d4af37] text-8xl md:text-[180px] font-serif font-light tracking-tighter -ml-2 md:-ml-4">3</span>
                <span className="text-white text-8xl md:text-[180px] font-serif font-light tracking-tighter -ml-1 md:-ml-2">0</span>
                <span className="text-white text-2xl md:text-5xl font-serif italic font-light ml-2 mb-2 md:mb-6">th</span>
                
                {/* Decorative lines across the numbers */}
                <div className="absolute top-1/2 left-[-10%] right-[-10%] h-[1px] bg-[#d4af37]/30 transform -rotate-2"></div>
                <div className="absolute top-[45%] left-[-5%] right-[-5%] h-[1px] bg-white/20 transform rotate-1"></div>
              </div>

              <h1 className="text-sm md:text-xl font-serif tracking-[0.6em] text-white/90 mb-12 uppercase break-keep">
                만수교회 창립 130주년
              </h1>
              
              <div className="flex flex-col items-center gap-4 mt-4">
                <h2 className="text-2xl md:text-4xl font-serif text-white leading-snug">
                  끊기지 않은 은혜, <br className="md:hidden" />
                  멈추지 않는 <span className="text-[#d4af37]">강물</span>처럼
                </h2>
                <p className="text-[10px] md:text-sm text-white/60 tracking-[0.3em] md:tracking-[0.5em] mt-4">
                  기억하고 · 기뻐하고 · 나아가고 · 새로워집니다
                </p>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-70">
                <span className="text-[#d4af37] text-[10px] tracking-widest uppercase mb-2 font-serif">Scroll</span>
                <motion.div 
                  animate={{ y: [0, 8, 0] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-[1px] h-8 bg-gradient-to-b from-[#d4af37] to-transparent"
                />
              </div>
            </motion.div>
          </div>

          {/* Section 2: Greeting Detail */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              className={`text-center p-8 md:p-16 rounded-2xl ${darkNavy} backdrop-blur-xl border ${goldBorder} shadow-2xl max-w-2xl w-full mx-auto`}
              style={{ opacity: sec2TextOp, x: sec2TextX }}
            >
              <div className="mb-8 flex justify-center">
                <div className={`w-12 h-[1px] bg-[#d4af37]/50`}></div>
              </div>
              
              <span className={`text-xs tracking-[0.3em] ${goldColor} mb-8 block uppercase`}>Invitation</span>
              
              <p className="text-sm md:text-lg text-white/90 font-light leading-[2.5] break-keep">
                한 시대가 낳은 새로운 교회,<br/>
                <span className="font-serif text-[#d4af37] text-lg md:text-xl px-1">130년</span>의 강이 되겠습니다.<br/>
                <br/>
                새롭게 단장한 만수교회에서<br/>
                은혜의 큰 잔치를 함께 나누고자<br/>
                여러분을 정중히 초대합니다.
              </p>
              
              <div className="mt-12 w-12 h-[1px] bg-[#d4af37]/20 mx-auto"></div>
            </motion.div>
          </div>

          {/* Section 3: When & Where */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              className={`p-8 md:p-14 rounded-2xl ${darkNavy} backdrop-blur-xl border ${goldBorder} shadow-2xl max-w-2xl w-full mx-auto relative overflow-hidden`}
              style={{ opacity: sec3TextOp, x: sec3TextX }}
            >
              {/* Corner decorations */}
              <div className={`absolute top-4 left-4 w-4 h-4 border-t border-l ${goldBorder}`}></div>
              <div className={`absolute top-4 right-4 w-4 h-4 border-t border-r ${goldBorder}`}></div>
              <div className={`absolute bottom-4 left-4 w-4 h-4 border-b border-l ${goldBorder}`}></div>
              <div className={`absolute bottom-4 right-4 w-4 h-4 border-b border-r ${goldBorder}`}></div>

              <div className="text-center mb-10">
                <span className={`text-xs tracking-[0.3em] ${goldColor} block uppercase`}>When & Where</span>
              </div>
              
              <div className="text-center mb-10 border-b border-[#d4af37]/20 pb-10">
                <p className="text-sm tracking-[0.4em] text-white/60 mb-4">SUNDAY</p>
                <div className="flex items-center justify-center gap-2 text-white font-serif mb-4">
                  <span className="text-xl">2026.</span>
                  <span className="text-5xl md:text-7xl font-light">10 <span className="text-[#d4af37]">·</span> 04</span>
                </div>
                <p className="text-lg tracking-widest text-white/80 font-light">오전 11 : 00</p>
              </div>

              <div className="flex flex-col gap-6 text-sm md:text-base text-white/70 font-light">
                <div className="flex items-center gap-6">
                  <span className={goldColor}>장 소</span>
                  <span className="text-white">만수교회 본당 (2F)</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className={goldColor}>주 소</span>
                  <span className="text-white break-keep">인천광역시 남동구 만수서로 884</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className={goldColor}>문 의</span>
                  <span className="text-white">교회사무실 · 032-464-2144</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Section 4: Order of Service */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              className={`p-8 md:p-16 rounded-2xl ${darkNavy} backdrop-blur-xl border ${goldBorder} shadow-2xl max-w-2xl w-full mx-auto`}
              style={{ opacity: sec4TextOp, x: sec4TextX }}
            >
              <div className="text-center mb-12">
                <span className={`text-xs tracking-[0.3em] ${goldColor} block uppercase mb-3`}>Order of Service</span>
                <h3 className="text-2xl md:text-3xl font-serif text-white tracking-widest">예 배 순 서</h3>
              </div>

              <div className="flex flex-col gap-0 border-t border-[#d4af37]/20">
                {[
                  { num: "01", title: "감사·봉헌 예배", eng: "Dedication Service" },
                  { num: "02", title: "장로 이·취임 예배", eng: "Elder Inauguration" },
                  { num: "03", title: "130인 연합찬양대", eng: "130-person Choir" },
                  { num: "04", title: "소망 카드 벽 장식", eng: "Wall of Hope" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-6 border-b border-[#d4af37]/20">
                    <div className="flex items-center gap-6">
                      <span className={`text-xs font-serif ${goldColor}`}>{item.num}</span>
                      <span className="text-lg md:text-xl text-white font-serif">{item.title}</span>
                    </div>
                    <span className="text-xs text-white/40 tracking-wider hidden md:block">{item.eng}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Section 5: 130th Anniversary Journey */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-6">
            <motion.div 
              className={`p-8 md:p-14 rounded-2xl ${darkNavy} backdrop-blur-xl border ${goldBorder} shadow-2xl max-w-2xl w-full mx-auto`}
              style={{ opacity: sec5TextOp, y: sec5TextY }}
            >
              <div className="text-center mb-10 border-b border-[#d4af37]/20 pb-8">
                <span className={`text-xs tracking-[0.3em] ${goldColor} block uppercase mb-3`}>Countdown - 130th Anniversary</span>
                <h3 className="text-xl md:text-2xl font-serif text-white tracking-widest">이어지는 130 주년 여정</h3>
              </div>

              <div className="flex flex-col gap-8">
                {[
                  { date: "10.04 SUN", theme: "FAMILY", desc: "온가족 초청예배" },
                  { date: "10.18 SUN", theme: "ENJOY", desc: "130주년 문화축제" },
                  { date: "10.25 SUN", theme: "BEYOND", desc: "남동지방 연합성회" },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8 text-sm md:text-base text-white/80">
                    <div className="flex gap-4 md:gap-8 md:w-1/2">
                      <span className="text-white/40 min-w-[80px] font-mono text-xs mt-1 md:mt-0">{item.date}</span>
                      <span className={`font-serif tracking-widest ${goldColor}`}>{item.theme}</span>
                    </div>
                    <div className="md:w-1/2 text-white font-light pl-[96px] md:pl-0">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Section 6: Outro & Actions */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto z-30 px-6">
            <motion.div 
              className="max-w-2xl w-full mx-auto flex flex-col items-center"
              style={{ opacity: sec6TextOp, y: sec6TextY }}
            >
              {/* Gallery Preview */}
              <div className="w-full mb-12 relative group cursor-pointer">
                <div className="text-center mb-6">
                  <span className={`text-xs tracking-[0.3em] text-white/60 block uppercase`}>Newly Restored</span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                  <div className="col-span-1 rounded-xl overflow-hidden aspect-[3/4]">
                    <img src="/images/church_ext1.jpg" alt="새성전 외부" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                  </div>
                  <div className="col-span-1 flex flex-col gap-2">
                    <div className="rounded-xl overflow-hidden h-1/2">
                      <img src="/images/new_church_2.jpg" alt="새성전 로비" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                    </div>
                    <div className="rounded-xl overflow-hidden h-1/2">
                      <img src="/images/church_int.jpg" alt="새성전 내부" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-center">
                  <Link href="/ministries" className={`px-6 py-2 rounded-full border ${goldBorder} text-white text-sm tracking-widest hover:bg-[#d4af37]/20 transition-colors flex items-center gap-2`}>
                    새 성전 갤러리 구경하기 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3 mb-16">
                <button className={`w-full py-4 bg-[#d4af37] text-stone-900 font-bold rounded-lg tracking-widest hover:bg-[#ebd074] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.3)]`}>
                  참 석 응 답 하 기
                </button>
                <div className="flex gap-3 w-full">
                  <a 
                    href="https://map.naver.com/p/search/%EB%A7%8C%EC%88%98%EA%B0%90%EB%A6%AC%EA%B5%90%ED%9A%8C/place/13440882?c=15.00,0,0,0,dh&placePath=/home?bk_query=%EB%A7%8C%EC%88%98%EA%B0%90%EB%A6%AC%EA%B5%90%ED%9A%8C&entry=bmp&from=map&fromPanelNum=2&timestamp=202605302059&locale=ko&svcName=map_pcv5&searchText=%EB%A7%8C%EC%88%98%EA%B0%90%EB%A6%AC%EA%B5%90%ED%9A%8C"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-4 bg-transparent border ${goldBorder} text-white text-sm font-light tracking-widest rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center`}
                  >
                    위 치 안 내
                  </a>
                  <a 
                    href="https://www.msmc.or.kr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-4 bg-transparent border ${goldBorder} text-white text-sm font-light tracking-widest rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center`}
                  >
                    교회 홈페이지
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col items-center">
                <Star className={`w-10 h-10 ${goldColor} fill-[#d4af37] mb-2`} />
                <span className="text-white text-xs tracking-[0.2em] font-light mb-6">만수교회</span>
                
                <div className="text-center text-white/40 text-[10px] md:text-xs tracking-widest leading-loose">
                  <p>만수교회 창립 130주년 기념행사 1차</p>
                  <p>MANSU CHURCH · 1896 — 2026</p>
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
