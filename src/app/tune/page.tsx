"use client";

// Hidden chase-view tuning page (not linked from the nav).
// Drives the real ChaseView scene: adjust the sliders until the ship reads
// right, then copy the readout. yaw is an offset on top of the ship's
// noseYaw; cam/look map 1:1 onto the camera pose in ChaseView.

import { useRef, useState } from "react";
import ChaseView, { ChaseTuning } from "@/components/ChaseView";
import { SHIPS } from "@/lib/data";

function defaultsFor(shipIndex: number): ChaseTuning {
  const ship = SHIPS[shipIndex];
  return {
    yawDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    camX: 0,
    camY: 1.3,
    camZ: Math.round(4.9 * ship.modelZoom * 100) / 100,
    lookY: -0.55,
    lookZ: -7,
    warp: 1,
  };
}

const SLIDERS: {
  key: keyof ChaseTuning;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "yawDeg", label: "Ship yaw offset (°)", min: -180, max: 180, step: 0.5 },
  { key: "pitchDeg", label: "Ship pitch (°)", min: -45, max: 45, step: 0.5 },
  { key: "rollDeg", label: "Ship roll (°)", min: -45, max: 45, step: 0.5 },
  { key: "camX", label: "Camera X", min: -3, max: 3, step: 0.05 },
  { key: "camY", label: "Camera Y (height)", min: -1, max: 4, step: 0.05 },
  { key: "camZ", label: "Camera Z (distance)", min: 1, max: 9, step: 0.05 },
  { key: "lookY", label: "Look-at Y", min: -2, max: 2, step: 0.05 },
  { key: "lookZ", label: "Look-at Z (ahead)", min: -20, max: 0, step: 0.25 },
  { key: "warp", label: "Warp", min: 0, max: 1, step: 0.05 },
];

export default function TunePage() {
  const [shipIndex, setShipIndex] = useState(0);
  const [params, setParams] = useState<ChaseTuning>(() => defaultsFor(0));
  const tuningRef = useRef<ChaseTuning>(params);
  tuningRef.current = params;

  const ship = SHIPS[shipIndex];
  const readout = `${ship.id}: yawOff=${params.yawDeg}° pitch=${params.pitchDeg}° roll=${params.rollDeg}° cam=(${params.camX}, ${params.camY}, ${params.camZ}) look=(0, ${params.lookY}, ${params.lookZ})`;

  return (
    <main className="relative h-screen select-none overflow-hidden bg-space-950">
      <ChaseView key={ship.id} shipId={ship.id} warp={1} tuningRef={tuningRef} />

      {/* control panel */}
      <div className="glass absolute right-4 top-4 z-20 w-80 p-5">
        <p className="label-caps mb-3">Chase View Tuner</p>

        <select
          value={shipIndex}
          onChange={(e) => {
            const i = Number(e.target.value);
            setShipIndex(i);
            setParams(defaultsFor(i));
          }}
          className="mb-4 w-full rounded-lg border border-white/15 bg-space-900 px-3 py-2 text-sm text-slate-200"
        >
          {SHIPS.map((s, i) => (
            <option key={s.id} value={i}>
              {s.name}
            </option>
          ))}
        </select>

        {SLIDERS.map((s) => (
          <label key={s.key} className="mb-2 block">
            <span className="flex justify-between text-[11px] uppercase tracking-[0.15em] text-slate-400">
              {s.label}
              <span className="tabular-nums text-slate-200">
                {params[s.key]}
              </span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={params[s.key]}
              onChange={(e) =>
                setParams((p) => ({ ...p, [s.key]: Number(e.target.value) }))
              }
              className="w-full accent-[#e5c15c]"
            />
          </label>
        ))}

        <button
          onClick={() => setParams(defaultsFor(shipIndex))}
          className="btn-ghost mt-1 w-full px-4 py-2 text-[11px]"
        >
          Reset to current
        </button>

        <p className="label-caps mb-1 mt-4">Send these numbers</p>
        <textarea
          readOnly
          value={readout}
          onFocus={(e) => e.target.select()}
          className="h-20 w-full rounded-lg border border-white/15 bg-space-900 p-2 text-xs text-glow-gold"
        />
      </div>
    </main>
  );
}
