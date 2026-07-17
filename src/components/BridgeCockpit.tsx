"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Hyperspace from "@/components/Hyperspace";
import PlanetDisc from "@/components/PlanetDisc";
import { Planet, PLANET_MAP, cockpitBridge } from "@/lib/data";
import { ActiveJourney } from "@/lib/store";
import { findPath } from "@/lib/graph";
import { formatClock, formatDistance } from "@/lib/format";
import { quadMatrix3d } from "@/lib/homography";

// --- Bridge geometry -------------------------------------------------------
// Measured against the 2752x1536 source render (public/cockpit/bridge.jpg),
// as percentages. The stage is laid out at native pixel size and scaled to
// cover the viewport, so these coordinates line up with the image at any size.
const STAGE_W = 2752;
const STAGE_H = 1536;

type Pt = [number, number];
const px = (p: Pt): Pt => [(p[0] / 100) * STAGE_W, (p[1] / 100) * STAGE_H];

// The hexagonal canopy opening — hyperspace shows through here.
const WINDOW: Pt[] = [
  [29.5, 21.2],
  [70.5, 21.2],
  [80.5, 46.5],
  [67, 59.3],
  [33, 59.3],
  [19.5, 46.5],
];
const WINDOW_CY =
  WINDOW.reduce((s, p) => s + p[1], 0) / WINDOW.length; // ~42.3%

// The six console displays, each [topLeft, topRight, bottomRight, bottomLeft].
const SCREENS: Record<string, Pt[]> = {
  statusL: [
    [15.6, 71.4],
    [19.3, 71.9],
    [19.1, 80.7],
    [15.5, 81.1],
  ],
  route: [
    [22.4, 71.2],
    [32.7, 70.2],
    [32.8, 81.0],
    [22.3, 81.9],
  ],
  data: [
    [40.6, 70.9],
    [49.2, 70.6],
    [49.3, 81.1],
    [40.7, 81.4],
  ],
  mission: [
    [50.8, 70.6],
    [59.4, 70.9],
    [59.3, 81.4],
    [50.7, 81.1],
  ],
  nav: [
    [67.2, 70.2],
    [77.5, 71.2],
    [77.6, 81.9],
    [67.3, 81.0],
  ],
  powerR: [
    [80.7, 71.9],
    [84.4, 71.4],
    [84.5, 81.1],
    [80.9, 80.7],
  ],
};

function clipFrom(pts: Pt[]): string {
  return `polygon(${pts.map((p) => `${p[0]}% ${p[1]}%`).join(",")})`;
}

// --- A single perspective-mapped console screen ----------------------------
// Grow a quad about its centroid so the lit display fully covers the (lighter)
// screen beneath it; the surrounding metal bezel hides the small overspill.
function expandQuad(pts: Pt[], f: number): Pt[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map((p) => [cx + (p[0] - cx) * f, cy + (p[1] - cy) * f]);
}

function ScreenPanel({
  corners,
  children,
  tint = "rgba(4,10,22,0.95)",
}: {
  corners: Pt[]; // percentages, [TL,TR,BR,BL]
  children: React.ReactNode;
  tint?: string;
}) {
  const dst = expandQuad(corners, 1.06).map(px) as Pt[];
  const xs = dst.map((p) => p[0]);
  const ys = dst.map((p) => p[1]);
  // Design the panel at its bounding-box native resolution, then let the
  // homography foreshorten it onto the actual (slanted) screen quad.
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const matrix = useMemo(
    () => quadMatrix3d(w, h, dst),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, h, dst.flat().join(",")]
  );

  return (
    <div
      className="absolute left-0 top-0 origin-top-left"
      style={{ width: w, height: h, transform: matrix }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          background: `radial-gradient(120% 120% at 50% 0%, rgba(34,66,128,0.55), ${tint} 62%)`,
          boxShadow:
            "inset 0 0 44px rgba(70,120,220,0.32), inset 0 0 0 2px rgba(120,170,255,0.22)",
        }}
      >
        {/* faint scanlines for a CRT/holo feel */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(150,190,255,0.10) 0 2px, transparent 2px 5px)",
          }}
        />
        <div className="relative h-full w-full">{children}</div>
      </div>
    </div>
  );
}

// --- Instrument contents ---------------------------------------------------
const BLUE = "#8fb3ff";
const GREEN = "#7fdfa8";
const GOLD = "#e5c15c";

