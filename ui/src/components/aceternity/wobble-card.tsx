"use client"

import React, { useState, useRef } from "react"
import { motion, useSpring } from "framer-motion"
import { cn } from "./cn"

interface WobbleCardProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
  wobbleIntensity?: number
  springConfig?: {
    stiffness?: number
    damping?: number
    mass?: number
  }
}

export function WobbleCard({
  children,
  className,
  containerClassName,
  wobbleIntensity = 10,
  springConfig = { stiffness: 400, damping: 30, mass: 1 },
}: WobbleCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const rotateX = useSpring(0, springConfig)
  const rotateY = useSpring(0, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    // Normalize to -1 to 1 range
    const normalizedX = mouseX / (rect.width / 2)
    const normalizedY = mouseY / (rect.height / 2)

    // Apply wobble rotation (inverted for natural feel)
    rotateX.set(-normalizedY * wobbleIntensity)
    rotateY.set(normalizedX * wobbleIntensity)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <div
      ref={ref}
      className={cn("relative", containerClassName)}
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className={cn(
          "relative transition-shadow duration-300",
          isHovered && "shadow-xl",
          className
        )}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Simpler wobble effect without 3D transforms
interface WobbleWrapperProps {
  children: React.ReactNode
  className?: string
  wobbleAmount?: number
}

export function WobbleWrapper({
  children,
  className,
  wobbleAmount = 3,
}: WobbleWrapperProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY

    // Normalize and apply wobble
    const x = (mouseX / (rect.width / 2)) * wobbleAmount
    const y = (mouseY / (rect.height / 2)) * wobbleAmount

    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  )
}

// Continuous wobble animation (no mouse interaction)
interface AutoWobbleProps {
  children: React.ReactNode
  className?: string
  intensity?: number
  duration?: number
}

export function AutoWobble({
  children,
  className,
  intensity = 2,
  duration = 4,
}: AutoWobbleProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={{
        rotate: [0, intensity, -intensity, intensity, 0],
        scale: [1, 1.01, 0.99, 1.01, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  )
}

export default WobbleCard
