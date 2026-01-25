"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "./cn"
import { Check, Loader2, X, AlertCircle } from "lucide-react"

type ButtonState = "idle" | "loading" | "success" | "error"

interface StatefulButtonProps {
  children: React.ReactNode
  state?: ButtonState
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loadingText?: string
  successText?: string
  errorText?: string
  showIcon?: boolean
  resetDelay?: number
  onStateChange?: (state: ButtonState) => void
}

const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
}

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
}

export function StatefulButton({
  children,
  state = "idle",
  onClick,
  disabled = false,
  className,
  variant = "primary",
  size = "md",
  loadingText,
  successText,
  errorText,
  showIcon = true,
  resetDelay = 2000,
  onStateChange,
}: StatefulButtonProps) {
  const [internalState, setInternalState] = React.useState<ButtonState>(state)

  // Sync with external state
  React.useEffect(() => {
    setInternalState(state)
  }, [state])

  // Auto-reset to idle after success/error
  React.useEffect(() => {
    if (internalState === "success" || internalState === "error") {
      const timer = setTimeout(() => {
        setInternalState("idle")
        onStateChange?.("idle")
      }, resetDelay)
      return () => clearTimeout(timer)
    }
  }, [internalState, resetDelay, onStateChange])

  const isDisabled = disabled || internalState === "loading"

  const getContent = () => {
    switch (internalState) {
      case "loading":
        return loadingText || children
      case "success":
        return successText || "Success!"
      case "error":
        return errorText || "Error"
      default:
        return children
    }
  }

  const getIcon = () => {
    switch (internalState) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "success":
        return <Check className="h-4 w-4" />
      case "error":
        return <X className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStateStyles = () => {
    switch (internalState) {
      case "success":
        return "!bg-[var(--color-success)] !border-[var(--color-success)]"
      case "error":
        return "!bg-[var(--color-danger)] !border-[var(--color-danger)]"
      default:
        return ""
    }
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "btn relative overflow-hidden",
        variants[variant],
        sizes[size],
        getStateStyles(),
        isDisabled && "opacity-70 cursor-not-allowed",
        className
      )}
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={internalState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center gap-2"
        >
          {showIcon && getIcon()}
          {getContent()}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

// Simpler loading button
interface LoadingButtonProps {
  children: React.ReactNode
  isLoading?: boolean
  loadingText?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

export function LoadingButton({
  children,
  isLoading = false,
  loadingText,
  onClick,
  disabled = false,
  className,
  variant = "primary",
  size = "md",
}: LoadingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "btn",
        variants[variant],
        sizes[size],
        (disabled || isLoading) && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      <span className="flex items-center justify-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading && loadingText ? loadingText : children}
      </span>
    </button>
  )
}

// Icon-only stateful button
interface IconButtonProps {
  icon: React.ReactNode
  state?: ButtonState
  loadingIcon?: React.ReactNode
  successIcon?: React.ReactNode
  errorIcon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
  tooltip?: string
}

const iconSizes = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-3",
}

export function IconButton({
  icon,
  state = "idle",
  loadingIcon,
  successIcon,
  errorIcon,
  onClick,
  disabled = false,
  className,
  size = "md",
  tooltip,
}: IconButtonProps) {
  const getIcon = () => {
    switch (state) {
      case "loading":
        return loadingIcon || <Loader2 className="h-4 w-4 animate-spin" />
      case "success":
        return successIcon || <Check className="h-4 w-4 text-[var(--color-success)]" />
      case "error":
        return errorIcon || <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
      default:
        return icon
    }
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "loading"}
      title={tooltip}
      className={cn(
        "btn-icon btn-ghost rounded-lg",
        iconSizes[size],
        (disabled || state === "loading") && "opacity-50 cursor-not-allowed",
        className
      )}
      whileHover={!(disabled || state === "loading") ? { scale: 1.1 } : undefined}
      whileTap={!(disabled || state === "loading") ? { scale: 0.9 } : undefined}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          {getIcon()}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export default StatefulButton
