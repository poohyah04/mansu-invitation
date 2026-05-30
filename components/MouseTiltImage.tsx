"use client";

import { useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function MouseTiltImage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for raw mouse positions (0 to 1)
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);

  // Smooth them with springs for a fluid 3D feel
  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const smoothX = useSpring(0.5, springConfig);
  const smoothY = useSpring(0.5, springConfig);

  // Map mouse positions to rotation degrees
  const rotateX = useTransform(smoothY, [0, 1], [15, -15]); // up/down affects X axis
  const rotateY = useTransform(smoothX, [0, 1], [-15, 15]); // left/right affects Y axis

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    smoothX.set(x);
    smoothY.set(y);
  };

  const handleMouseLeave = () => {
    smoothX.set(0.5);
    smoothY.set(0.5);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-5xl mx-auto aspect-video [perspective:1200px] flex items-center justify-center p-4 md:p-8 cursor-crosshair"
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
        className="relative w-full h-full rounded-3xl shadow-2xl border border-stone-200"
      >
        {/* Background Image pushed back slightly */}
        <div 
          className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-white"
          style={{ transform: "translateZ(-20px)" }}
        >
          <img 
            src="/images/church_ext1.jpg" 
            alt="만수교회 3D 인터랙티브" 
            className="w-full h-full object-cover scale-105"
          />
          {/* Subtle overlay for contrast */}
          <div className="absolute inset-0 bg-stone-900/20" />
        </div>
        
        {/* Floating text element popping out in Z-axis */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ transform: "translateZ(80px)" }}
        >
          <div className="bg-white/95 backdrop-blur-md px-10 py-6 rounded-2xl border border-stone-200 text-center shadow-xl">
            <h3 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-2">
              만수교회에 오신 것을 <span className="text-blue-600">환영합니다</span>
            </h3>
            <p className="text-stone-600 font-light tracking-wide">사랑과 섬김이 넘치는 신앙 공동체</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
