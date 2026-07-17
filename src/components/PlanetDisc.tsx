"use client";

import { Planet } from "@/lib/data";
import { useId } from "react";

interface PlanetDiscProps {
  planet: Planet;
  size?: number; // px
  className?: string;
  glow?: boolean;
}

/**
 * Procedural planet rendering — layered SVG gradients give each world a lit
 * hemisphere, banding by kind, an atmosphere rim and a soft glow. No image
 * assets required.
 */
export default function PlanetDisc({
  planet,
  size = 160,
  className = "",
  glow = true,
}: PlanetDiscProps) {
  const uid = useId().replace(/[:]/g, "");
  const [hi, mid, lo] = planet.colors;

  const bandOpacity =
    planet.kind === "gas" || planet.kind === "storm"
      ? 0.5
      : planet.kind === "desert" || planet.kind === "lava"
        ? 0.3
        : 0.18;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={planet.name}
      style={
        glow
          ? { filter: `drop-shadow(0 0 ${size / 9}px ${mid}66)` }
          : undefined
      }
    >
      <defs>
        <radialGradient id={`${uid}-surf`} cx="35%" cy="32%" r="80%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="45%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
        <linearGradient id={`${uid}-bands`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hi} stopOpacity="0" />
          <stop offset="30%" stopColor={lo} stopOpacity={bandOpacity} />
          <stop offset="42%" stopColor={hi} stopOpacity="0" />
          <stop offset="58%" stopColor={lo} stopOpacity={bandOpacity * 0.9} />
          <stop offset="72%" stopColor={hi} stopOpacity="0" />
          <stop offset="88%" stopColor={lo} stopOpacity={bandOpacity} />
          <stop offset="100%" stopColor={hi} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-shade`} cx="70%" cy="72%" r="90%">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="55%" stopColor="#000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
        </radialGradient>
        <radialGradient id={`${uid}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor={hi} stopOpacity="0" />
          <stop offset="96%" stopColor={hi} stopOpacity="0.35" />
          <stop offset="100%" stopColor={hi} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="46" fill={`url(#${uid}-surf)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={`url(#${uid}-bands)`}
          transform="rotate(-12 50 50)"
        />
        {planet.kind === "city" && (
          <g fill={hi} opacity="0.8">
            {CITY_LIGHTS.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
        )}
        {planet.kind === "ice" && (
          <ellipse cx="50" cy="18" rx="34" ry="12" fill="#fff" opacity="0.5" />
        )}
        {planet.kind === "lava" && (
          <g stroke={hi} strokeWidth="1.1" fill="none" opacity="0.7">
            <path d="M18 62 Q34 55 46 64 T78 60" />
            <path d="M24 76 Q40 70 55 77 T82 72" />
          </g>
        )}
      </g>
      <circle cx="50" cy="50" r="46" fill={`url(#${uid}-shade)`} />
      <circle cx="50" cy="50" r="49" fill={`url(#${uid}-rim)`} />
    </svg>
  );
}

// Fixed pseudo-random city light layout (stable across renders/SSR).
const CITY_LIGHTS: [number, number, number][] = [
  [30, 40, 1.1], [38, 35, 0.7], [45, 44, 0.9], [55, 38, 0.7],
  [62, 47, 1.0], [35, 55, 0.8], [48, 58, 1.2], [58, 60, 0.7],
  [68, 55, 0.8], [42, 68, 0.9], [55, 72, 0.7], [30, 63, 0.6],
  [65, 68, 0.9], [72, 40, 0.6], [25, 50, 0.7],
];
