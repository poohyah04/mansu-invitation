"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Users, Heart, Star, BookOpen, HandHeart, Building, Globe } from "lucide-react";
import Link from "next/link";

export default function MinistriesGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 7 Slides: Map vertical scroll to horizontal scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Calculate percentage for 7 slides: 100% * (7-1)/7 = 85.7142%
  const xTransform = useTransform(scrollYProgress, [0, 1], ["0%", "-85.7142%"]);
  
  // Mouse panning state for the panorama image
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const panX = useSpring(0.5, { damping: 30, stiffness: 100 });
  const panY = useSpring(0.5, { damping: 30, stiffness: 100 });
  
  const bgPanX = useTransform(panX, [0, 1], ["-2%", "2%"]);
  const bgPanY = useTransform(panY, [0, 1], ["-2%", "2%"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePos({ x, y });
    panX.set(x);
    panY.set(y);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main 
      className="bg-stone-50 text-stone-900 cursor-crosshair selection:bg-blue-500/30 font-sans"
      onMouseMove={handleMouseMove}
    >
      {/* HUD UI overlay (Church themed) */}
      <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 md:p-8">
        <div className="flex justify-between items-start">
          <Link href="/" className="pointer-events-auto">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-5 py-3 rounded-full border border-stone-200 text-stone-700 hover:text-blue-600 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-bold text-sm tracking-widest hidden md:inline">메인으로</span>
            </motion.button>
          </Link>

          <div className="flex flex-col items-end gap-3 pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3">
               <img src="/images/logo1.png" alt="로고" className="w-10 h-10 object-contain" />
               <div className="hidden md:block text-right pr-2">
                 <div className="text-xs font-bold text-blue-600">기독교대한감리회</div>
                 <div className="text-sm font-black text-stone-800 tracking-tight">만수교회 비전 갤러리</div>
               </div>
            </div>
            
            <div className="flex flex-col gap-2 font-medium text-xs md:text-sm text-stone-600 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500"/> 인천 만수교회</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500"/> 1만 사역자 비전</div>
              <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-emerald-500"/> 사랑과 섬김</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="text-stone-400 font-bold text-xs md:text-sm tracking-widest bg-white/80 px-4 py-2 rounded-lg backdrop-blur-sm border border-stone-200">
            SCROLL TO EXPLORE ➔
          </div>
        </div>
      </div>

      {/* Screen flash on load */}
      <AnimatePresence>
        {!mounted && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="fixed inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="fixed inset-0 bg-white z-[100] pointer-events-none"
      />

      {/* The scrolling container */}
      <div ref={containerRef} className="h-[700vh] relative">
        <div className="sticky top-0 h-screen w-[100vw] overflow-hidden">
          
          {/* Horizontal Track (700vw width for 7 slides) */}
          <motion.div 
            style={{ x: xTransform }}
            className="flex h-full w-[700vw]"
          >
            {/* Slide 1: Welcome to Ministries */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0">
              <motion.img 
                src="/images/church_gallery.jpg" 
                alt="사역 갤러리 1"
                style={{ x: bgPanX, y: bgPanY }}
                className="absolute inset-0 w-[110%] h-[110%] object-cover object-center max-w-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent pointer-events-none" />
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -50 }}
                transition={{ duration: 1, delay: 1.5 }}
                className="absolute left-10 md:left-32 max-w-2xl z-10 p-4"
              >
                <div className="inline-block bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-bold mb-4 border border-blue-200 shadow-sm">VISION GALLERY</div>
                <h1 className="text-5xl md:text-7xl font-black text-stone-900 mb-6 drop-shadow-sm leading-tight">
                  새로운 성전,<br/>
                  <span className="text-blue-600">위대한 도약</span>
                </h1>
                <p className="text-lg md:text-2xl text-stone-700 font-light leading-relaxed">
                  앞으로 우리가 함께 걸어갈 만수교회의 아름다운 미래와 새로운 성전의 모습을 미리 만나보세요. 
                  스크롤을 내려 멋진 공간들을 감상해 보세요.
                </p>
              </motion.div>
            </div>

            {/* Slide 2: Main Sanctuary (new_church_4.jpg) */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0 overflow-hidden bg-stone-100">
              <motion.img 
                src="/images/new_church_4.jpg" 
                alt="대예배당"
                className="absolute inset-0 w-full h-full object-cover origin-right scale-110 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent pointer-events-none" />
              
              <div className="z-10 text-center max-w-4xl px-8 relative mt-auto mb-32">
                <div className="bg-stone-900/80 p-10 md:p-14 rounded-3xl backdrop-blur-md shadow-2xl border border-stone-500/30 text-white">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                  <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                    은혜가 가득한 대예배당
                  </h2>
                  <p className="text-lg md:text-xl text-stone-200 font-light leading-relaxed">
                    따뜻한 원목 톤과 부드러운 곡선이 어우러진 예배 공간입니다.
                    더욱 깊이 있는 찬양과 말씀의 은혜를 경험할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 3: Balcony View (new_church_2.jpg) */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0 overflow-hidden bg-stone-100">
              <motion.img 
                src="/images/new_church_2.jpg" 
                alt="예배당 전경"
                className="absolute inset-0 w-full h-full object-cover origin-center opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-900/70 via-transparent to-stone-900/70 pointer-events-none" />
              
              <div className="absolute top-20 right-10 md:right-32 z-10 max-w-xl">
                <div className="bg-white/95 p-8 md:p-10 rounded-3xl backdrop-blur-md border border-stone-200 shadow-xl">
                  <Users className="w-10 h-10 mb-4 text-blue-500" />
                  <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                    모이기에 힘쓰는 공간
                  </h2>
                  <p className="text-stone-700 font-light leading-relaxed">
                    2층 발코니석을 통해 성도들이 한 마음으로 예배에 집중할 수 있도록 설계되었습니다. 
                    시야를 방해하지 않는 탁 트인 개방감이 특징입니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 4: Modern Hall (new_church_1.jpg) */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0 overflow-hidden bg-stone-100">
              <motion.img 
                src="/images/new_church_1.jpg" 
                alt="교육과 소그룹"
                style={{ scale: 1.05 }}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-white/30 backdrop-blur-sm pointer-events-none" />
              
              <div className="absolute top-1/2 -translate-y-1/2 left-10 md:left-32 z-10 max-w-2xl">
                <div className="bg-white/90 p-10 md:p-14 rounded-3xl backdrop-blur-md border border-stone-200 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <HandHeart className="w-12 h-12 text-rose-500" />
                    <h2 className="text-4xl md:text-5xl font-bold text-stone-900 tracking-tight">
                      다목적 비전 홀
                    </h2>
                  </div>
                  <p className="text-lg md:text-xl text-stone-700 font-light leading-relaxed mb-8">
                    다음 세대 교육, 소그룹 모임, 특별 세미나 등 다양한 사역이 이루어지는 공간입니다. 
                    유연한 의자 배치로 어떤 활동이든 효과적으로 지원합니다.
                  </p>
                  <ul className="grid grid-cols-2 gap-4 text-stone-800 font-medium">
                    <li className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500"/> 청년/학생부 예배</li>
                    <li className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500"/> 각종 세미나</li>
                    <li className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500"/> 소그룹 제자훈련</li>
                    <li className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500"/> 친교 모임</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Slide 5: Front Exterior (new_church_5.jpg) */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0 overflow-hidden bg-stone-100">
              <motion.img 
                src="/images/new_church_5.jpg" 
                alt="교회 전면 전경"
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-900/80 pointer-events-none" />
              
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-10">
                <div className="bg-stone-900/70 p-8 rounded-3xl backdrop-blur-md border border-stone-500/30 text-white text-center">
                  <Building className="w-10 h-10 mx-auto mb-3 text-orange-400" />
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">지역 사회를 향해 열린 교회</h2>
                  <p className="text-stone-200 font-light text-lg">
                    붉은 벽돌과 현대적인 유리가 조화를 이루는 외관은, 
                    전통을 지키면서도 세상을 향해 열려있는 만수교회의 비전을 보여줍니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 6: Bird's Eye View (new_church_3.jpg) */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0 overflow-hidden bg-stone-100">
              <motion.img 
                src="/images/new_church_3.jpg" 
                alt="교회 조감도"
                style={{ x: bgPanX, y: bgPanY }}
                className="absolute inset-0 w-[110%] h-[110%] object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute top-1/2 -translate-y-1/2 left-10 md:left-32 z-10 max-w-xl">
                <div className="bg-white/95 p-10 rounded-3xl backdrop-blur-md border border-stone-200 shadow-xl">
                  <Globe className="w-12 h-12 mb-4 text-blue-600" />
                  <h2 className="text-4xl font-bold text-stone-900 mb-6 tracking-tight">
                    만수동의 중심에서
                  </h2>
                  <p className="text-lg text-stone-700 font-light leading-relaxed">
                    교회 앞 넓은 광장은 성도들의 친교 공간이자 지역 주민들을 위한 쉼터입니다. 
                    지역 사회와 함께 호흡하며 선한 영향력을 끼치는 교회가 되겠습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 7: Mission & Future (church_ext2.jpg) */}
            <div className="w-[100vw] h-full relative flex items-center justify-center shrink-0 overflow-hidden">
              <motion.img 
                src="/images/church_ext2.jpg" 
                alt="세상을 향한 선교"
                className="absolute inset-0 w-full h-full object-cover object-center max-w-none"
              />
              <div className="absolute inset-0 bg-stone-900/70 pointer-events-none" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
                <motion.div
                  whileInView={{ opacity: [0, 1], y: [50, 0] }}
                  transition={{ duration: 1 }}
                  className="max-w-3xl"
                >
                  <img src="/images/logo2.png" alt="로고" className="h-20 mx-auto mb-8 brightness-0 invert opacity-100 drop-shadow-xl" />
                  <h2 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-lg">
                    빛과 소금의 역할로
                  </h2>
                  <p className="text-xl md:text-2xl text-stone-200 font-light mb-12 drop-shadow-lg leading-relaxed">
                    1만 사역자, 1만 가정 교회, 1만 선교사 파송의 비전을 가슴에 품고, <br/>
                    만수교회는 앞으로도 멈추지 않고 달려가겠습니다.
                  </p>
                  
                  <Link href="/">
                    <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 px-14 rounded-full shadow-2xl border border-white/20 transition-all duration-300 hover:scale-105 active:scale-95 text-xl">
                      메인으로 돌아가기
                    </button>
                  </Link>
                </motion.div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </main>
  );
}
