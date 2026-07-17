"use client";

import { motion } from "framer-motion";
import Starfield from "@/components/Starfield";
import Nav from "@/components/Nav";
import ShipModel from "@/components/ShipModel";
import { useStore, JourneyRecord } from "@/lib/store";
import { PLANET_MAP, PLANETS, SHIP_MAP } from "@/lib/data";
import { formatDate, formatDistance, formatHours, formatMinutes } from "@/lib/format";

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function currentStreak(history: JourneyRecord[]): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((r) => dayKey(r.completedAt)));
  let streak = 0;
  const cursor = new Date();
  // Today may still be in progress — start counting from today if present,
  // otherwise from yesterday.
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function LogPage() {
  const store = useStore();
  const totalFocus = store.history.reduce((s, r) => s + r.focusSeconds, 0);
  const totalDistance = store.history.reduce((s, r) => s + r.distance, 0);
  const streak = currentStreak(store.history);

  const shipCounts = new Map<string, number>();
  for (const r of store.history) {
    shipCounts.set(r.shipId, (shipCounts.get(r.shipId) ?? 0) + 1);
  }
  const favoriteShip =
    [...shipCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? store.shipId;

  const stats = [
    { label: "Hours Focused", value: formatHours(totalFocus) },
    {
      label: "Worlds Visited",
      value: `${store.visited.length} / ${PLANETS.length}`,
    },
    { label: "Flights Completed", value: `${store.history.length}` },
    { label: "Distance Traveled", value: formatDistance(totalDistance) },
    { label: "Current Streak", value: streak === 1 ? "1 day" : `${streak} days` },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Starfield density={1.1} />
      <Nav />

      <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20 pt-28">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="text-3xl font-light uppercase tracking-[0.25em] text-slate-100"
        >
          Journey Log
        </motion.h1>

        {/* stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5"
        >
          {stats.map((s) => (
            <div key={s.label} className="glass p-4">
              <p className="label-caps">{s.label}</p>
              <p className="mt-2 text-xl text-slate-100">{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* favorite ship */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="glass mt-4 flex items-center justify-between px-6 py-4"
        >
          <div>
            <p className="label-caps">Favorite Vessel</p>
            <p className="mt-1 text-lg text-slate-100">
              {SHIP_MAP[favoriteShip]?.name ?? "—"}
            </p>
          </div>
          <ShipModel shipId={favoriteShip} size={150} />
        </motion.div>

        {/* timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mt-10"
        >
          <p className="label-caps mb-4">Flight History</p>
          {store.history.length === 0 ? (
            <div className="glass p-8 text-center text-sm text-slate-500">
              No completed flights yet. Plot a course from the galaxy map and
              your journeys will be logged here.
            </div>
          ) : (
            <ol className="space-y-3">
              {store.history.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + Math.min(i, 8) * 0.06 }}
                  className="glass flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <p className="text-sm text-slate-100">
                      {PLANET_MAP[r.originId]?.name ?? r.originId} →{" "}
                      {PLANET_MAP[r.destinationId]?.name ?? r.destinationId}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      via {r.path.map((p) => PLANET_MAP[p]?.name ?? p).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm text-slate-200">
                        {formatMinutes(r.focusSeconds / 60)}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {formatDistance(r.distance)}
                      </p>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-glow-cyan">
                      {formatDate(r.completedAt)}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </motion.div>
      </section>
    </main>
  );
}