function VBars({ n = 4, seed = 0 }: { n?: number; seed?: number }) {
  return (
    <div className="flex h-full items-end justify-center gap-[6px] px-2 pb-3 pt-6">
      {Array.from({ length: n }, (_, i) => {
        const r = ((i * 37 + seed * 91) % 100) / 100;
        return (
          <span
            key={i}
            className="ck-eq w-[10px] rounded-sm"
            style={{
              height: `${35 + r * 55}%`,
              background: "linear-gradient(to top,#274f9e,#9cc8ff)",
              boxShadow: "0 0 10px rgba(120,170,255,0.4)",
              animationDelay: `${(r * 3).toFixed(2)}s`,
              animationDuration: `${(2.6 + r * 1.8).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function ScreenTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-center uppercase text-glow-blue/85"
      style={{ fontSize: 15, letterSpacing: "0.28em", paddingTop: 8 }}
    >
      {children}
    </p>
  );
}

function RouteScreen({
  journey,
  progress,
}: {
  journey: ActiveJourney;
  progress: number;
}) {
  const legs = useMemo(
    () => findPath(journey.originId, journey.destinationId),
    [journey.originId, journey.destinationId]
  );
  if (!legs || legs.path.length < 2) return null;
  const { path, distance: total } = legs;
  const cum: number[] = [0];
  for (const leg of legs.legs) cum.push(cum[cum.length - 1] + leg.distance);
  const travelled = progress * total;
  let currentIdx = 0;
  for (let i = 0; i < cum.length; i++) if (cum[i] <= travelled) currentIdx = i;
  const fill = Math.min(1, Math.max(0, progress));

  return (
    <div className="flex h-full flex-col">
      <ScreenTitle>Nav Route</ScreenTitle>
      <div className="relative mx-5 mt-4 flex-1">
        {/* horizontal lane */}
        <div className="absolute left-0 right-0 top-[10px] h-px bg-white/15" />
        <div
          className="absolute left-0 top-[10px] h-px"
          style={{
            width: `${fill * 100}%`,
            background: `linear-gradient(to right, ${GREEN}, ${BLUE})`,
            boxShadow: `0 0 8px ${BLUE}`,
          }}
        />
        <div className="absolute inset-x-0 top-0 flex justify-between">
          {path.map((id, i) => {
            const last = i === path.length - 1;
            const passed = cum[i] <= travelled;
            const cur = i === currentIdx && !last;
            const color = last ? GOLD : cur ? BLUE : passed ? GREEN : "#5a6478";
            return (
              <span key={id} className="flex flex-col items-center" style={{ width: 0 }}>
                <span
                  className="rounded-full"
                  style={{
                    width: 11,
                    height: 11,
                    border: `2px solid ${color}`,
                    background: passed || last ? `${color}44` : "transparent",
                    boxShadow: cur ? `0 0 9px ${BLUE}` : undefined,
                  }}
                />
                <span
                  className="mt-1 whitespace-nowrap uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.08em", color }}
                >
                  {PLANET_MAP[id]?.name ?? id}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      <p
        className="px-5 pb-3 text-center uppercase text-slate-300"
        style={{ fontSize: 12, letterSpacing: "0.18em" }}
      >
        {formatDistance(Math.max(0, total - travelled))} remaining
      </p>
    </div>
  );
}

function DataScreen({
  journey,
  origin,
  destination,
  progress,
  now,
}: {
  journey: ActiveJourney;
  origin: Planet;
  destination: Planet;
  progress: number;
  now: number;
}) {
  const speedC =
    (journey.distance / Math.max(1, journey.totalSeconds / 60)) * 8 +
    Math.sin(now / 5200) * 0.06;
  const dx = destination.x - origin.x;
  const dy = destination.y - origin.y;
  const heading = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360;
  const remainKLY = journey.distance * (1 - progress);
  const rows: [string, string, boolean?][] = [
    ["Velocity", `${speedC.toFixed(1)}c`, true],
    ["Heading", `${heading}°`],
    ["Range", formatDistance(remainKLY)],
  ];
  return (
    <div className="flex h-full flex-col">
      <ScreenTitle>Flight Data</ScreenTitle>
      <div className="flex flex-1 flex-col justify-center gap-2 px-5">
        {rows.map(([k, v, accent]) => (
          <div key={k} className="flex items-baseline justify-between">
            <span
              className="uppercase text-slate-500"
              style={{ fontSize: 11, letterSpacing: "0.16em" }}
            >
              {k}
            </span>
            <span
              className="tabular-nums"
              style={{ fontSize: 17, color: accent ? BLUE : "#d7deec" }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionScreen({
  remaining,
  progress,
  journey,
}: {
  remaining: number;
  progress: number;
  journey: ActiveJourney;
}) {
  const etaMin = Math.ceil(remaining / 60);
  const remainKLY = journey.distance * (1 - progress);
  return (
    <div className="flex h-full flex-col">
      <ScreenTitle>Mission</ScreenTitle>
      <div className="flex flex-1 flex-col justify-center gap-2 px-5">
        <div className="flex items-baseline justify-between">
          <span className="uppercase text-slate-500" style={{ fontSize: 11, letterSpacing: "0.16em" }}>
            ETA
          </span>
          <span className="tabular-nums" style={{ fontSize: 17, color: GOLD }}>
            {etaMin} min
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="uppercase text-slate-500" style={{ fontSize: 11, letterSpacing: "0.16em" }}>
            To dest.
          </span>
          <span className="tabular-nums" style={{ fontSize: 15, color: "#d7deec" }}>
            {formatDistance(remainKLY)}
          </span>
        </div>
        <div className="mt-1">
          <div className="h-[5px] overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(progress * 100)}%`,
                background: `linear-gradient(to right, ${GREEN}, ${BLUE})`,
                boxShadow: `0 0 8px ${BLUE}`,
              }}
            />
          </div>
          <p
            className="mt-1 text-right uppercase text-slate-400"
            style={{ fontSize: 10, letterSpacing: "0.2em" }}
          >
            {Math.round(progress * 100)}% complete
          </p>
        </div>
      </div>
    </div>
  );
}

function NavScreen({ destination, now }: { destination: Planet; now: number }) {
  const bearing = Math.round(((now / 90) % 360));
  return (
    <div className="flex h-full flex-col">
      <ScreenTitle>Scanner</ScreenTitle>
      <div className="relative flex-1">
        <div className="absolute left-1/2 top-1/2 aspect-square h-[80%] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 rounded-full border border-glow-blue/40" />
          <div className="absolute inset-[22%] rounded-full border border-glow-blue/25" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-glow-blue/20" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-glow-blue/20" />
          <div
            className="ck-sweep absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(120,170,255,0.34), rgba(120,170,255,0.05) 55deg, transparent 90deg)",
            }}
          />
          {/* destination blip */}
          <span
            className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: "72%",
              top: "34%",
              background: GOLD,
              boxShadow: `0 0 10px ${GOLD}`,
            }}
          />
        </div>
        <p
          className="absolute bottom-2 left-0 right-0 text-center uppercase text-slate-400"
          style={{ fontSize: 10, letterSpacing: "0.2em" }}
        >
          {destination.name} · {bearing}°
        </p>
      </div>
    </div>
  );
}

