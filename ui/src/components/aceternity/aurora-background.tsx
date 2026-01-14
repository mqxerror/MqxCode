"use client";
import { cn } from "./cn";
import React from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] transition-bg",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
            [--aurora:repeating-linear-gradient(100deg,var(--color-accent-primary)_10%,var(--color-accent-secondary)_15%,var(--color-accent-tertiary)_20%,var(--color-accent-secondary)_25%,var(--color-accent-primary)_30%)]
            [background-image:var(--aurora)]
            [background-size:300%_200%]
            [background-position:50%_50%]
            filter
            blur-[80px]
            after:content-[""]
            after:absolute
            after:inset-0
            after:[background-image:var(--aurora)]
            after:[background-size:200%_100%]
            after:animate-aurora
            after:[background-attachment:fixed]
            after:mix-blend-soft-light
            pointer-events-none
            absolute
            -inset-[10px]
            opacity-40
            will-change-transform
            `,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
          )}
        />
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
};

export default AuroraBackground;
