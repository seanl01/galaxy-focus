"use client";

import { useEffect, useRef } from "react";

interface Streak {
  angle: number;
  dist: number; // distance from centre, 0..1 of max radius
  speed: number;
  hue: number;
  size: number;
}

interface HyperspaceProps {
  /** 0 = drifting stars, 1 = full hyperspace streaks. Interpolated smoothly. */
  warp: number;
  className?: string;
}

/**
 * The classic radial hyperspace tunnel, rendered on canvas. `warp` eases
 * internally so phase changes (jump, cruise, arrival) crossfade gracefully.
 */
export default function Hyperspace({ warp, className = "" }: HyperspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const warpRef = useRef(warp);
  warpRef.current = warp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let last = performance.now();
    let current = warpRef.current; // eased warp
    let streaks: Streak[] = [];

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(430, (width * height) / 3600));
      streaks = Array.from({ length: count }, () => spawn(Math.random()));
    };

    const spawn = (dist: number): Streak => ({
      angle: Math.random() * Math.PI * 2,
      dist,
      speed: Math.random() * 0.5 + 0.5,
      hue: 205 + Math.random() * 30,
      size: Math.random() * 1.3 + 0.4,
    });

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Ease toward the requested warp level.
      current += (warpRef.current - current) * Math.min(1, dt * 1.6);
      const w = Math.max(0, Math.min(1, current));

      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(cx, cy);

      // Trail fade — deeper warp leaves longer trails, but keep enough
      // fade that the tunnel stays deep blue instead of washing to white.
      ctx.fillStyle = `rgba(4, 6, 15, ${0.5 - w * 0.12})`;
      ctx.fillRect(0, 0, width, height);

      const speedBase = reduceMotion ? 0.02 : 0.02 + w * w * 1.35;

      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        const prev = s.dist;
        s.dist += dt * speedBase * s.speed * (0.15 + s.dist);
        if (s.dist > 1.05) {
          streaks[i] = spawn(Math.random() * 0.15);
          continue;
        }

        const ease = (d: number) => d * d; // accelerate outward
        const r0 = ease(prev) * maxR;
        const r1 = ease(s.dist) * maxR;
        const x0 = cx + Math.cos(s.angle) * r0;
        const y0 = cy + Math.sin(s.angle) * r0;
        const x1 = cx + Math.cos(s.angle) * r1;
        const y1 = cy + Math.sin(s.angle) * r1;

        const alpha = 0.25 + s.dist * 0.65;
        const light = 72 + w * 14;

        if (w < 0.08 || reduceMotion) {
          ctx.beginPath();
          ctx.arc(x1, y1, s.size * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue}, 60%, ${light}%, ${alpha * 0.8})`;
          ctx.fill();
        } else {
          // Stretch streaks with warp.
          const stretch = 1 + w * 9 * s.dist;
          const dx = x1 - x0;
          const dy = y1 - y0;
          ctx.beginPath();
          ctx.moveTo(x1 - dx * stretch, y1 - dy * stretch);
          ctx.lineTo(x1, y1);
          ctx.lineWidth = s.size * (0.6 + s.dist * 1.4);
          ctx.strokeStyle = `hsla(${s.hue}, 85%, ${light}%, ${alpha})`;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // Soft core glow at full warp.
      if (w > 0.2) {
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.5);
        glow.addColorStop(0, `rgba(140, 180, 255, ${0.14 * w})`);
        glow.addColorStop(1, "rgba(140, 180, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      raf = requestAnimationFrame(frame);
    };

    seed();
    ctx.fillStyle = "#04060f";
    ctx.fillRect(0, 0, width, height);
    raf = requestAnimationFrame(frame);

    const onResize = () => seed();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}
