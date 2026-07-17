"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Starfield from "@/components/Starfield";
import Nav from "@/components/Nav";
import PlanetDisc from "@/components/PlanetDisc";
import ShipModel from "@/components/ShipModel";
import { useStore } from "@/lib/store";
import { PLANET_MAP, SHIP_MAP } from "@/lib/data";
import { formatClock, formatHours } from "@/lib/format";

export default function HomePage() {
  const store = useStore();
  const current = PLANET_MAP[store.currentPlanetId];
  const ship = SHIP_MAP[store.shipId];
  const journey = store.journey;
  const lastTrip = store.history[0];

  const totalFocus = store.history.reduce((s, r) => s + r.focusSeconds, 0);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <Starfield density={1.3} />
      {/* nebula */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 50% at 70% 20%, rgba(94, 111, 190, 0.14), transparent 70%)," +
            "radial-gradient(45% 40% at 20% 80%, rgba(120, 80, 150, 0.10), transparent 70%)",
        }}
      />
      <Nav />

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="label-caps mb-6"
        >
          Focus. Journey. Achieve.
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.25 }}
          className="text-5xl font-semibold uppercase tracking-[0.18em] text-slate-100 md:text-7xl"
        >
          Focus Flight
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.45 }}
          className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg"
        >
          Every focus session is a journey across the galaxy. Choose a
          destination, follow a valid hyperspace route, and stay focused until
          you arrive.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href={journey ? "/flight" : "/map"} className="btn-primary">
            {journey ? "Resume Flight" : "Continue Journey"}
          </Link>
          <Link href="/map" className="btn-ghost">
            Galaxy Map
          </Link>
        </motion.div>

        {/* status card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.9 }}
          className="glass mt-16 flex w-full max-w-3xl flex-col items-center gap-8 p-8 md:flex-row md:justify-between"
        >
          <div className="flex items-center gap-5">
            <div className="animate-float-slow">
              <PlanetDisc planet={current} size={92} />
            </div>
            <div className="text-left">
              <p className="label-caps">Current System</p>
              <p className="mt-1 text-2xl font-medium text-slate-100">
                {current.name}
              </p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-slate-500">
                {current.region}
              </p>
            </div>
          </div>

          <div className="hidden h-16 w-px bg-white/10 md:block" aria-hidden />

          <div className="text-left">
            {journey ? (
              <>
                <p className="label-caps">In Transit</p>
                <p className="mt-1 text-lg text-slate-100">
                  {PLANET_MAP[journey.originId].name} →{" "}
                  {PLANET_MAP[journey.destinationId].name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatClock(
                    journey.totalSeconds - store.journeyElapsed()
                  )}{" "}
                  remaining · {journey.paused ? "paused" : "en route"}
                </p>
              </>
            ) : lastTrip ? (
              <>
                <p className="label-caps">Last Journey</p>
                <p className="mt-1 text-lg text-slate-100">
                  {PLANET_MAP[lastTrip.originId].name} →{" "}
                  {PLANET_MAP[lastTrip.destinationId].name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatHours(totalFocus)} focused ·{" "}
                  {store.visited.length} worlds visited
                </p>
              </>
            ) : (
              <>
                <p className="label-caps">Flight Log</p>
                <p className="mt-1 text-lg text-slate-100">
                  No journeys yet
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Plot a course from the galaxy map.
                </p>
              </>
            )}
          </div>

          <div className="hidden h-16 w-px bg-white/10 md:block" aria-hidden />

          <div className="flex flex-col items-center gap-1">
            <ShipModel shipId={ship.id} size={150} />
            <p className="label-caps">{ship.name}</p>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 pb-6 text-center text-[10px] uppercase tracking-[0.25em] text-slate-600">
        A fan-made focus timer · Not affiliated with Lucasfilm
      </footer>
    </main>
  );
}
