"use client"

import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "./cn"

type Direction = "top" | "bottom" | "left" | "right"

interface DirectionAwareHoverProps {
  children: React.ReactNode
  overlay?: React.ReactNode
  className?: string
  overlayClassName?: string
  imageClassName?: string
  childrenClassName?: string
  overlayColor?: string
  speed?: "slow" | "medium" | "fast"
}

const speedMap = {
  slow: 0.5,
  medium: 0.3,
  fast: 0.15,
}

export function DirectionAwareHover({
  children,
  overlay,
  className,
  overlayClassName,
  childrenClassName,
  overlayColor = "var(--color-bg-elevated)",
  speed = "medium",
}: DirectionAwareHoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState<Direction>("top")
  const [isHovered, setIsHovered] = useState(false)

  const getDirection = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return "top"

    const rect = ref.current.getBoundingClientRect()
    const { width, height, top, left } = rect

    const x = e.clientX - left
    const y = e.clientY - top

    // Calculate which edge the mouse entered from
    const topDistance = y
    const bottomDistance = height - y
    const leftDistance = x
    const rightDistance = width - x

    const min = Math.min(topDistance, bottomDistance, leftDistance, rightDistance)

    if (min === topDistance) return "top"
    if (min === bottomDistance) return "bottom"
    if (min === leftDistance) return "left"
    return "right"
  }, [])

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const dir = getDirection(e)
      setDirection(dir)
      setIsHovered(true)
    },
    [getDirection]
  )

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const dir = getDirection(e)
      setDirection(dir)
      setIsHovered(false)
    },
    [getDirection]
  )

  const getInitialPosition = () => {
    switch (direction) {
      case "top":
        return { y: "-100%", x: 0 }
      case "bottom":
        return { y: "100%", x: 0 }
      case "left":
        return { x: "-100%", y: 0 }
      case "right":
        return { x: "100%", y: 0 }
    }
  }

  const getExitPosition = () => {
    switch (direction) {
      case "top":
        return { y: "-100%", x: 0 }
      case "bottom":
        return { y: "100%", x: 0 }
      case "left":
        return { x: "-100%", y: 0 }
      case "right":
        return { x: "100%", y: 0 }
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-lg",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Base content */}
      <div className={cn("relative z-10", childrenClassName)}>{children}</div>

      {/* Direction-aware overlay */}
      <AnimatePresence>
        {isHovered && overlay && (
          <motion.div
            initial={getInitialPosition()}
            animate={{ x: 0, y: 0 }}
            exit={getExitPosition()}
            transition={{
              duration: speedMap[speed],
              ease: "easeOut",
            }}
            className={cn(
              "absolute inset-0 z-20 flex items-center justify-center",
              overlayClassName
            )}
            style={{ backgroundColor: overlayColor }}
          >
            {overlay}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simple direction indicator for debugging
interface DirectionIndicatorProps {
  className?: string
}

export function DirectionIndicator({ className }: DirectionIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState<Direction | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const topDist = y
    const bottomDist = rect.height - y
    const leftDist = x
    const rightDist = rect.width - x

    const min = Math.min(topDist, bottomDist, leftDist, rightDist)

    if (min === topDist) setDirection("top")
    else if (min === bottomDist) setDirection("bottom")
    else if (min === leftDist) setDirection("left")
    else setDirection("right")
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        "text-[var(--color-text-secondary)] text-sm",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setDirection(null)}
    >
      {direction ? `Direction: ${direction}` : "Hover to detect direction"}
    </div>
  )
}

// Directional reveal for text/content
interface DirectionalRevealProps {
  children: React.ReactNode
  className?: string
  direction?: Direction
  delay?: number
}

export function DirectionalReveal({
  children,
  className,
  direction = "left",
  delay = 0,
}: DirectionalRevealProps) {
  const getAnimation = () => {
    switch (direction) {
      case "top":
        return { initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 } }
      case "bottom":
        return { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } }
      case "left":
        return { initial: { x: -20, opacity: 0 }, animate: { x: 0, opacity: 1 } }
      case "right":
        return { initial: { x: 20, opacity: 0 }, animate: { x: 0, opacity: 1 } }
    }
  }

  const animation = getAnimation()

  return (
    <motion.div
      className={cn("relative", className)}
      initial={animation.initial}
      animate={animation.animate}
      transition={{
        duration: 0.4,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  )
}

export default DirectionAwareHover
