// ---------------------------------------------------------------------------
// Procedural audio — no external assets. A single lazily-created AudioContext
// drives a soft hyperspace rumble (filtered brown noise), a jump swoosh and a
// gentle arrival chime. Everything is deliberately quiet.
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientSource: AudioBufferSourceNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function brownNoiseBuffer(ac: AudioContext, seconds = 4): AudioBuffer {
  const length = ac.sampleRate * seconds;
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

export function startAmbience(): void {
  const ac = getCtx();
  if (!ac || ambientSource) return;

  const source = ac.createBufferSource();
  source.buffer = brownNoiseBuffer(ac);
  source.loop = true;

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  filter.Q.value = 0.4;

  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.05, ac.currentTime + 2.5);

  source.connect(filter).connect(gain).connect(ac.destination);
  source.start();

  ambientSource = source;
  ambientGain = gain;
}

export function stopAmbience(): void {
  if (!ctx || !ambientSource || !ambientGain) return;
  const src = ambientSource;
  ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  ambientSource = null;
  ambientGain = null;
  window.setTimeout(() => {
    try {
      src.stop();
    } catch {
      // already stopped
    }
  }, 1400);
}

export function isAmbiencePlaying(): boolean {
  return ambientSource !== null;
}

export function playJump(): void {
  const ac = getCtx();
  if (!ac) return;

  const source = ac.createBufferSource();
  source.buffer = brownNoiseBuffer(ac, 2);

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(120, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2400, ac.currentTime + 1.4);
  filter.Q.value = 1.4;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, ac.currentTime + 1.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 2);

  source.connect(filter).connect(gain).connect(ac.destination);
  source.start();
  source.stop(ac.currentTime + 2.1);
}

/**
 * Hyperspace exit: a restrained low thump with a short rush of air —
 * powerful but nothing like an explosion.
 */
export function playExitThump(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.28);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.16, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.55);

  const src = ac.createBufferSource();
  src.buffer = brownNoiseBuffer(ac, 1);
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + 0.6);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.09, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  src.connect(filter).connect(ng).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.75);
}

export function playChime(): void {
  const ac = getCtx();
  if (!ac) return;
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ac.createGain();
    const t = ac.currentTime + i * 0.22;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 1.7);
  });
}

export function playClick(): void {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 880;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.03, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.1);
}
