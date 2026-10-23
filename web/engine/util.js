// util.js — small shared helpers (pure; runs in browser and node)

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(Math.abs(g), 1e-12));
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// 440 | "A4" | "C#5" | "Eb3" -> Hz
export function toHz(v) {
  if (typeof v === "number") return v;
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(v).trim());
  if (!m) throw new Error(`bad frequency/note: ${JSON.stringify(v)} (use Hz or e.g. "C5", "F#3")`);
  const pc = PC[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (parseInt(m[3], 10) + 1) * 12 + pc;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function hzToNote(hz) {
  if (!(hz > 0)) return null;
  const midi = 69 + 12 * Math.log2(hz / 440);
  const n = Math.round(midi);
  return { name: NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1), cents: Math.round((midi - n) * 100) };
}
