"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import PlanetDisc from "@/components/PlanetDisc";
import { Planet, PLANET_MAP } from "@/lib/data";
import { ActiveJourney } from "@/lib/store";
import { findPath } from "@/lib/graph";
import { formatClock, formatDistance } from "@/lib/format";

interface CockpitHUDProps {
  journey: ActiveJourney;
  origin: Planet;
  destination: Planet;
  remaining: number; // seconds
  progress: number; // 0..1 of the whole journey
  now: number; // epoch ms tick, for gently wobbling readouts
  phase: "cruise" | "approach";
  confirmEnd: boolean;
  setConfirmEnd: (b: boolean) => void;
  onTogglePause: () => void;
  onEnd: () => void;
}

const GREEN = "#7fdfa8";
const BLUE = "#8fb3ff";
const GOLD = "#e5c15c";

/** Top-left expandable galaxy route panel. */
function RouteMinimap({
  journey,
  progress,
}: {
  journey: ActiveJourney;
  progress: number;
}) {
  const [open, setOpen] = useState(true);

  // Rebuild the legs so we know each stop's distance along the route.
  const legs = useMemo(
    () => findPath(journey.originId, journey.destinationId),
    [journey.originId, journey.destinationId]
  );
  if (!legs || legs.path.length < 2) return null;

  const { path, distance: total } = legs;
  const cum: number[] = [0];
  for (const leg of legs.legs) cum.push(cum[cum.length - 1] + leg.distance);
  const travelled = progress * total;

  // Index of the last stop we've passed.
  let currentIdx = 0;
  for (let i = 0; i < cum.length; i++) if (cum[i] <= travelled) currentIdx = i;

  // Map travelled distance onto the evenly-spaced marker column so the lane
  // fill always agrees with the marker states, even with uneven legs.
  let fillFrac = 1;
  if (currentIdx < path.length - 1) {
    const legSpan = cum[currentIdx + 1] - cum[currentIdx] || 1;
    fillFrac =
      (currentIdx + (travelled - cum[currentIdx]) / legSpan) /
      (path.length - 1);
  }

  const remainingKLY = Math.max(0, total - travelled);
  const etaMin = Math.ceil(
    (journey.totalSeconds * (1 - progress)) / 60
  );

  return (
    <div className="pointer-events-auto absolute left-5 top-5">
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.button
            key="pill"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.35 }}
            onClick={() => setOpen(true)}
            className="glass flex items-center gap-2.5 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-slate-300 transition-colors hover:text-slate-100"
          >
            <span className="text-glow-blue">⌖</span> Minimap
            <span className="text-slate-500">⤢</span>
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="glass w-60 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="label-caps">Galaxy Route</p>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 transition-colors hover:text-slate-200"
                aria-label="Collapse minimap"
              >
                ⤡
              </button>
            </div>

            <div className="relative">
              {/* lane + progress fill */}
              <div className="absolute bottom-[22px] left-[5px] top-[8px] w-px bg-white/12" />
              <div
                className="absolute left-[5px] top-[8px] w-px bg-gradient-to-b from-emerald-300/80 to-glow-blue"
                style={{
                  height: `calc((100% - 30px) * ${Math.min(1, fillFrac)})`,
                }}
              />
              <ol className="relative space-y-4">
                {path.map((id, i) => {
                  const last = i === path.length - 1;
                  const passed = cum[i] <= travelled;
                  const isCurrent = i === currentIdx && !last;
                  const color = last ? GOLD : isCurrent ? BLUE : passed ? GREEN : "#5a6478";
                  const tag = last
                    ? "Destination"
                    : i === 0
                      ? isCurrent
                        ? "Departed"
                        : "Departed"
                      : isCurrent
                        ? "Current"
                        : passed
                          ? "Completed"
                          : "";
                  return (
                    <li key={id} className="flex items-start gap-3">
                      <span className="relative mt-[3px] flex h-[11px] w-[11px] items-center justify-center">
                        {isCurrent && (
                          <span
                            className="animate-ping-slow absolute left-1/2 top-1/2 h-[11px] w-[11px] rounded-full"
                            style={{ background: `${BLUE}44` }}
                          />
                        )}
                        <span
                          className="h-[9px] w-[9px] rounded-full border"
                          style={{
                            borderColor: color,
                            background: passed || last ? `${color}33` : "transparent",
                            boxShadow: isCurrent ? `0 0 10px ${BLUE}` : undefined,
                          }}
                        />
                      </span>
                      <span>
                        <span
                          className="block text-sm leading-tight"
                          style={{ color: passed || last || isCurrent ? "#e8edf7" : "#8b94a7" }}
                        >
                          {idToName(id)}
                        </span>
                        {tag && (
                          <span
                            className="text-[9px] uppercase tracking-[0.22em]"
                            style={{ color }}
                          >
                            {tag}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-5 border-t border-white/10 pt-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                {formatDistance(remainingKLY)} remaining · {etaMin} min eta
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-glow-blue transition-[width] duration-1000"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {Math.round(progress * 100)}% complete
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function idToName(id: string): string {
  return PLANET_MAP[id]?.name ?? id;
}

function ReadoutRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {k}
      </span>
      <span
        className={`whitespace-nowrap text-xs tabular-nums tracking-wide ${accent ? "text-glow-blue" : "text-slate-200"}`}
      >
        {v}
      </span>
    </div>
  );
}

function StatusBar({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-slate-200">100%</span>
        <span className="h-[3px] w-14 overflow-hidden rounded-full bg-white/10">
          <span className="animate-pulse-soft block h-full w-full rounded-full bg-glow-blue/80" />
        </span>
      </span>
    </div>
  );
}

export default function CockpitHUD({
  journey,
  origin,
  destination,
  remaining,
  progress,
  now,
  phase,
  confirmEnd,
  setConfirmEnd,
  onTogglePause,
  onEnd,
}: CockpitHUDProps) {
  // Fictional-but-consistent flight data.
  const speedC =
    (journey.distance / Math.max(1, journey.totalSeconds / 60)) * 8 +
    Math.sin(now / 5200) * 0.06;
  const dx = destination.x - origin.x;
  const dy = destination.y - origin.y;
  const heading = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360;
  const remainKLY = journey.distance * (1 - progress);
  const etaMin = Math.ceil(remaining / 60);

  return (
    <>
      {/* ------------------------------------------- timer, top centre */}
      <motion.div
        initial={{ opacity: 0, y: -16, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        transition={{ duration: 1, delay: 0.3 }}
        className="pointer-events-auto absolute left-1/2 top-5"
      >
        <div className="glass flex flex-col items-center gap-0.5 rounded-2xl px-10 py-3.5">
          <p className="label-caps">
            {phase === "approach"
              ? `Approaching ${destination.name}`
              : journey.paused
                ? "Paused"
                : "Focus Session"}
          </p>
          <p
            className="text-5xl font-extralight tabular-nums tracking-tight text-slate-100"
            style={{ textShadow: "0 0 36px rgba(143, 179, 255, 0.4)" }}
          >
            {formatClock(remaining)}
          </p>
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={onTogglePause}
              className="rounded-lg border border-glow-gold/50 px-4 py-1 text-[10px] uppercase tracking-[0.25em] text-glow-gold transition-colors hover:bg-glow-gold/10"
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
      </motion.div>

      {/* --------------------------------------- route minimap, top left */}
      <RouteMinimap journey={journey} progress={progress} />

      {/* ------------------------------------- readout panels, top right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.55 }}
        className="pointer-events-none absolute right-5 top-24 hidden w-64 flex-col gap-3 lg:flex"
      >
        <div className="glass space-y-2.5 p-4">
          <p className="label-caps mb-3">Ship Status</p>
          <StatusBar label="Hull" />
          <StatusBar label="Shields" />
          <StatusBar label="Systems" />
          <StatusBar label="Engines" />
        </div>
        <div className="glass space-y-2.5 p-4">
          <p className="label-caps mb-3">Flight Data</p>
          <ReadoutRow k="Velocity" v={`${speedC.toFixed(1)}c`} accent />
          <ReadoutRow k="Heading" v={`${heading}°`} />
          <ReadoutRow k="Distance to dest." v={formatDistance(remainKLY)} />
          <ReadoutRow k="ETA" v={`${etaMin} min`} />
        </div>
        <div className="glass space-y-2.5 p-4">
          <p className="label-caps mb-3">Environment</p>
          <ReadoutRow k="Region" v={destination.region} />
          <ReadoutRow k="Space traffic" v="Light" />
          <ReadoutRow
            k="Interference"
            v={phase === "approach" ? "Minor" : "None"}
          />
        </div>
      </motion.div>

      {/* --------------------------------- destination card, bottom left */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="pointer-events-none absolute bottom-6 left-5 hidden md:block"
      >
        <div className="glass flex items-center gap-4 p-4 pr-6">
          <div className="overflow-hidden rounded-full">
            <PlanetDisc planet={destination} size={52} />
          </div>
          <div>
            <p className="text-sm tracking-[0.12em] text-slate-100">
              {origin.name.toUpperCase()} → {destination.name.toUpperCase()}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.25em] text-slate-500">
              Hyperspace route
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              ⊕ {formatDistance(remainKLY)} &nbsp; 🕐 {etaMin} min
            </p>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------- utility controls, bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="pointer-events-auto absolute bottom-6 right-5 flex gap-2.5"
      >
        <button
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen?.();
          }}
          className="glass flex h-11 w-11 items-center justify-center text-base text-slate-400 transition-all hover:scale-105 hover:text-slate-100"
          aria-label="Toggle fullscreen"
        >
          ⛶
        </button>
        <Link
          href="/settings"
          className="glass flex h-11 w-11 items-center justify-center text-base text-slate-400 transition-all hover:scale-105 hover:text-slate-100"
          aria-label="Settings"
        >
          ⚙
        </Link>
      </motion.div>
    </>
  );
}
