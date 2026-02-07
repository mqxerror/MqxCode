import { WifiOff, Zap, Target, TrendingUp } from 'lucide-react'
import { cn } from './aceternity/cn'

interface ProgressDashboardProps {
  passing: number
  total: number
  percentage: number
  isConnected: boolean
}

export function ProgressDashboard({
  passing,
  total,
  percentage,
  isConnected,
}: ProgressDashboardProps) {
  const pending = total - passing
  const isComplete = total > 0 && passing === total

  return (
    <div className="card p-6 relative overflow-hidden">
      {/* Background glow effect when near completion */}
      {percentage > 80 && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: isComplete
              ? 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%)'
          }}
        />
      )}

      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        {/* Main Progress Section - Prominent Percentage */}
        <div className="flex-1 flex items-center gap-6">
          {/* Large Percentage Circle */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center",
                "bg-[var(--color-bg-tertiary)] border-4",
                isComplete
                  ? "border-[var(--color-success)]"
                  : "border-[var(--color-accent-primary)]"
              )}
              style={{
                boxShadow: isComplete
                  ? '0 0 30px rgba(16, 185, 129, 0.3)'
                  : percentage > 0 ? '0 0 30px rgba(99, 102, 241, 0.2)' : 'none'
              }}
            >
              <div className="text-center">
                <span
                  className={cn(
                    "font-display text-3xl font-bold",
                    isComplete ? "text-[var(--color-success)]" : "gradient-text"
                  )}
                >
                  {percentage.toFixed(0)}
                </span>
                <span className="text-lg font-bold text-[var(--color-text-tertiary)]">%</span>
              </div>
            </div>
            {/* Animated ring for in-progress */}
            {!isComplete && percentage > 0 && (
              <svg className="absolute inset-0 w-28 h-28 -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="var(--color-accent-primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(percentage / 100) * 327} 327`}
                  className="opacity-50"
                />
              </svg>
            )}
          </div>

          {/* Progress Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={18} className="text-[var(--color-accent-primary)]" />
              <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
                Feature Progress
              </h2>
              {/* Connection Status */}
              {isConnected ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-medium">
                  <WifiOff size={12} />
                  Offline
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="relative h-2.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden mb-3">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  background: isComplete
                    ? 'var(--color-success)'
                    : 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))',
                  boxShadow: percentage > 0
                    ? isComplete
                      ? '0 0 15px rgba(16, 185, 129, 0.5)'
                      : '0 0 15px rgba(99, 102, 241, 0.4)'
                    : 'none'
                }}
              />
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-text-primary)]">{passing}</span>
                <span className="text-[var(--color-text-tertiary)]"> / {total}</span>
                <span className="ml-1">completed</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards - Compact Row */}
        <div className="flex gap-3 md:gap-4">
          {/* Completed */}
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl",
              "bg-[var(--color-success)]/5 border border-[var(--color-success)]/20"
            )}
          >
            <div className="p-2 rounded-lg bg-[var(--color-success)]/10">
              <Target size={18} className="text-[var(--color-success)]" />
            </div>
            <div>
              <span className="text-2xl font-bold font-display text-[var(--color-success)]">
                {passing}
              </span>
              <p className="text-xs text-[var(--color-text-tertiary)]">Done</p>
            </div>
          </div>

          {/* Pending */}
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl",
              "bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20"
            )}
          >
            <div className="p-2 rounded-lg bg-[var(--color-warning)]/10">
              <Zap size={18} className="text-[var(--color-warning)]" />
            </div>
            <div>
              <span className="text-2xl font-bold font-display text-[var(--color-warning)]">
                {pending}
              </span>
              <p className="text-xs text-[var(--color-text-tertiary)]">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
