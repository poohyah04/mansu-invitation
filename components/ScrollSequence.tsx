"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";

interface ScrollSequenceProps {
  frameCount: number;
}

export default function ScrollSequence({ frameCount }: ScrollSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  
  // Track the scroll progress of our 400vh container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map 0 -> 1 scroll progress to 1 -> frameCount image index
  const frameIndex = useTransform(scrollYProgress, [0, 1], [1, frameCount]);

  // Derive a state to know when we've reached the end to show the "Buy Now" UI
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Preload images
    const loadedImages: HTMLImageElement[] = [];
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(4, "0");
      img.src = `/frames/frame_${paddedIndex}.jpg`;
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, [frameCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || images.length === 0) return;

    // Use a variable to track current index for resize redraws
    let currentIndex = 1;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render(currentIndex);
    };
    
    // Set initial size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const render = (index: number) => {
      // Bounds checking
      index = Math.max(1, Math.min(index, frameCount));
      const img = images[index - 1];
      if (img) {
        if (!img.complete) {
          img.onload = () => drawImageCover(ctx, img, canvas.width, canvas.height);
        } else {
          drawImageCover(ctx, img, canvas.width, canvas.height);
        }
      }
    };

    render(1);
    window.addEventListener("resize", updateCanvasSize);

    const unsubscribe = frameIndex.on("change", (latest) => {
      const index = Math.round(latest);
      currentIndex = index;
      render(index);
      
      // If we are at the very end of the sequence, show the buy now button
      if (index >= frameCount - 1 && !isFinished) {
        setIsFinished(true);
      } else if (index < frameCount - 1 && isFinished) {
        setIsFinished(false);
      }
    });

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      unsubscribe();
    };
  }, [images, frameIndex, frameCount, isFinished]);

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
    let renderW, renderH, x, y;

    if (imgRatio > canvasRatio) {
      renderH = h;
      renderW = h * imgRatio;
      x = (w - renderW) / 2;
      y = 0;
    } else {
      renderW = w;
      renderH = w / imgRatio;
      x = 0;
      y = (h - renderH) / 2;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, x, y, renderW, renderH);
  };

  return (
    <div ref={containerRef} className="h-[400vh] relative w-full bg-slate-950">
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        {/* Canvas that draws the current frame */}
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        
        {/* Overlay gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30 pointer-events-none" />

        {/* Scroll down indicator when not finished */}
        <AnimatePresence>
          {!isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-white/50"
            >
              <span className="text-sm uppercase tracking-widest mb-2">Scroll Down</span>
              <motion.div 
                animate={{ y: [0, 10, 0] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The interactive overlay that appears at the end */}
        <AnimatePresence>
          {isFinished && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-end pb-32"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center px-4"
              >
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
                  Revolutionary 3D
                </h1>
                <p className="text-xl text-slate-300 mb-8 max-w-lg mx-auto font-light drop-shadow">
                  Experience the next generation of product design. Unveil every detail in stunning 3D animation.
                </p>
                
                <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-sky-500 rounded-full hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 overflow-hidden shadow-[0_0_40px_rgba(14,165,233,0.5)]">
                  <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                  <ShoppingCart className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="relative">Buy Now</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
