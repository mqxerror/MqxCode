"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "./cn"

interface LampProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  lampColor?: string
  lampWidth?: string
  animate?: boolean
}

export function Lamp({
  children,
  className,
  containerClassName,
  lampColor = "var(--color-accent-primary)",
  lampWidth = "300px",
  animate = true,
}: LampProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden",
        containerClassName
      )}
    >
      {/* Lamp container */}
      <div className="relative flex w-full flex-1 items-center justify-center">
        {/* Animated lamp effect */}
        <motion.div
          initial={animate ? { opacity: 0.5, width: "100px" } : false}
          animate={animate ? { opacity: 1, width: lampWidth } : undefined}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(from 90deg at 50% 50%, transparent 0deg, ${lampColor} 90deg, transparent 180deg)`,
          }}
          className="absolute top-0 h-48 w-[300px] -translate-y-1/2 opacity-50 blur-2xl"
        />

        {/* Lamp glow line */}
        <motion.div
          initial={animate ? { width: "100px", opacity: 0 } : false}
          animate={animate ? { width: lampWidth, opacity: 1 } : undefined}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute top-0 h-px -translate-y-1/2"
          style={{
            background: `linear-gradient(90deg, transparent, ${lampColor}, transparent)`,
          }}
        />

        {/* Central bright spot */}
        <motion.div
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: 1 } : undefined}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute top-0 h-24 w-24 -translate-y-1/2 rounded-full blur-xl"
          style={{
            background: `radial-gradient(circle, ${lampColor} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  )
}

// Compact lamp effect for headers
interface LampHeaderProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  glowIntensity?: "low" | "medium" | "high"
}

export function LampHeader({
  children,
  className,
  glowColor = "var(--color-accent-primary)",
  glowIntensity = "medium",
}: LampHeaderProps) {
  const intensityMap = {
    low: { blur: "10px", height: "20px", opacity: 0.3 },
    medium: { blur: "20px", height: "30px", opacity: 0.5 },
    high: { blur: "30px", height: "40px", opacity: 0.7 },
  }

  const { blur, height, opacity } = intensityMap[glowIntensity]

  return (
    <div className={cn("relative", className)}>
      {/* Lamp glow above */}
      <div
        className="absolute inset-x-0 -top-2 pointer-events-none"
        style={{
          height,
          background: `linear-gradient(180deg, ${glowColor} 0%, transparent 100%)`,
          filter: `blur(${blur})`,
          opacity,
        }}
      />

      {/* Lamp line */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${glowColor} 50%, transparent 100%)`,
          opacity: opacity + 0.2,
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

export default Lamp
