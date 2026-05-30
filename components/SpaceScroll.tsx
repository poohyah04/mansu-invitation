"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Telescope, Sparkles, Rocket, Globe, Satellite } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SpaceScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isWarping, setIsWarping] = useState(false);
  
  // Height increased to 1000vh for much slower scrolling and longer transitions
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Section 1: Orbit (0.0 - 0.2)
  const orbitScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.8]);
  const orbitOpacity = useTransform(scrollYProgress, [0.15, 0.25], [1, 0]);

  // Section 2: Close Up (0.2 - 0.4)
  const closeupScale = useTransform(scrollYProgress, [0.2, 0.4], [1.5, 1]);
  const closeupOpacity = useTransform(scrollYProgress, [0.15, 0.25, 0.35, 0.45], [0, 1, 1, 0]);

  // Section 3: Galaxy (0.4 - 0.6)
  const galaxyScale = useTransform(scrollYProgress, [0.4, 0.6], [1.5, 1]);
  const galaxyOpacity = useTransform(scrollYProgress, [0.35, 0.45, 0.55, 0.65], [0, 1, 1, 0]);

  // Section 4: Blackhole (0.6 - 0.8)
  const blackholeScale = useTransform(scrollYProgress, [0.6, 0.8], [1, 1.6]);
  const blackholeOpacity = useTransform(scrollYProgress, [0.55, 0.65, 0.75, 0.85], [0, 1, 1, 0]);

  // Section 5: Space Station (0.8 - 1.0)
  const stationScale = useTransform(scrollYProgress, [0.8, 1], [1.5, 1]);
  const stationOpacity = useTransform(scrollYProgress, [0.75, 0.85, 1], [0, 1, 1]);

  const handleWarp = () => {
    setIsWarping(true);
    // After the warp animation finishes, navigate to Mars
    setTimeout(() => {
      router.push("/mars");
    }, 1500); 
  };

  return (
    <>
      <div ref={containerRef} className="relative h-[1000vh] bg-black">
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
          
          {/* Section 1: Orbit */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            style={{ scale: orbitScale, opacity: orbitOpacity }}
          >
            <img src="/images/orbit.png" alt="Telescope Orbiting Earth" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <motion.div className="text-center mt-20">
                <Telescope className="w-16 h-16 mx-auto mb-6 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-4 drop-shadow-xl">
                  EYE OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">HUMANITY</span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-200 font-light max-w-2xl mx-auto px-4 drop-shadow-md">
                  Orbiting 1.5 million kilometers away. A technological marvel designed to pierce through the cosmic dust.
                </p>
              </motion.div>
            </div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 flex flex-col items-center">
              <span className="text-sm tracking-widest uppercase mb-2">Scroll Down</span>
              <motion.div 
                animate={{ y: [0, 10, 0] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"
              />
            </div>
          </motion.div>

          {/* Section 2: Close Up */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            style={{ scale: closeupScale, opacity: closeupOpacity }}
          >
            <img src="/images/closeup.png" alt="Telescope Mirror Close-up" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-32 left-10 md:left-32 text-white max-w-xl">
              <motion.div>
                <Sparkles className="w-12 h-12 mb-6 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-amber-50 drop-shadow-lg">
                  Golden Precision
                </h2>
                <p className="text-xl md:text-2xl text-amber-100/90 leading-relaxed font-light drop-shadow">
                  18 hexagonal mirror segments crafted with nanometer precision, coated in pure gold to perfectly capture the faint infrared light from the dawn of time.
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Section 3: Galaxy */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            style={{ scale: galaxyScale, opacity: galaxyOpacity }}
          >
            <img src="/images/galaxy.png" alt="Deep Space Galaxy" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <motion.div className="text-center bg-black/20 p-12 md:p-20 rounded-[3rem] backdrop-blur-lg border border-white/10 shadow-2xl">
                <Rocket className="w-16 h-16 mx-auto mb-8 text-fuchsia-400 drop-shadow-[0_0_15px_rgba(232,121,249,0.5)]" />
                <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight drop-shadow-xl">
                  Discover the <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600">Unknown</span>
                </h2>
                <p className="text-xl md:text-2xl text-slate-200 mb-6 max-w-xl mx-auto font-light drop-shadow">
                  Witness the birth of stars and the collision of galaxies in stunning hyper-realistic detail.
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Section 4: Blackhole */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            style={{ scale: blackholeScale, opacity: blackholeOpacity }}
          >
            <img src="/images/blackhole.png" alt="Supermassive Blackhole" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
            <div className="absolute top-1/4 right-10 md:right-32 text-white max-w-lg text-right">
              <motion.div>
                <Globe className="w-12 h-12 ml-auto mb-6 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-rose-50 drop-shadow-lg">
                  Absolute Gravity
                </h2>
                <p className="text-xl md:text-2xl text-rose-100/90 leading-relaxed font-light drop-shadow">
                  Journey to the edge of the event horizon. A supermassive black hole bending light, space, and time itself.
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Section 5: Space Station */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            style={{ scale: stationScale, opacity: stationOpacity }}
          >
            <img src="/images/spacestation.png" alt="Futuristic Space Station" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <motion.div className="text-center bg-indigo-950/40 p-12 md:p-20 rounded-[3rem] backdrop-blur-md border border-indigo-500/20 shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                <Satellite className="w-16 h-16 mx-auto mb-8 text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
                <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight drop-shadow-xl">
                  The Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Frontier</span>
                </h2>
                <p className="text-xl md:text-2xl text-indigo-100 mb-12 max-w-xl mx-auto font-light drop-shadow">
                  Humanity's ultimate outpost. Prepare to launch your vision into the cosmos with our cutting-edge technology.
                </p>
                
                <button 
                  onClick={handleWarp}
                  className="group relative inline-flex items-center justify-center px-12 py-5 font-bold text-white transition-all duration-300 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-black overflow-hidden shadow-[0_0_40px_rgba(79,70,229,0.6)]"
                >
                  <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none"></span>
                  <span className="relative text-lg md:text-xl">Warp to Mars</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Warp Animation Overlay */}
      <AnimatePresence>
        {isWarping && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 150, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeIn" }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-600 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="fixed inset-0 bg-white z-[110]"
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
