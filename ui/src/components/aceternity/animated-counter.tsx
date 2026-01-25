"use client"

import React, { useEffect, useRef } from "react"
import { motion, useSpring, useTransform, useInView } from "framer-motion"
import { cn } from "./cn"

interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  formatValue?: (value: number) => string
  animateOnView?: boolean
  springConfig?: {
    damping?: number
    stiffness?: number
    mass?: number
  }
}

export function AnimatedCounter({
  value,
  className,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
  formatValue,
  animateOnView = true,
  springConfig = { damping: 30, stiffness: 100, mass: 1 },
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  const spring = useSpring(0, {
    ...springConfig,
    duration: duration * 1000,
  })

  const display = useTransform(spring, (current) => {
    if (formatValue) {
      return formatValue(current)
    }
    return current.toFixed(decimals)
  })

  useEffect(() => {
    if (animateOnView) {
      if (isInView) {
        spring.set(value)
      }
    } else {
      spring.set(value)
    }
  }, [spring, value, isInView, animateOnView])

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

// Simple counting animation without spring physics
interface CountUpProps {
  from?: number
  to: number
  className?: string
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  onComplete?: () => void
}

export function CountUp({
  from = 0,
  to,
  className,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  onComplete,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const [count, setCount] = React.useState(from)

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased

      setCount(current)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        onComplete?.()
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [from, to, duration, isInView, onComplete])

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals)
    if (separator) {
      const parts = fixed.split(".")
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
      return parts.join(".")
    }
    return fixed
  }

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  )
}

export default AnimatedCounter
