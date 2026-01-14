"use client";
import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { cn } from "./cn";

export const MovingBorder: React.FC<{
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: React.ElementType;
  [key: string]: unknown;
}> = ({
  children,
  duration = 2000,
  rx = "30%",
  ry = "30%",
  className,
  containerClassName,
  borderClassName,
  as: Component = "div",
  ...otherProps
}) => {
  const pathRef = useRef<SVGRectElement>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).x
  );
  const y = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).y
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <Component
      className={cn(
        "relative h-fit w-fit bg-transparent p-[1px] overflow-hidden",
        containerClassName
      )}
      {...otherProps}
    >
      <div className="absolute inset-0" style={{ borderRadius: "inherit" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect
            fill="none"
            width="100%"
            height="100%"
            rx={rx}
            ry={ry}
            ref={pathRef}
          />
        </svg>
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "inline-block",
            transform,
          }}
        >
          <div
            className={cn(
              "h-20 w-20 opacity-[0.8] bg-[radial-gradient(var(--color-accent-primary)_40%,transparent_60%)]",
              borderClassName
            )}
          />
        </motion.div>
      </div>
      <div
        className={cn(
          "relative z-10 bg-[var(--color-bg-card)] border border-transparent backdrop-blur-xl",
          className
        )}
        style={{ borderRadius: "inherit" }}
      >
        {children}
      </div>
    </Component>
  );
};

export const Button: React.FC<{
  children: React.ReactNode;
  borderRadius?: string;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  [key: string]: unknown;
}> = ({
  children,
  borderRadius = "1rem",
  className,
  containerClassName,
  borderClassName,
  duration,
  ...otherProps
}) => {
  return (
    <MovingBorder
      as="button"
      containerClassName={cn("p-[1px] rounded-xl", containerClassName)}
      className={cn(
        "px-4 py-2 rounded-xl font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-card)]",
        className
      )}
      borderClassName={borderClassName}
      duration={duration}
      rx={borderRadius}
      ry={borderRadius}
      {...otherProps}
    >
      {children}
    </MovingBorder>
  );
};

export default MovingBorder;
