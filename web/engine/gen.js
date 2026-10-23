// gen.js — sample-level generators (pure; Float32Array out): noise colors, Karplus-Strong
// pluck, modal resonator, reverb impulse responses. Everything is seeded for reproducibility.

function peakNormalize(x, to = 1) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  if (p > 0) for (let i = 0; i < x.length; i++) x[i] *= to / p;
  return x;
}

function fadeOut(x, n) {
  n = Math.min(n, x.length);
  for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n;
  return x;
}

// colors: white | pink | brown | blue | crackle (sparse impulses, `density`/s) | sh (sample&hold at `rate` Hz: 8-bit style)
export function noise(len, sr, rng, { color = "white", density = 400, rate = 4000 } = {}) {
  const x = new Float32Array(len);
  const w = () => rng() * 2 - 1;
  if (color === "white") for (let i = 0; i < len; i++) x[i] = w();
  else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const v = w();
      b0 = 0.99765 * b0 + v * 0.099046;
      b1 = 0.963 * b1 + v * 0.2965164;
      b2 = 0.57 * b2 + v * 1.0526913;
      x[i] = b0 + b1 + b2 + v * 0.1848;
    }
  } else if (color === "brown") {
    let l = 0;
    for (let i = 0; i < len; i++) { l = (l + 0.02 * w()) / 1.02; x[i] = l; }
  } else if (color === "blue") {
    let p = 0;
    for (let i = 0; i < len; i++) { const v = w(); x[i] = v - p; p = v; }
  } else if (color === "crackle") {
    const p = density / sr;
    for (let i = 0; i < len; i++) if (rng() < p) x[i] = w() * (0.3 + 0.7 * rng());
  } else if (color === "sh") {
    const hold = Math.max(1, Math.round(sr / rate));
    let v = 0;
    for (let i = 0; i < len; i++) { if (i % hold === 0) v = w(); x[i] = v; }
  } else throw new Error(`noise color must be white|pink|brown|blue|crackle|sh, got ${color}`);
  return peakNormalize(x);
}

// Karplus-Strong plucked string with fractional-delay (allpass) tuning.
//   decay: T60 seconds of the fundamental; damping 0..1 (high-freq loss: 0 = metallic/bright, 1 = dull);
//   bright 0..1: excitation brightness (pick hardness)
export function pluck(len, sr, rng, { freq, decay = 1.0, damping = 0.5, bright = 0.7 }) {
  const s = 0.99 - 0.49 * Math.min(1, Math.max(0, damping)); // lowpass blend: 0.5 = max damping
  const P = sr / freq;
  let N = Math.floor(P - (1 - s));
  let frac = P - N - (1 - s);
  if (frac < 0.1) { N -= 1; frac += 1; }
  N = Math.max(2, N);
  const C = (1 - frac) / (1 + frac);
  const g = Math.pow(10, -3 / (decay * freq));
  const line = new Float32Array(N);
  let y = 0;
  const a = Math.exp(-2 * Math.PI * (200 + 18000 * bright * bright) / sr);
  for (let i = 0; i < N; i++) { y = (1 - a) * (rng() * 2 - 1) + a * y; line[i] = y; }
  peakNormalize(line);
  const out = new Float32Array(len);
  let idx = 0, prev = 0, apx = 0, apy = 0;
  for (let n = 0; n < len; n++) {
    const x = line[idx];
    out[n] = x;
    const lp = s * x + (1 - s) * prev;
    const ap = C * lp + apx - C * apy;
    apx = lp; apy = ap; prev = x;
    line[idx] = ap * g;
    idx = (idx + 1) % N;
  }
  return fadeOut(peakNormalize(out), Math.round(sr * 0.005));
}

