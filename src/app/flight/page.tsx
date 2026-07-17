"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Hyperspace from "@/components/Hyperspace";
import PlanetDisc from "@/components/PlanetDisc";
import ShipModel from "@/components/ShipModel";
import { useStore, ActiveJourney } from "@/lib/store";
import { PLANET_MAP, SHIP_MAP } from "@/lib/data";
import { formatClock, formatDistance, formatMinutes } from "@/lib/format";
import {
  isAmbiencePlaying,
  playChime,
  playClick,
  playJump,
  startAmbience,
  stopAmbience,
} from "@/lib/audio";

type Phase = "countdown" | "cruise" | "approach" | "arrived";

const COUNTDOWN_SECONDS = 3;

export default function FlightPage() {
  const store = useStore();
  const router = useRouter();
  const journey = store.journey;

  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<"cockpit" | "exterior">("cockpit");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  // Snapshot kept through completion so the arrival screen outlives the journey record.
  const [completed, setCompleted] = useState<ActiveJourney | null>(null);
  const completedRef = useRef(false);

  // Clock tick.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = useMemo(() => {
    if (!journey) return 0;
    return journey.paused
      ? journey.elapsedBefore
      : journey.elapsedBefore + (now - journey.startedAt) / 1000;
  }, [journey, now]);

  const active = completed ?? journey;
  const total = active?.totalSeconds ?? 0;
  const remaining = completed ? 0 : Math.max(0, total - elapsed);

  // Approach threshold: last 5 minutes, or last 20% for short flights.
  const approachAt = Math.min(300, total * 0.2);

  const phase: Phase = completed
    ? "arrived"
    : !journey
      ? "arrived"
      : elapsed < COUNTDOWN_SECONDS
        ? "countdown"
        : remaining <= 0
          ? "arrived"
          : remaining <= approachAt
            ? "approach"
            : "cruise";

  // Complete exactly once when the clock runs out.
  useEffect(() => {
    if (!journey || completedRef.current) return;
    if (elapsed >= COUNTDOWN_SECONDS && remaining <= 0) {
      completedRef.current = true;
      setCompleted(journey);
      if (store.settings.sound) playChime();
      stopAmbience();
      setMusicOn(false);
      store.completeJourney();
    }
  }, [journey, elapsed, remaining, store]);

  // Jump sound as the countdown ends.
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (!journey || jumpedRef.current) return;
    if (elapsed >= COUNTDOWN_SECONDS - 0.2 && elapsed < COUNTDOWN_SECONDS + 2) {
      jumpedRef.current = true;
      if (store.settings.sound) playJump();
    }
  }, [journey, elapsed, store.settings.sound]);

  // Dev shortcut: Shift+D fast-forwards to the last 15 seconds.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "d") store.fastForward(15);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  // Stop ambience when leaving the page.
  useEffect(() => stopAmbience, []);

  const toggleMusic = useCallback(() => {
    if (isAmbiencePlaying()) {
      stopAmbience();
      setMusicOn(false);
    } else {
      startAmbience();
      setMusicOn(true);
    }
  }, []);

  // No journey and nothing completed — nothing to fly.
  if (!active) {
    return (
      <main className="relative flex h-screen flex-col items-center justify-center gap-6 overflow-hidden">
        <Hyperspace warp={0} />
        <p className="relative z-10 text-sm uppercase tracking-[0.3em] text-slate-400">
          No active flight
        </p>
        <Link href="/map" className="btn-primary relative z-10">
          Open Galaxy Map
        </Link>
      </main>
    );
  }

  const origin = PLANET_MAP[active.originId];
  const destination = PLANET_MAP[active.destinationId];
  const ship = SHIP_MAP[active.shipId] ?? Object.values(SHIP_MAP)[0];

  // Warp level per phase.
  const warp =
    phase === "countdown"
      ? elapsed / COUNTDOWN_SECONDS * 0.25
      : phase === "cruise"
        ? journey?.paused
          ? 0.35
          : 1
        : phase === "approach"
          ? Math.max(0.08, (remaining / approachAt) * 0.8)
          : 0;

  // Planet scale during approach/arrival.
  const approachProgress =
    phase === "approach" ? 1 - remaining / approachAt : phase === "arrived" ? 1 : 0;

  const cancelJump = () => {
    store.abortJourney();
    router.push("/map");
  };

  const endFlight = () => {
    stopAmbience();
    store.abortJourney();
    router.push("/map");
  };

  return (
    <main className="relative h-screen select-none overflow-hidden bg-space-950">
      <Hyperspace warp={warp} />

      {/* Approaching planet grows behind everything */}
      <AnimatePresence>
        {(phase === "approach" || phase === "arrived") && (
          <motion.div
            key="planet"
            initial={{ opacity: 0, scale: 0.3, x: "-50%", y: "-50%" }}
            animate={{
              opacity: 0.4 + approachProgress * 0.6,
              scale: 0.35 + approachProgress * (phase === "arrived" ? 1.05 : 0.75),
              x: "-50%",
              y: "-50%",
            }}
            transition={{ duration: 2.4, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-[5]"
          >
            <PlanetDisc planet={destination} size={560} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------ countdown */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8"
          >
            <p className="label-caps">Engaging Hyperdrive</p>
            <p className="text-7xl font-light tabular-nums text-slate-100">
              {Math.max(1, Math.ceil(COUNTDOWN_SECONDS - elapsed))}
            </p>
            <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-glow-blue transition-all duration-300"
                style={{ width: `${(elapsed / COUNTDOWN_SECONDS) * 100}%` }}
              />
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {origin.name} → {destination.name}
            </p>
            <button
              onClick={cancelJump}
              className="btn-ghost mt-2 px-8 py-2 text-xs"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------ in flight */}
      {(phase === "cruise" || phase === "approach") && journey && (
        <div className="absolute inset-0 z-10 flex flex-col">
          {/* top bar */}
          <div className="flex items-start justify-between p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="glass px-5 py-3"
            >
              <p className="text-sm text-slate-200">
                {origin.name} → {destination.name}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {formatDistance(journey.distance)} ·{" "}
                {formatMinutes(journey.totalSeconds / 60)} flight
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex gap-2"
            >
              <button
                onClick={toggleMusic}
                className={`glass px-4 py-3 text-xs uppercase tracking-[0.18em] transition-colors ${
                  musicOn ? "text-glow-gold" : "text-slate-400 hover:text-slate-100"
                }`}
                aria-pressed={musicOn}
              >
                ♪ Ambience
              </button>
              <button
                onClick={() =>
                  setView((v) => (v === "cockpit" ? "exterior" : "cockpit"))
                }
                className="glass px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-slate-100"
              >
                {view === "cockpit" ? "Ship View" : "Cockpit"}
              </button>
            </motion.div>
          </div>

          {/* exterior ship */}
          <AnimatePresence>
            {view === "exterior" && (
              <motion.div
                key="ship"
                initial={{ opacity: 0, y: 40, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 40, x: "-50%" }}
                transition={{ duration: 1.2 }}
                className="pointer-events-none absolute left-1/2 top-[8%] z-0"
              >
<ShipModel shipId={ship.id} size={560} view="chase" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* timer */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {phase === "approach" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="label-caps"
              >
                Approaching {destination.name}
              </motion.p>
            )}
            <motion.p
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, delay: 0.4 }}
              className="text-[16vw] font-extralight leading-none tabular-nums tracking-tight text-slate-100 md:text-[9rem]"
              style={{ textShadow: "0 0 60px rgba(143, 179, 255, 0.35)" }}
            >
              {formatClock(remaining)}
            </motion.p>
            <p className="label-caps">
              {journey.paused ? "Paused" : "Focus Session"}
            </p>
          </div>

          {/* controls */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex items-center justify-center gap-4 pb-10"
          >
            <button
              onClick={() => {
                if (store.settings.sound) playClick();
                journey.paused ? store.resumeJourney() : store.pauseJourney();
              }}
              className="btn-ghost min-w-36"
            >
              {journey.paused ? "Resume" : "Pause"}
            </button>
            {confirmEnd ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={endFlight}
                  className="rounded-xl border border-red-400/40 px-6 py-3 text-sm uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-400/10"
                >
                  Confirm End
                </button>
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="btn-ghost px-5 py-3 text-xs"
                >
                  Keep Flying
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEnd(true)}
                className="btn-ghost min-w-36 border-white/10 text-slate-500 hover:text-slate-300"
              >
                End Flight
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------------ arrival */}
      <AnimatePresence>
        {phase === "arrived" && completed && (
          <motion.div
            key="arrived"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.6 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-transparent via-space-950/30 to-space-950/80 px-6"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1 }}
              className="label-caps"
            >
              Arrived
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.3, delay: 1.2 }}
              className="text-5xl font-light uppercase tracking-[0.2em] text-slate-100 md:text-7xl"
            >
              {destination.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.5 }}
              className="mt-2 text-sm text-slate-400"
            >
              Great job, pilot. Focus session complete.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1.8 }}
              className="glass mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-8 py-5"
            >
              <div className="text-center">
                <p className="label-caps">Focus Time</p>
                <p className="mt-1 text-xl text-slate-100">
                  {formatMinutes(completed.totalSeconds / 60)}
                </p>
              </div>
              <div className="text-center">
                <p className="label-caps">Journey</p>
                <p className="mt-1 text-xl text-slate-100">
                  {origin.name} → {destination.name}
                </p>
              </div>
              <div className="text-center">
                <p className="label-caps">Distance</p>
                <p className="mt-1 text-xl text-slate-100">
                  {formatDistance(completed.distance)}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 2.1 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              <Link href="/log" className="btn-ghost">
                View Stats
              </Link>
              <Link href="/map" className="btn-primary">
                Continue Journey
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
