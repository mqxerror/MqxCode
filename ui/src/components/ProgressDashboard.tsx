import { WifiOff, CheckCircle, Clock, TrendingUp } from 'lucide-react'

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Main Progress Card - spans 2 columns */}
      <div className="md:col-span-2 card p-6 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--color-accent-primary)]" />
            <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
              Progress
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]"></span>
                </span>
                <span className="text-sm text-[var(--color-success)] font-medium">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <WifiOff size={14} className="text-[var(--color-danger)]" />
                <span className="text-sm text-[var(--color-danger)]">Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Large Percentage */}
        <div className="text-center mb-6">
          <span className="font-display text-6xl font-bold gradient-text">
            {percentage.toFixed(1)}
          </span>
          <span className="font-display text-2xl font-bold text-[var(--color-text-tertiary)]">
            %
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))',
              boxShadow: percentage > 0 ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none'
            }}
          />
        </div>

        <div className="flex justify-between text-sm text-[var(--color-text-tertiary)]">
          <span>{passing} completed</span>
          <span>{total} total</span>
        </div>
      </div>

      {/* Completed Stats Card */}
      <div className="card p-5 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-shadow duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Completed
          </span>
          <span className="p-2 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)]">
            <CheckCircle size={18} />
          </span>
        </div>
        <span className="text-3xl font-bold font-display text-[var(--color-success)]">
          {passing}
        </span>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          features done
        </p>
      </div>

      {/* Pending Stats Card */}
      <div className="card p-5 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-shadow duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Pending
          </span>
          <span className="p-2 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
            <Clock size={18} />
          </span>
        </div>
        <span className="text-3xl font-bold font-display text-[var(--color-warning)]">
          {pending}
        </span>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          remaining
        </p>
      </div>
    </div>
  )
}
