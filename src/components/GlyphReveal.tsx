"use client";

import { useEffect, useRef } from "react";

// A burst of angular glyphs that continuously reshuffle, then decode
// left-to-right into the real title — an "ancient computer translating an
// alien script" reveal. We use a Runic subset rather than bundling a
// restrictively-licensed Aurebesh font; the geometry reads the same way and
// keeps to the project's procedural, dependency-free aesthetic.
const GLYPHS = "ᚨᚱᚲᚷᚺᛁᛃᛈᛊᛏᛒᛖᛗᛚᛜᛞᛟᚦᚹᚾᛇᚠᚢᚩᛉᛘᛦᚧᚴᛥᛠ";

const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

interface GlyphRevealProps {
  text: string;
  className?: string;
  /** Element to render as (default "span"). Use the surrounding heading. */
  as?: React.ElementType;
  /** Delay before decoding begins (ms). Glyphs scramble during the wait. */
  delay?: number;
  /** Per-character decode stagger (ms) — the left-to-right cadence. */
  stagger?: number;
  /** Global scramble window before locking begins (ms). */
  scramble?: number;
}

/**
 * Renders `text` with a scramble-decode reveal. The real text is always in the
 * DOM (screen-reader label + SSR), so this is purely a visual enhancement;
 * reduce-motion resolves it instantly.
 */
export default function GlyphReveal({
  text,
  className,
  as: Tag = "span",
  delay = 0,
  stagger = 40,
  scramble = 350,
}: GlyphRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const spans = Array.from(
      root.querySelectorAll<HTMLElement>("[data-glyph]")
    );
    if (!spans.length) return;

    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");

    const chars = spans.map((el, i) => {
      const final = el.textContent ?? "";
      return {
        el,
        final,
        isSpace: final.trim().length === 0,
        locked: false,
        // Everyone scrambles through the window, then locks in reading order
        // with a little jitter so the decode never feels metronomic.
        lock: delay + scramble + i * stagger + Math.random() * stagger * 1.6,
      };
    });

    if (reduce) {
      for (const c of chars) c.el.classList.add("is-locked");
      return;
    }

    // Paint a scramble immediately so the real text never flashes first.
    for (const c of chars) {
      if (c.isSpace) c.el.classList.add("is-locked");
      else c.el.textContent = randGlyph();
    }

    const RESHUFFLE = 45; // ms between glyph reshuffles — rapid, not strobing
    let raf = 0;
    let start = 0;
    let lastShuffle = 0;

    const frame = (now: number) => {
      if (!start) {
        start = now;
        lastShuffle = now;
      }
      const t = now - start;
      const shuffle = now - lastShuffle >= RESHUFFLE;
      if (shuffle) lastShuffle = now;

      let done = true;
      for (const c of chars) {
        if (c.isSpace || c.locked) continue;
        if (t >= c.lock) {
          c.el.textContent = c.final;
          c.el.classList.add("is-locked");
          c.locked = true;
        } else {
          done = false;
          if (shuffle) c.el.textContent = randGlyph();
        }
      }
      if (!done) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, stagger, scramble]);

  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split("").map((ch, i) => (
          <span key={i} data-glyph className="glyph-char">
            {ch}
          </span>
        ))}
      </span>
    </Tag>
  );
}
