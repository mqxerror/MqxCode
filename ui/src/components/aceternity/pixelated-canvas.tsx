"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "./cn";

interface PixelatedCanvasProps {
  src: string;
  width?: number;
  height?: number;
  pixelSize?: number;
  className?: string;
  containerClassName?: string;
  distortionRadius?: number;
  distortionStrength?: number;
  animateOnHover?: boolean;
  grayscale?: boolean;
}

export const PixelatedCanvas: React.FC<PixelatedCanvasProps> = ({
  src,
  width = 400,
  height = 400,
  pixelSize = 8,
  className,
  containerClassName,
  distortionRadius = 60,
  distortionStrength = 15,
  animateOnHover = true,
  grayscale = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setIsLoaded(true);
    };
    img.onerror = () => {
      console.error("Failed to load image:", src);
    };
    img.src = src;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [src]);

  // Draw pixelated image with distortion
  const drawPixelated = useCallback(
    (mx: number, my: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const img = imageRef.current;

      if (!canvas || !ctx || !img) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Create offscreen canvas for original image
      const offCanvas = document.createElement("canvas");
      offCanvas.width = width;
      offCanvas.height = height;
      const offCtx = offCanvas.getContext("2d");
      if (!offCtx) return;

      // Draw original image scaled to fit
      const scale = Math.min(width / img.width, height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;

      offCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Get image data
      const imageData = offCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Draw pixelated version with distortion
      for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
          // Calculate distance from mouse
          const dx = x + pixelSize / 2 - mx;
          const dy = y + pixelSize / 2 - my;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Apply distortion based on distance
          let offsetXPixel = 0;
          let offsetYPixel = 0;

          if (animateOnHover && isHovering && distance < distortionRadius) {
            const force = (1 - distance / distortionRadius) * distortionStrength;
            const angle = Math.atan2(dy, dx);
            offsetXPixel = Math.cos(angle) * force;
            offsetYPixel = Math.sin(angle) * force;
          }

          // Sample color from distorted position
          const sampleX = Math.min(
            width - 1,
            Math.max(0, Math.floor(x - offsetXPixel))
          );
          const sampleY = Math.min(
            height - 1,
            Math.max(0, Math.floor(y - offsetYPixel))
          );

          const pixelIndex = (sampleY * width + sampleX) * 4;

          let r = data[pixelIndex];
          let g = data[pixelIndex + 1];
          let b = data[pixelIndex + 2];
          const a = data[pixelIndex + 3];

          // Apply grayscale if enabled
          if (grayscale) {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            r = gray;
            g = gray;
            b = gray;
          }

          if (a > 0) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;

            // Add slight size variation based on distance for more organic feel
            let currentPixelSize = pixelSize;
            if (animateOnHover && isHovering && distance < distortionRadius) {
              const sizeMultiplier = 1 + (1 - distance / distortionRadius) * 0.3;
              currentPixelSize = pixelSize * sizeMultiplier;
            }

            // Draw rounded pixel for smoother look
            const cornerRadius = currentPixelSize * 0.2;
            ctx.beginPath();
            ctx.roundRect(
              x + (pixelSize - currentPixelSize) / 2,
              y + (pixelSize - currentPixelSize) / 2,
              currentPixelSize - 1,
              currentPixelSize - 1,
              cornerRadius
            );
            ctx.fill();
          }
        }
      }
    },
    [
      width,
      height,
      pixelSize,
      distortionRadius,
      distortionStrength,
      animateOnHover,
      isHovering,
      grayscale,
    ]
  );

  // Animation loop
  useEffect(() => {
    if (!isLoaded) return;

    const animate = () => {
      drawPixelated(smoothMouseX.get(), smoothMouseY.get());
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLoaded, drawPixelated, smoothMouseX, smoothMouseY]);

  // Handle mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    mouseX.set(width / 2);
    mouseY.set(height / 2);
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden cursor-pointer",
        containerClassName
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn("block", className)}
      />
      {!isLoaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-neutral-900/50"
          style={{ width, height }}
        >
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
};

export default PixelatedCanvas;
