"use client";
import { cn } from "./cn";
import React from "react";

export const BentoGrid: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem: React.FC<{
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ className, title, description, header, icon, children }) => {
  return (
    <div
      className={cn(
        "group/bento row-span-1 rounded-xl p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] transition-all duration-300 hover:border-[var(--color-border-light)] hover:shadow-lg",
        className
      )}
    >
      {header}
      <div className="transition duration-200">
        {icon}
        {title && (
          <div className="font-display font-bold text-[var(--color-text-primary)] mb-2 mt-2">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {description}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

// Stats Card for dashboard
export const StatsCard: React.FC<{
  className?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accentColor?: string;
}> = ({
  className,
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  accentColor = "var(--color-accent-primary)",
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 bg-[var(--color-bg-card)] border border-[var(--color-border)] transition-all duration-300 hover:border-[var(--color-border-light)] hover:shadow-lg group",
        className
      )}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentColor}15, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {title}
          </span>
          {icon && (
            <span
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              {icon}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className="text-3xl font-bold font-display"
            style={{ color: accentColor }}
          >
            {value}
          </span>
          {trendValue && (
            <span
              className={cn(
                "text-sm font-medium",
                trend === "up" && "text-[var(--color-success)]",
                trend === "down" && "text-[var(--color-danger)]",
                trend === "neutral" && "text-[var(--color-text-secondary)]"
              )}
            >
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trendValue}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default BentoGrid;
