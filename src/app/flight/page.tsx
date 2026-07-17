"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import ChaseView from "@/components/ChaseView";
import Cockpit from "@/components/Cockpit";
import CockpitHUD from "@/components/CockpitHUD";
import Hyperspace from "@/components/Hyperspace";
import PlanetDisc from "@/components/PlanetDisc";
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

// Tiling fractal-noise film grain, inlined so no asset request is needed.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

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

  const inFlight = phase === "cruise" || phase === "approach";
  const exteriorActive = inFlight && view === "exterior";
  const progressFrac = total > 0 ? Math.min(1, elapsed / total) : 0;

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
      {/* 2D radial tunnel carries countdown/cockpit; it hands off to the
          3D chase scene in exterior view so there's a single vanishing point. */}
      {/* Shifted up so the tunnel's vanishing point sits behind the canopy
          centre of the cockpit frame (45% viewport height). */}
      <div className="absolute inset-x-0 -top-[10%] h-[110%]">
        <Hyperspace
          warp={warp}
          className={`transition-opacity duration-1000 ${
            exteriorActive ? "opacity-0" : "opacity-100"
          }`}
        />
      </div>

      {/* Faint nebula wash behind the 3D scene (exterior only) */}
      <AnimatePresence>
        {exteriorActive && (
          <motion.div
            key="nebula"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6 }}
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(ellipse 85% 60% at 50% 28%, rgba(48, 76, 158, 0.30), transparent 70%), radial-gradient(ellipse 60% 50% at 72% 74%, rgba(92, 54, 148, 0.16), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

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
        <div className="absolute inset-0 z-10">
          {/* route summary card — exterior only; the cockpit has the minimap */}
          {exteriorActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="glass absolute left-5 top-5 px-5 py-3"
            >
              <p className="text-sm text-slate-200">
                {origin.name} → {destination.name}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {formatDistance(journey.distance)} ·{" "}
                {formatMinutes(journey.totalSeconds / 60)} flight
              </p>
            </motion.div>
          )}

          {/* top right: view switcher + audio */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="pointer-events-auto absolute right-5 top-5 flex items-center gap-2.5"
          >
            <div className="glass flex rounded-full p-1">
              {(["cockpit", "exterior"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                    view === v
                      ? "bg-white/10 text-slate-100"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {v === "cockpit" ? "Cockpit View" : "Exterior View"}
                </button>
              ))}
            </div>
            <button
              onClick={toggleMusic}
              className={`glass flex h-10 w-10 items-center justify-center text-base transition-colors ${
                musicOn ? "text-glow-gold" : "text-slate-400 hover:text-slate-100"
              }`}
              aria-pressed={musicOn}
              aria-label="Toggle ambience"
            >
              ♪
            </button>
          </motion.div>

          {/* cockpit HUD: timer, minimap, readouts, destination card */}
          {!exteriorActive && (
            <CockpitHUD
              journey={journey}
              origin={origin}
              destination={destination}
              remaining={remaining}
              progress={progressFrac}
              now={now}
              phase={phase === "approach" ? "approach" : "cruise"}
              confirmEnd={confirmEnd}
              setConfirmEnd={setConfirmEnd}
              onTogglePause={() => {
                if (store.settings.sound) playClick();
                journey.paused ? store.resumeJourney() : store.pauseJourney();
              }}
              onEnd={endFlight}
            />
          )}

          {/* exterior: the journey is the hero, the timer becomes a floating HUD */}
          {exteriorActive && (
            <motion.div
              key="hud"
              initial={{ opacity: 0, y: 24, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="absolute bottom-10 left-1/2"
            >
              <motion.div
                animate={{ y: [-3, 3] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }}
                className="glass flex flex-col items-center gap-1 rounded-3xl px-10 py-5"
              >
                <p className="label-caps">
                  {phase === "approach"
                    ? `Approaching ${destination.name}`
                    : journey.paused
                      ? "Paused"
                      : "Focus Session"}
                </p>
                <p
                  className="text-5xl font-extralight tabular-nums tracking-tight text-slate-100"
                  style={{ textShadow: "0 0 40px rgba(143, 179, 255, 0.4)" }}
                >
                  {formatClock(remaining)}
                </p>
                <div className="mt-1.5 flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (store.settings.sound) playClick();
                      journey.paused
                        ? store.resumeJourney()
                        : store.pauseJourney();
                    }}
                    className="text-[11px] uppercase tracking-[0.2em] text-slate-300 transition-colors hover:text-glow-gold"
                  >
                    {journey.paused ? "Resume" : "Pause"}
                  </button>
                  <span className="text-white/15">·</span>
                  {confirmEnd ? (
                    <>
                      <button
                        onClick={endFlight}
                        className="text-[11px] uppercase tracking-[0.2em] text-red-300 transition-colors hover:text-red-200"
                      >
                        Confirm End
                      </button>
                      <button
                        onClick={() => setConfirmEnd(false)}
                        className="text-[11px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
                      >
                        Keep Flying
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmEnd(true)}
                      className="text-[11px] uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-300"
                    >
                      End Flight
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {/* cockpit interior frame (decorative; HUD lives above it) */}
      <AnimatePresence>
        {inFlight && view === "cockpit" && (
          <motion.div
            key="cockpit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="pointer-events-none absolute inset-0 z-[7]"
          >
            <Cockpit />
          </motion.div>
        )}
      </AnimatePresence>

      {/* full-screen 3D chase scene: ship + streaks share one vanishing point */}
      <AnimatePresence>
        {exteriorActive && (
          <motion.div
            key="chase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute inset-0 z-[6]"
          >
            <ChaseView shipId={ship.id} warp={warp} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* cinematic finish: vignette + very subtle film grain */}
      {inFlight && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[8]"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 55%, rgba(2, 4, 12, 0.55) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[8] opacity-[0.05]"
            style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
          />
        </>
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