// modal tables: r = frequency ratio, g = relative gain, d = relative decay
export const MODAL = {
  bar:     { r: [1, 2.756, 5.404, 8.933], g: [1, 0.5, 0.25, 0.12], d: [1, 0.5, 0.25, 0.12] },
  marimba: { r: [1, 3.99, 10.0], g: [1, 0.4, 0.1], d: [1, 0.4, 0.2] },
  glass:   { r: [1, 2.32, 4.25, 6.63, 9.38], g: [1, 0.6, 0.4, 0.25, 0.15], d: [1, 0.8, 0.6, 0.45, 0.3] },
  bell:    { r: [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011, 4.166, 5.433, 6.796, 8.215],
             g: [0.7, 1, 0.8, 0.5, 0.9, 0.4, 0.35, 0.4, 0.3, 0.2, 0.15, 0.1],
             d: [1.6, 1, 0.9, 0.75, 0.7, 0.5, 0.45, 0.45, 0.35, 0.3, 0.25, 0.2] },
  plate:   { r: [1, 1.593, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.6, 4.06],
             g: [1, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25],
             d: [1, 0.85, 0.75, 0.7, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35] },
  disc:    { r: [1, 1.73, 2.33, 3.91, 4.11, 6.3], g: [1, 0.8, 0.7, 0.5, 0.45, 0.3], d: [1, 0.9, 0.8, 0.6, 0.6, 0.45] },
  wood:    { r: [1, 2.572, 4.644, 6.984], g: [1, 0.4, 0.2, 0.1], d: [1, 0.35, 0.18, 0.1] },
  tube:    { r: [1, 3, 5, 7, 9], g: [1, 0.33, 0.2, 0.14, 0.11], d: [1, 0.8, 0.6, 0.5, 0.4] },
  string:  { r: [1, 2, 3, 4, 5, 6, 7, 8], g: [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12], d: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4] },
};

// Sum of exponentially decaying sines.
//   modes: preset name or [{r, g, d}] (d in ms, absolute) ; decay: base T60 ms (scales preset d)
//   damp: extra high-mode damping exponent (T60_i *= r^-damp); hardness 0..1 (1 = table gains, lower = darker strike)
//   beat: Hz detune of a twin per mode (shimmer); spread: random ±cents per mode (imperfect material)
export function modal(len, sr, rng, { freq, modes = "bar", decay = 600, damp = 0, hardness = 1, beat = 0, spread = 0 }) {
  let list;
  if (typeof modes === "string") {
    const t = MODAL[modes];
    if (!t) throw new Error(`modal preset must be one of ${Object.keys(MODAL).join("|")}, got ${modes}`);
    list = t.r.map((r, i) => ({ r, g: t.g[i], d: t.d[i] * decay }));
  } else list = modes.map((m) => ({ r: m.r, g: m.g ?? 1, d: m.d ?? decay }));
  const out = new Float32Array(len);
  const tilt = (r) => Math.pow(r, (Math.min(1, Math.max(0, hardness)) - 1) * 2);
  for (const m of list) {
    const T = (m.d / 1000) * Math.pow(m.r, -damp);
    const twins = beat ? [-beat / 2, beat / 2] : [0];
    for (const b of twins) {
      const f = freq * m.r * Math.pow(2, (spread * (rng() * 2 - 1)) / 1200) + b;
      if (f <= 20 || f >= sr * 0.45) continue;
      const amp = (m.g * tilt(m.r)) / twins.length;
      const k = -6.9078 / (T * sr);
      const w = (2 * Math.PI * f) / sr;
      const ph = rng() * 2 * Math.PI;
      const n = Math.min(len, Math.ceil(T * sr * 1.2));
      for (let i = 0; i < n; i++) out[i] += amp * Math.exp(k * i) * Math.sin(w * i + ph);
    }
  }
  const ramp = Math.round(sr * 0.0002);
  for (let i = 0; i < ramp; i++) out[i] *= i / ramp;
  return fadeOut(peakNormalize(out), Math.round(sr * 0.005));
}

// stereo reverb impulse response: decaying noise with time-varying damping + early reflections.
//   decay: T60 s; bright: Hz cutoff at t=0; damping: Hz cutoff at t=T60; size 0..1: ER spread & build-up; er: ER level
export function reverbIR(sr, rng, { decay = 1.2, bright = 12000, damping = 3000, size = 0.5, er = 0.5 }) {
  const len = Math.max(64, Math.ceil(decay * 1.1 * sr));
  const chans = [new Float32Array(len), new Float32Array(len)];
  const build = Math.max(1, Math.round(sr * (0.004 + size * 0.03)));
  for (const x of chans) {
    let y = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const fc = bright * Math.pow(damping / bright, Math.min(1, t / decay));
      const a = Math.exp((-2 * Math.PI * fc) / sr);
      y = (1 - a) * (rng() * 2 - 1) + a * y;
      x[i] = y * Math.exp((-6.9078 * t) / decay) * Math.min(1, i / build);
    }
    peakNormalize(x, 0.5);
    for (let k = 0; k < 8; k++) {
      const at = Math.round(sr * (0.002 + rng() * (0.005 + size * 0.06)));
      if (at < len) x[at] += er * (rng() < 0.5 ? -1 : 1) * (0.3 + 0.7 * rng()) * (1 - k / 10);
    }
  }
  return chans;
}
