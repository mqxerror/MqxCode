"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "./cn"

interface FocusCardProps {
  children: React.ReactNode
  className?: string
  index: number
  hoveredIndex: number | null
  setHoveredIndex: (index: number | null) => void
}

export function FocusCard({
  children,
  className,
  index,
  hoveredIndex,
  setHoveredIndex,
}: FocusCardProps) {
  const isHovered = hoveredIndex === index
  const isAnyHovered = hoveredIndex !== null

  return (
    <motion.div
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-300",
        className
      )}
      onMouseEnter={() => setHoveredIndex(index)}
      onMouseLeave={() => setHoveredIndex(null)}
      animate={{
        scale: isHovered ? 1.02 : isAnyHovered ? 0.98 : 1,
        opacity: isAnyHovered && !isHovered ? 0.7 : 1,
        filter: isAnyHovered && !isHovered ? "blur(2px)" : "blur(0px)",
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  )
}

interface FocusCardsProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
}

export function FocusCards({
  children,
  className,
  containerClassName,
}: FocusCardsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Clone children and pass hover state
  const cards = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<FocusCardProps>, {
        index,
        hoveredIndex,
        setHoveredIndex,
      })
    }
    return child
  })

  return (
    <div className={cn("relative", containerClassName)}>
      <div className={cn("grid gap-4", className)}>{cards}</div>
    </div>
  )
}

// Standalone focus card grid with built-in cards
interface FocusCardGridProps<T> {
  items: T[]
  renderCard: (item: T, index: number, isHovered: boolean, isBlurred: boolean) => React.ReactNode
  className?: string
  cardClassName?: string
  columns?: 1 | 2 | 3 | 4
}

export function FocusCardGrid<T>({
  items,
  renderCard,
  className,
  cardClassName,
  columns = 3,
}: FocusCardGridProps<T>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {items.map((item, index) => {
        const isHovered = hoveredIndex === index
        const isAnyHovered = hoveredIndex !== null
        const isBlurred = isAnyHovered && !isHovered

        return (
          <motion.div
            key={index}
            className={cn(
              "relative rounded-xl overflow-hidden cursor-pointer",
              cardClassName
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            animate={{
              scale: isHovered ? 1.03 : isBlurred ? 0.97 : 1,
              opacity: isBlurred ? 0.6 : 1,
              filter: isBlurred ? "blur(3px)" : "blur(0px)",
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            {renderCard(item, index, isHovered, isBlurred)}
          </motion.div>
        )
      })}
    </div>
  )
}

// Simple focus wrapper for any content
interface FocusWrapperProps {
  children: React.ReactNode
  className?: string
  scaleOnFocus?: number
  scaleOnBlur?: number
  blurAmount?: string
  opacityOnBlur?: number
}

export function FocusWrapper({
  children,
  className,
  scaleOnFocus = 1.03,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scaleOnBlur: _scaleOnBlur = 0.97,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  blurAmount: _blurAmount = "3px",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opacityOnBlur: _opacityOnBlur = 0.6,
}: FocusWrapperProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? scaleOnFocus : 1,
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  )
}

export default FocusCards
