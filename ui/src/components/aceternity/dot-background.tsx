"use client"

import React from "react"
import { cn } from "./cn"

interface DotBackgroundProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  dotSize?: number
  dotSpacing?: number
  dotColor?: string
  fadeEdges?: boolean
  radialFade?: boolean
}

export function DotBackground({
  children,
  className,
  containerClassName,
  dotSize = 1,
  dotSpacing = 20,
  dotColor,
  fadeEdges = false,
  radialFade = false,
}: DotBackgroundProps) {
  const defaultDotColor = "var(--color-border)"
  const color = dotColor || defaultDotColor

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        containerClassName
      )}
    >
      {/* Dot pattern background */}
      <div
        className={cn(
          "absolute inset-0 -z-10",
          className
        )}
        style={{
          backgroundImage: `radial-gradient(circle, ${color} ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
        }}
      />

      {/* Radial fade mask */}
      {radialFade && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, var(--color-bg-primary) 70%)`,
          }}
        />
      )}

      {/* Edge fade mask */}
      {fadeEdges && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(to right, var(--color-bg-primary) 0%, transparent 10%, transparent 90%, var(--color-bg-primary) 100%),
                         linear-gradient(to bottom, var(--color-bg-primary) 0%, transparent 10%, transparent 90%, var(--color-bg-primary) 100%)`,
          }}
        />
      )}

      {/* Content */}
      {children}
    </div>
  )
}

export default DotBackground
