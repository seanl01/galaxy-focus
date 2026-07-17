"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Starfield from "@/components/Starfield";
import Nav from "@/components/Nav";
import GalaxyMap from "@/components/GalaxyMap";
import PlanetDisc from "@/components/PlanetDisc";
import ShipModel from "@/components/ShipModel";
import { useStore } from "@/lib/store";
import { PLANET_MAP, REGION_ORDER, SHIPS } from "@/lib/data";
import { findPath } from "@/lib/graph";
import { formatDistance, formatMinutes } from "@/lib/format";
import { playClick } from "@/lib/audio";

export default function MapPage() {
  const store = useStore();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shipId, setShipId] = useState(store.shipId);

  const selected = selectedId ? PLANET_MAP[selectedId] : null;
  const route = useMemo(
    () =>
      selectedId && selectedId !== store.currentPlanetId
        ? findPath(store.currentPlanetId, selectedId)
        : null,
    [selectedId, store.currentPlanetId]
  );

  const focusMinutes =
    store.settings.focusMode === "custom"
      ? store.settings.customMinutes
      : route?.duration ?? 0;

  const startFlight = () => {
    if (!selectedId) return;
    if (store.settings.sound) playClick();
    if (store.startJourney(selectedId, shipId)) {
      router.push("/flight");
    }
  };

  return (
    <main className="relative h-screen overflow-hidden">
      <Starfield density={1.6} drift={1.5} />
      <Nav />

      <div className="absolute inset-0 pt-16">
        <GalaxyMap
          currentPlanetId={store.currentPlanetId}
          selectedId={selectedId}
          highlightPath={route?.path ?? []}
          visited={store.visited}
          onSelect={(id) => {
            if (store.settings.sound) playClick();
            setSelectedId((cur) => (cur === id ? null : id));
          }}
        />
      </div>

      {/* Region legend */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-20 hidden md:block">
        <div className="glass px-5 py-4">
          <p className="label-caps mb-3">Regions</p>
          <ul className="space-y-1.5">
            {REGION_ORDER.map((r) => (
              <li
                key={r}
                className="text-[11px] uppercase tracking-[0.2em] text-slate-400"
              >
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Destination panel */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            key={selected.id}
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 190, damping: 26 }}
            className="absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-space-950/85 px-8 pb-8 pt-24 backdrop-blur-2xl"
          >
            <button
              onClick={() => setSelectedId(null)}
              className="absolute right-6 top-20 text-xs uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-200"
            >
              Close ✕
            </button>

            <div className="flex items-center gap-5">
              <div className="animate-float-slow shrink-0">
                <PlanetDisc planet={selected} size={110} />
              </div>
              <div>
                <p className="label-caps">Destination</p>
                <h2 className="mt-1 text-3xl font-medium text-slate-100">
                  {selected.name}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                  {selected.region}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              {selected.description}
            </p>

            {selected.id === store.currentPlanetId ? (
              <div className="glass mt-8 p-5 text-center">
                <p className="text-sm text-glow-cyan">
                  You are currently in this system.
                </p>
              </div>
            ) : route ? (
              <>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="glass p-4">
                    <p className="label-caps">Distance</p>
                    <p className="mt-1 text-xl text-slate-100">
                      {formatDistance(route.distance)}
                    </p>
                  </div>
                  <div className="glass p-4">
                    <p className="label-caps">Est. Flight</p>
                    <p className="mt-1 text-xl text-slate-100">
                      {formatMinutes(focusMinutes)}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="label-caps mb-3">Hyperspace Route</p>
                  <ol className="space-y-0">
                    {route.path.map((id, i) => (
                      <li key={id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`mt-1 h-2 w-2 rounded-full ${
                              i === 0
                                ? "bg-glow-cyan"
                                : i === route.path.length - 1
                                  ? "bg-glow-gold"
                                  : "bg-slate-500"
                            }`}
                          />
                          {i < route.path.length - 1 && (
                            <span className="my-0.5 h-5 w-px bg-white/15" />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className="text-sm text-slate-200">
                            {PLANET_MAP[id].name}
                          </p>
                          {i < route.path.length - 1 && (
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              {formatMinutes(route.legs[i].duration)} ·{" "}
                              {formatDistance(route.legs[i].distance)}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-4">
                  <p className="label-caps mb-3">Vessel</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {SHIPS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setShipId(s.id);
                          if (store.settings.sound) playClick();
                        }}
                        className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-all duration-300 ${
                          shipId === s.id
                            ? "border-glow-gold/70 bg-glow-gold/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25"
                        }`}
                        aria-pressed={shipId === s.id}
                      >
                        <ShipModel shipId={s.id} size={86} spin={false} />
                        <span className="max-w-[72px] truncate text-[9px] uppercase tracking-[0.14em] text-slate-400">
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={startFlight} className="btn-primary mt-6 w-full">
                  Start Flight
                </button>
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  {store.settings.focusMode === "custom"
                    ? "Custom focus duration active"
                    : "Flight time equals focus time"}
                </p>
              </>
            ) : (
              <div className="glass mt-8 p-5 text-center">
                <p className="text-sm text-slate-400">
                  No charted hyperspace route reaches this system.
                </p>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
