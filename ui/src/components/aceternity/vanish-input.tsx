"use client"

import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "./cn"

interface VanishInputProps {
  placeholder?: string
  placeholders?: string[]
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  className?: string
  inputClassName?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function VanishInput({
  placeholder = "Type something...",
  placeholders,
  value: controlledValue,
  onChange,
  onSubmit,
  className,
  inputClassName,
  disabled = false,
  autoFocus = false,
}: VanishInputProps) {
  const [internalValue, setInternalValue] = useState("")
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const [isVanishing, setIsVanishing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const value = controlledValue ?? internalValue
  const activePlaceholder = placeholders?.[currentPlaceholder] ?? placeholder

  // Cycle through placeholders
  React.useEffect(() => {
    if (!placeholders || placeholders.length <= 1) return

    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [placeholders])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      onChange?.(newValue)
    },
    [controlledValue, onChange]
  )

  const vanishText = useCallback(() => {
    if (!canvasRef.current || !inputRef.current || !value) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const inputRect = inputRef.current.getBoundingClientRect()
    canvas.width = inputRect.width
    canvas.height = inputRect.height

    // Draw the text
    ctx.font = getComputedStyle(inputRef.current).font
    ctx.fillStyle = "var(--color-text-primary)"
    ctx.textBaseline = "middle"
    ctx.fillText(value, 12, canvas.height / 2)

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    // Create particles from non-transparent pixels
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      alpha: number
      color: string
    }> = []

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const i = (y * canvas.width + x) * 4
        if (pixels[i + 3] > 128) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            alpha: 1,
            color: `rgba(${pixels[i]}, ${pixels[i + 1]}, ${pixels[i + 2]}, 1)`,
          })
        }
      }
    }

    // Animate particles
    let frame = 0
    const maxFrames = 30

    const animate = () => {
      if (frame >= maxFrames) {
        setIsVanishing(false)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.alpha -= 0.03

        if (p.alpha > 0) {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color
          ctx.fillRect(p.x, p.y, 2, 2)
        }
      })

      frame++
      requestAnimationFrame(animate)
    }

    setIsVanishing(true)
    animate()
  }, [value])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!value.trim() || disabled) return

      vanishText()
      onSubmit?.(value)

      // Clear input after vanish animation
      setTimeout(() => {
        if (controlledValue === undefined) {
          setInternalValue("")
        }
      }, 500)
    },
    [value, disabled, vanishText, onSubmit, controlledValue]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
    >
      {/* Hidden canvas for vanish effect */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 pointer-events-none z-10",
          !isVanishing && "hidden"
        )}
      />

      {/* Input container */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            "w-full px-4 py-3 rounded-lg",
            "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "focus:outline-none focus:border-[var(--color-accent-primary)]",
            "focus:ring-2 focus:ring-[var(--color-accent-primary)]/20",
            "transition-all duration-200",
            disabled && "opacity-50 cursor-not-allowed",
            isVanishing && "text-transparent",
            inputClassName
          )}
          placeholder=""
        />

        {/* Animated placeholder */}
        <AnimatePresence mode="wait">
          {!value && (
            <motion.span
              key={activePlaceholder}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            >
              {activePlaceholder}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}

export default VanishInput
