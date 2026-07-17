"use client";

// Full-screen first-person cockpit interior, built from layered CSS.
// The canopy is a circular cutout (a giant box-shadow around a round div),
// so whatever renders behind — the hyperspace canvas, the approaching
// planet — shows through, framed by struts, a dashboard and side pillars.
// Everything here is decorative and pointer-events-none; the functional
// HUD lives in CockpitHUD.

// Deterministic pseudo-random so the prerendered HTML matches hydration.
const pr = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;

function Lights({
  count,
  seed,
  className = "",
}: {
  count: number;
  seed: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const r = pr(i * 13 + seed * 31);
        const color =
          r < 0.45
            ? "#6f9fe8"
            : r < 0.68
              ? "#e5c15c"
              : r < 0.84
                ? "#ff6a5e"
                : "#dfe6f2";
        return (
          <span
            key={i}
            className="ck-blink h-[5px] w-[5px] rounded-[1px]"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}55`,
              animationDelay: `${(r * 4).toFixed(2)}s`,
              animationDuration: `${(2.2 + pr(i * 7 + seed) * 3).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function Screen({
  label,
  footer,
  children,
  className = "",
}: {
  label: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-glow-blue/40 bg-[#050a14]/95 px-4 pb-3 pt-2.5 shadow-[inset_0_0_28px_rgba(90,130,235,0.22),0_0_20px_rgba(90,130,235,0.12),0_2px_16px_rgba(0,0,0,0.6)] ${className}`}
    >
      <p className="mb-2 text-center text-[9px] uppercase tracking-[0.3em] text-glow-blue/80">
        {label}
      </p>
      {children}
      {footer && (
        <p className="mt-2 text-center text-[9px] uppercase tracking-[0.2em] text-glow-blue/60">
          {footer}
        </p>
      )}
    </div>
  );
}

function EngineBars() {
  return (
    <Screen label="Engines" footer="100%" className="w-40">
      <div className="flex h-14 items-end justify-center gap-2">
        {[0.9, 0.62, 0.8, 0.55, 0.74].map((h, i) => (
          <span
            key={i}
            className="ck-eq w-3 rounded-sm bg-gradient-to-t from-[#274f9e] to-[#9cc8ff]"
            style={{
              height: `${h * 100}%`,
              animationDelay: `${i * 0.45}s`,
              animationDuration: `${2.8 + i * 0.4}s`,
              boxShadow: "0 0 10px rgba(120, 170, 255, 0.35)",
            }}
          />
        ))}
      </div>
    </Screen>
  );
}

function Radar() {
  return (
    <div className="relative aspect-square w-44 rounded-full border border-glow-blue/50 bg-[#040910]/95 shadow-[inset_0_0_34px_rgba(90,130,235,0.25),0_0_24px_rgba(90,130,235,0.14),0_2px_20px_rgba(0,0,0,0.65)]">
      {/* range rings + crosshairs */}
      <div className="absolute inset-[18%] rounded-full border border-glow-blue/25" />
      <div className="absolute inset-[36%] rounded-full border border-glow-blue/25" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-glow-blue/20" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-glow-blue/20" />
      {/* rotating sweep */}
      <div
        className="ck-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(120,170,255,0.30), rgba(120,170,255,0.06) 60deg, transparent 90deg)",
        }}
      />
      {/* holographic ship blueprint (top-down) */}
      <svg
        viewBox="0 0 40 40"
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 opacity-90"
        fill="none"
        stroke="#9cc8ff"
        strokeWidth="1"
      >
        <path d="M20 6 L24 22 L32 30 L24 28 L20 34 L16 28 L8 30 L16 22 Z" />
        <circle cx="20" cy="22" r="2.5" />
      </svg>
    </div>
  );
}

function PowerDist() {
  return (
    <Screen label="Power Distribution" className="w-44">
      <div className="flex h-14 items-end justify-center gap-3">
        {[
          { k: "ENG", h: 0.85 },
          { k: "SHD", h: 0.6 },
          { k: "WEP", h: 0.45 },
          { k: "SYS", h: 0.7 },
        ].map((b, i) => (
          <div key={b.k} className="flex flex-col items-center gap-1">
            <span
              className="ck-eq w-3.5 rounded-sm bg-gradient-to-t from-[#274f9e] to-[#8fc0ff]"
              style={{
                height: `${b.h * 44}px`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${3.4 + i * 0.5}s`,
                boxShadow: "0 0 10px rgba(120, 170, 255, 0.3)",
              }}
            />
            <span className="text-[8px] tracking-[0.1em] text-glow-blue/60">
              {b.k}
            </span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

export default function Cockpit() {
  return (
    <div
      className="ck-drift pointer-events-none absolute inset-0 z-[7] overflow-hidden"
      style={{ "--ck": "min(125vh, 88vw)" } as React.CSSProperties}
      aria-hidden
    >
      <div className="ck-vibe absolute inset-0">
        {/* Cockpit shell: everything outside the canopy circle goes dark. */}
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "var(--ck)",
            height: "var(--ck)",
            boxShadow: "0 0 0 4000px #070a12",
          }}
        />

        {/* Canopy rim: metal ring + soft blue interior glow. */}
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-[#161d2b]"
          style={{
            width: "var(--ck)",
            height: "var(--ck)",
            boxShadow:
              "inset 0 0 60px rgba(90, 130, 235, 0.12), inset 0 0 4px rgba(255,255,255,0.12), 0 0 40px rgba(90,130,235,0.10)",
          }}
        />

        {/* Radial canopy struts. Their hub sits low, hidden behind the
            dashboard, so only the upper spans cross the glass — spokes,
            not a dark knot at the tunnel's vanishing point. */}
        <div
          className="absolute left-1/2 top-[78%]"
          style={{ width: 0, height: 0 }}
        >
          {[-44, -22, 0, 22, 44].map((deg) => (
            <div
              key={deg}
              className="absolute bottom-0 left-0 origin-bottom"
              style={{
                width: "9px",
                height: "92vh",
                transform: `translateX(-50%) rotate(${deg}deg)`,
                background:
                  "linear-gradient(to right, rgba(5,7,13,0.9), #182132 45%, #232e44 55%, rgba(5,7,13,0.9))",
                boxShadow:
                  "0 0 10px rgba(0,0,0,0.6), inset 0 0 1px rgba(150,180,240,0.4)",
              }}
            />
          ))}
        </div>

        {/* Faint volumetric haze at the tunnel core. */}
        <div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "var(--ck)",
            height: "var(--ck)",
            background:
              "radial-gradient(circle, rgba(150,190,255,0.10) 0%, rgba(150,190,255,0.03) 32%, transparent 62%)",
          }}
        />

        {/* Ceiling shading. */}
        <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-black/70 to-transparent" />

        {/* Side pillars. */}
        <div
          className="absolute inset-y-0 left-0 w-[11%] bg-gradient-to-r from-[#0a0e18] via-[#0b101b] to-transparent"
          style={{ clipPath: "polygon(0 0, 100% 10%, 100% 90%, 0 100%)" }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[11%] bg-gradient-to-l from-[#0a0e18] via-[#0b101b] to-transparent"
          style={{ clipPath: "polygon(100% 0, 0 10%, 0 90%, 100% 100%)" }}
        />
        <Lights count={4} seed={11} className="absolute left-[2.5%] top-[30%] flex-col" />
        <Lights count={4} seed={23} className="absolute right-[2.5%] top-[30%] flex-col" />

        {/* Dashboard. */}
        <div className="absolute inset-x-0 bottom-0 h-[32%]">
          {/* raised cowl with rim light */}
          <div
            className="absolute inset-x-[-4%] top-0 h-full"
            style={{
              background:
                "linear-gradient(to bottom, #0d1220 0%, #0a0e18 30%, #05070d 100%)",
              borderRadius: "48% 48% 0 0 / 16% 16% 0 0",
              boxShadow:
                "0 -1px 0 rgba(255,255,255,0.07), 0 -8px 32px rgba(90,130,235,0.08)",
            }}
          />
          {/* console screens */}
          <div className="absolute bottom-[16%] left-[13%]">
            <EngineBars />
          </div>
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2">
            <Radar />
          </div>
          <div className="absolute bottom-[16%] right-[13%]">
            <PowerDist />
          </div>
          {/* switchgear + indicator clusters */}
          <Lights count={7} seed={3} className="absolute bottom-[52%] left-[31%]" />
          <Lights count={5} seed={7} className="absolute bottom-[60%] left-[38%]" />
          <Lights count={7} seed={17} className="absolute bottom-[52%] right-[31%]" />
          <Lights count={5} seed={29} className="absolute bottom-[60%] right-[38%]" />
          <Lights count={6} seed={41} className="absolute bottom-[10%] left-[34%]" />
          <Lights count={6} seed={53} className="absolute bottom-[10%] right-[34%]" />
        </div>
      </div>
    </div>
  );
}