function StatusLights({ label, seed }: { label: string; seed: number }) {
  const rows = ["HUL", "SHD", "PWR"];
  return (
    <div className="flex h-full flex-col px-2 pb-2 pt-2">
      <p
        className="text-center uppercase text-glow-blue/80"
        style={{ fontSize: 10, letterSpacing: "0.14em" }}
      >
        {label}
      </p>
      <div className="flex flex-1 flex-col justify-center gap-2 px-1">
        {rows.map((r, i) => (
          <div key={r} className="flex items-center gap-1.5">
            <span className="uppercase text-slate-500" style={{ fontSize: 9 }}>
              {r}
            </span>
            <span className="flex flex-1 items-center gap-[3px]">
              {Array.from({ length: 4 }, (_, j) => (
                <span
                  key={j}
                  className="ck-blink block h-[6px] flex-1 rounded-[1px]"
                  style={{
                    background: BLUE,
                    boxShadow: `0 0 5px ${BLUE}88`,
                    animationDelay: `${(((i * 4 + j + seed) % 7) * 0.4).toFixed(2)}s`,
                    animationDuration: "2.4s",
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- The bridge ------------------------------------------------------------
export interface BridgeCockpitProps {
  journey: ActiveJourney;
  origin: Planet;
  destination: Planet;
  remaining: number;
  progress: number;
  now: number;
  phase: "cruise" | "approach";
  warp: number;
  exitBoost: number;
  exitCompress: number;
  snap: boolean;
  snapped: boolean;
  revealProgress: number;
  reduceMotion: boolean;
  confirmEnd: boolean;
  setConfirmEnd: (b: boolean) => void;
  onTogglePause: () => void;
  onEnd: () => void;
}

export default function BridgeCockpit(props: BridgeCockpitProps) {
  const {
    journey,
    origin,
    destination,
    remaining,
    progress,
    now,
    phase,
    warp,
    exitBoost,
    exitCompress,
    snap,
    snapped,
    revealProgress,
    onTogglePause,
    onEnd,
    confirmEnd,
    setConfirmEnd,
  } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Cover-fit the fixed-size stage to the viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const s = Math.max(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H);
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%,-50%) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {/* the cockpit interior render is the backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cockpitBridge()}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full select-none"
          draggable={false}
        />

        {/* window: hyperspace + planet reveal, clipped to the canopy opening
            and drawn over the render so it fills the (black) glass exactly */}
        <div className="absolute inset-0" style={{ clipPath: clipFrom(WINDOW) }}>
          {/* deep-space base so any sparse corner reads as space, not black */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(115% 90% at 50% 40%, #0b1c40 0%, #061027 55%, #03060f 100%)",
            }}
          />
          {/* the tunnel is concentrated into the window's bounding box so the
              streaks stay dense inside the small canopy rather than spread
              thin across the whole stage */}
          <div
            className="absolute"
            style={{ left: "17%", top: "18%", width: "66%", height: "44%" }}
          >
            <Hyperspace
              warp={warp}
              exitBoost={exitBoost}
              exitCompress={exitCompress}
              snap={snap}
              trail="9, 18, 40"
            />
          </div>
          {snapped && (
            <motion.div
              key="bridge-planet"
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 0.8 + revealProgress * 0.34 }}
              transition={{
                opacity: { duration: 0.2 },
                scale: { duration: 1.4, ease: "easeOut" },
              }}
              className="absolute left-1/2"
              style={{ top: `${WINDOW_CY}%`, transform: "translate(-50%,-50%)" }}
            >
              <div className="animate-float-slow">
                <PlanetDisc planet={destination} size={520} />
              </div>
            </motion.div>
          )}
        </div>

        {/* instrument displays, perspective-fitted onto the console screens */}
        <ScreenPanel corners={SCREENS.statusL}>
          <StatusLights label="Sys" seed={1} />
        </ScreenPanel>
        <ScreenPanel corners={SCREENS.route}>
          <RouteScreen journey={journey} progress={progress} />
        </ScreenPanel>
        <ScreenPanel corners={SCREENS.data}>
          <DataScreen
            journey={journey}
            origin={origin}
            destination={destination}
            progress={progress}
            now={now}
          />
        </ScreenPanel>
        <ScreenPanel corners={SCREENS.mission}>
          <MissionScreen remaining={remaining} progress={progress} journey={journey} />
        </ScreenPanel>
        <ScreenPanel corners={SCREENS.nav}>
          <NavScreen destination={destination} now={now} />
        </ScreenPanel>
        <ScreenPanel corners={SCREENS.powerR}>
          <StatusLights label="Pwr" seed={5} />
        </ScreenPanel>
      </div>

      {/* flat, always-reachable control bar with the live clock */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="glass flex items-center gap-5 rounded-2xl px-7 py-3">
          <div className="flex flex-col items-center">
            <p className="label-caps">
              {phase === "approach"
                ? "Approaching"
                : journey.paused
                  ? "Paused"
                  : "Focus Session"}
            </p>
            <p
              className="tabular-nums text-slate-100"
              style={{ fontSize: 30, fontWeight: 200, letterSpacing: "-0.01em" }}
            >
              {formatClock(remaining)}
            </p>
          </div>
          <span className="h-8 w-px bg-white/12" />
          <button
            onClick={onTogglePause}
            className="rounded-lg border border-glow-gold/50 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-glow-gold transition-colors hover:bg-glow-gold/10"
          >
            {journey.paused ? "Resume" : "Pause"}
          </button>
          {confirmEnd ? (
            <span className="flex items-center gap-3">
              <button
                onClick={onEnd}
                className="text-[10px] uppercase tracking-[0.2em] text-red-300 hover:text-red-200"
              >
                Confirm End
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
              >
                Keep Flying
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="text-[10px] uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-300"
            >
              End Flight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
