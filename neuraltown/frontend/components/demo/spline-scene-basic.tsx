'use client'

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
 
export function SplineSceneBasic() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate rotation based on mouse position (centered at 50%, range -15 to +15 degrees)
  const rotateX = ((mousePosition.y - 50) / 50) * 15;
  const rotateY = ((mousePosition.x - 50) / 50) * 15;

  return (
    <Card className="w-full h-screen bg-black relative overflow-hidden border-none rounded-none">
      {/* Spline 3D Scene - Full Background with mouse tracking on robot */}
      <div 
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`,
        }}
      >
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </div>

      {/* Content Overlay - Centered */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div className="text-center space-y-6 px-8">
          <motion.h1 
            className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 via-neutral-200 to-neutral-400 drop-shadow-2xl"
            animate={{
              textShadow: [
                '0 0 20px rgba(255,255,255,0.3)',
                '0 0 40px rgba(255,255,255,0.5)',
                '0 0 20px rgba(255,255,255,0.3)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Simcity.AI
          </motion.h1>
          <p className="text-xl md:text-2xl text-neutral-300 max-w-2xl mx-auto drop-shadow-lg">
            Where AI Lives
          </p>
          
          <div className="pt-4 pointer-events-auto">
            <AnimatedButton href="/town">
              Enter Simcity.AI
            </AnimatedButton>
          </div>
        </div>
      </div>

      {/* Subtle Vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40 pointer-events-none z-10" />
    </Card>
  )
}
