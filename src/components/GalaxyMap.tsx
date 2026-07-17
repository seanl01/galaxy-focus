"use client";

import { PLANETS, PLANET_MAP, ROUTES } from "@/lib/data";
import { useCallback, useRef, useState } from "react";

interface GalaxyMapProps {
  currentPlanetId: string;
  selectedId: string | null;
  highlightPath: string[]; // planet ids along the plotted route
  visited: string[];
  onSelect: (planetId: string) => void;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * The holomap. Lanes render in an SVG stretched across the container;
 * planets are absolutely-positioned buttons so they stay crisp and
 * accessible. The whole board tilts gently toward the pointer.
 */
export default function GalaxyMap({
  currentPlanetId,
  selectedId,
  highlightPath,
  visited,
  onSelect,
}: GalaxyMapProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const pathEdges = new Set<string>();
  for (let i = 0; i < highlightPath.length - 1; i++) {
    pathEdges.add(edgeKey(highlightPath[i], highlightPath[i + 1]));
  }
  const visitedSet = new Set(visited);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: ny * -4, y: nx * 5 });
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ perspective: "1400px" }}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        ref={boardRef}
        className="absolute inset-0 transition-transform duration-700 ease-out motion-reduce:transform-none"
        style={{
          transform: `rotateX(${8 + tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Nebula wash */}
        <div
          className="absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(55% 45% at 46% 50%, rgba(94, 111, 190, 0.20), transparent 70%)," +
              "radial-gradient(30% 26% at 47% 51%, rgba(214, 188, 130, 0.16), transparent 70%)," +
              "radial-gradient(35% 40% at 20% 30%, rgba(88, 60, 130, 0.12), transparent 70%)," +
              "radial-gradient(30% 32% at 75% 70%, rgba(60, 110, 140, 0.10), transparent 70%)",
          }}
        />

        {/* Galactic core shimmer */}
        <div
          className="absolute left-[46%] top-[49%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-2xl"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle, rgba(255,236,190,0.55), rgba(255,236,190,0) 70%)",
          }}
        />

        {/* Hyperspace lanes */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="lane-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {ROUTES.map((r) => {
            const a = PLANET_MAP[r.from];
            const b = PLANET_MAP[r.to];
            const key = edgeKey(r.from, r.to);
            const onPath = pathEdges.has(key);
            const traveled = visitedSet.has(r.from) && visitedSet.has(r.to);
            return (
              <g key={key}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    onPath
                      ? "rgba(229, 193, 92, 0.9)"
                      : traveled
                        ? "rgba(143, 179, 255, 0.38)"
                        : "rgba(125, 150, 210, 0.24)"
                  }
                  strokeWidth={onPath ? 0.45 : 0.22}
                  filter={onPath ? "url(#lane-glow)" : undefined}
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: "stroke 0.5s ease" }}
                />
                {onPath && (
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(255, 240, 200, 0.9)"
                    strokeWidth={0.18}
                    strokeDasharray="1.4 2.6"
                    vectorEffect="non-scaling-stroke"
                    className="animate-lane-flow"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Planet nodes */}
        {PLANETS.map((p) => {
          const isCurrent = p.id === currentPlanetId;
          const isSelected = p.id === selectedId;
          const isOnPath = highlightPath.includes(p.id);
          const isVisited = visitedSet.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              aria-label={`${p.name}, ${p.region}`}
              aria-pressed={isSelected}
            >
              {/* halo */}
              <span
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ${
                  isSelected
                    ? "h-10 w-10 bg-glow-gold/25"
                    : isCurrent
                      ? "h-9 w-9 bg-glow-cyan/20"
                      : "h-7 w-7 bg-glow-blue/0 group-hover:bg-glow-blue/15"
                } blur-[6px]`}
                aria-hidden
              />
              {/* current-position ring */}
              {isCurrent && (
                <span
                  className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-glow-cyan/70 animate-ping-slow"
                  aria-hidden
                />
              )}
              {isSelected && !isCurrent && (
                <span
                  className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-glow-gold/80"
                  aria-hidden
                />
              )}
              {/* dot */}
              <span
                className={`relative block h-[9px] w-[9px] rounded-full transition-all duration-300 group-hover:scale-125 ${
                  isSelected
                    ? "bg-glow-gold shadow-[0_0_12px_rgba(229,193,92,0.9)]"
                    : isCurrent
                      ? "bg-glow-cyan shadow-[0_0_12px_rgba(143,227,255,0.9)]"
                      : isOnPath
                        ? "bg-amber-100 shadow-[0_0_10px_rgba(255,240,200,0.8)]"
                        : isVisited
                          ? "bg-blue-200 shadow-[0_0_8px_rgba(143,179,255,0.7)]"
                          : "bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.5)]"
                }`}
              />
              {/* label */}
              <span
                className={`pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.22em] transition-colors duration-300 ${
                  isSelected
                    ? "text-glow-gold"
                    : isCurrent
                      ? "text-glow-cyan"
                      : "text-slate-400 group-hover:text-slate-200"
                }`}
              >
                {p.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
