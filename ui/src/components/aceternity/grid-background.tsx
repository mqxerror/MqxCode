"use client"

import React from "react"
import { cn } from "./cn"

interface GridBackgroundProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  gridSize?: number
  strokeWidth?: number
  strokeColor?: string
  fadeEdges?: boolean
  radialFade?: boolean
  showSmallGrid?: boolean
  smallGridSize?: number
}

export function GridBackground({
  children,
  className,
  containerClassName,
  gridSize = 40,
  strokeWidth = 1,
  strokeColor,
  fadeEdges = false,
  radialFade = false,
  showSmallGrid = false,
  smallGridSize = 8,
}: GridBackgroundProps) {
  const defaultStrokeColor = "var(--color-border)"
  const color = strokeColor || defaultStrokeColor

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        containerClassName
      )}
    >
      {/* Main grid pattern */}
      <svg
        className={cn(
          "absolute inset-0 -z-10 h-full w-full",
          className
        )}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Small grid pattern */}
          {showSmallGrid && (
            <pattern
              id="smallGrid"
              width={smallGridSize}
              height={smallGridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${smallGridSize} 0 L 0 0 0 ${smallGridSize}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth * 0.5}
                strokeOpacity={0.3}
              />
            </pattern>
          )}

          {/* Main grid pattern */}
          <pattern
            id="mainGrid"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            {showSmallGrid && (
              <rect width={gridSize} height={gridSize} fill="url(#smallGrid)" />
            )}
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={0.5}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mainGrid)" />
      </svg>

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
            background: `linear-gradient(to right, var(--color-bg-primary) 0%, transparent 15%, transparent 85%, var(--color-bg-primary) 100%),
                         linear-gradient(to bottom, var(--color-bg-primary) 0%, transparent 15%, transparent 85%, var(--color-bg-primary) 100%)`,
          }}
        />
      )}

      {/* Content */}
      {children}
    </div>
  )
}

export default GridBackground
