"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  base: number; // base alpha
  tw: number; // twinkle phase
  spd: number; // twinkle speed
  drift: number; // parallax factor
}

interface StarfieldProps {
  density?: number; // stars per 10,000 px²
  drift?: number; // px/s horizontal drift
  className?: string;
}

/**
 * Slow, twinkling starfield on a canvas. Cheap enough to sit behind
 * everything; respects reduced motion by freezing drift and twinkle.
 */
export default function Starfield({
  density = 1.1,
  drift = 2.5,
  className = "",
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let stars: Star[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;
    let last = performance.now();

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(((width * height) / 10_000) * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() < 0.85 ? Math.random() * 0.9 + 0.3 : Math.random() * 1.6 + 0.8,
        base: Math.random() * 0.5 + 0.25,
        tw: Math.random() * Math.PI * 2,
        spd: Math.random() * 0.8 + 0.2,
        drift: Math.random() * 0.7 + 0.3,
      }));
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        if (!reduceMotion) {
          s.tw += dt * s.spd;
          s.x -= dt * drift * s.drift;
          if (s.x < -2) s.x = width + 2;
        }
        const alpha = s.base * (0.75 + 0.25 * Math.sin(s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 231, 255, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    seed();
    raf = requestAnimationFrame(frame);
    const onResize = () => seed();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density, drift]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}
