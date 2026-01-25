"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "./cn"

interface GlowEffectProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
  glowColor?: string
  glowSize?: "sm" | "md" | "lg" | "xl"
  glowOpacity?: number
  glowOnHover?: boolean
  glowOnActive?: boolean
  pulse?: boolean
  disabled?: boolean
}

const glowSizes = {
  sm: "10px",
  md: "20px",
  lg: "40px",
  xl: "60px",
}

export function GlowEffect({
  children,
  className,
  containerClassName,
  glowColor = "var(--color-accent-primary)",
  glowSize = "md",
  glowOpacity = 0.5,
  glowOnHover = true,
  glowOnActive = false,
  pulse = false,
  disabled = false,
}: GlowEffectProps) {
  const size = glowSizes[glowSize]

  return (
    <motion.div
      className={cn(
        "relative inline-block",
        containerClassName
      )}
      initial={false}
      whileHover={
        glowOnHover && !disabled
          ? { scale: 1.02 }
          : undefined
      }
      whileTap={
        glowOnActive && !disabled
          ? { scale: 0.98 }
          : undefined
      }
    >
      {/* Glow layer */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-[inherit] pointer-events-none",
          pulse && !disabled && "animate-pulse"
        )}
        initial={{ opacity: glowOnHover ? 0 : glowOpacity }}
        whileHover={
          glowOnHover && !disabled
            ? { opacity: glowOpacity }
            : undefined
        }
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: `0 0 ${size} ${glowColor}`,
          filter: `blur(${parseInt(size) / 4}px)`,
        }}
      />

      {/* Content */}
      <div className={cn("relative", className)}>{children}</div>
    </motion.div>
  )
}

// Standalone glow wrapper for any element
interface GlowWrapperProps {
  children: React.ReactNode
  className?: string
  color?: string
  size?: string
  blur?: string
  animate?: boolean
}

export function GlowWrapper({
  children,
  className,
  color = "var(--color-accent-primary)",
  size = "20px",
  blur = "8px",
  animate = false,
}: GlowWrapperProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute inset-0 rounded-[inherit] pointer-events-none -z-10",
          animate && "animate-glow"
        )}
        style={{
          boxShadow: `0 0 ${size} ${color}`,
          filter: `blur(${blur})`,
        }}
      />
      {children}
    </div>
  )
}

export default GlowEffect
