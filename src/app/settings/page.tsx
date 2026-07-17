"use client";

import { motion } from "framer-motion";
import Starfield from "@/components/Starfield";
import Nav from "@/components/Nav";
import ShipModel from "@/components/ShipModel";
import { useStore } from "@/lib/store";
import { SHIPS } from "@/lib/data";
import { playClick } from "@/lib/audio";

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${
        on ? "bg-glow-gold" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const store = useStore();
  const s = store.settings;

  const set = (patch: Parameters<typeof store.updateSettings>[0]) => {
    if (s.sound) playClick();
    store.updateSettings(patch);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Starfield density={1.0} />
      <Nav />

      <section className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-20 pt-28">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="text-3xl font-light uppercase tracking-[0.25em] text-slate-100"
        >
          Settings
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mt-8 space-y-4"
        >
          {/* Focus duration */}
          <div className="glass p-6">
            <p className="label-caps mb-4">Focus Duration</p>
            <div className="flex gap-2">
              <button
                onClick={() => set({ focusMode: "route" })}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                  s.focusMode === "route"
                    ? "border-glow-gold/70 bg-glow-gold/10"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <p className="text-sm text-slate-100">Route Time</p>
                <p className="mt-1 text-xs text-slate-500">
                  Focus for as long as the hyperspace route actually takes.
                </p>
              </button>
              <button
                onClick={() => set({ focusMode: "custom" })}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                  s.focusMode === "custom"
                    ? "border-glow-gold/70 bg-glow-gold/10"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <p className="text-sm text-slate-100">Custom Timer</p>
                <p className="mt-1 text-xs text-slate-500">
                  Every flight lasts a fixed duration of your choosing.
                </p>
              </button>
            </div>
            {s.focusMode === "custom" && (
              <div className="mt-4 flex items-center gap-4">
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={s.customMinutes}
                  onChange={(e) =>
                    store.updateSettings({ customMinutes: Number(e.target.value) })
                  }
                  className="flex-1 accent-[#e5c15c]"
                  aria-label="Custom focus minutes"
                />
                <span className="w-20 text-right text-sm tabular-nums text-slate-200">
                  {s.customMinutes} min
                </span>
              </div>
            )}
          </div>

          {/* Sound */}
          <div className="glass flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-100">Interface Sound</p>
              <p className="mt-1 text-xs text-slate-500">
                Clicks, hyperspace jump and arrival chime.
              </p>
            </div>
            <Toggle
              on={s.sound}
              onChange={(v) => store.updateSettings({ sound: v })}
              label="Interface sound"
            />
          </div>

          {/* Reduce motion */}
          <div className="glass flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-100">Reduce Motion</p>
              <p className="mt-1 text-xs text-slate-500">
                Also respects your system accessibility preference.
              </p>
            </div>
            <Toggle
              on={s.reduceMotion}
              onChange={(v) => set({ reduceMotion: v })}
              label="Reduce motion"
            />
          </div>

          {/* Default ship */}
          <div className="glass p-6">
            <p className="label-caps mb-4">Default Vessel</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SHIPS.map((ship) => (
                <button
                  key={ship.id}
                  onClick={() => {
                    if (s.sound) playClick();
                    store.setShip(ship.id);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-all duration-300 ${
                    store.shipId === ship.id
                      ? "border-glow-gold/70 bg-glow-gold/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                  aria-pressed={store.shipId === ship.id}
                >
                  <ShipModel shipId={ship.id} size={120} spin={false} />
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                    {ship.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model credits (CC-BY attribution) */}
          <div className="glass p-6">
            <p className="label-caps mb-3">Model Credits</p>
            <ul className="space-y-1">
              {SHIPS.map((ship) => (
                <li key={ship.id} className="text-xs text-slate-500">
                  {ship.credit}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-600">
              Ship models are Creative Commons Attribution assets from
              poly.pizza and Sketchfab, licensed by their respective authors.
            </p>
          </div>

          <p className="pt-4 text-center text-[10px] uppercase tracking-[0.22em] text-slate-600">
            Progress is stored locally in your browser.
          </p>
        </motion.div>
      </section>
    </main>
  );
}
