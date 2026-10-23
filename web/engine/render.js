// render.js — patch JSON -> normalized stereo Float32Arrays, via OfflineAudioContext.
// The same code runs in the review page (what the human hears) and headless Chrome (what gets baked).
// Patch format reference: docs/patch-format.md.
import { resolve } from "./resolve.js";
import { mulberry32, dbToGain, gainToDb, toHz } from "./util.js";
import { ampPoints, ampShape, checkPoints, endMs, sample } from "./env.js";
import { noise, pluck, modal, reverbIR } from "./gen.js";
import { momentaryMax } from "./analysis.js";

const MAX_S = 8;

// ---------- validation (typos are the #1 silent failure for an agent writing JSON) ----------
const COMMON = ["type", "at", "gain", "pan", "env", "filter", "drive", "eq", "am", "ring", "bend", "vibrato", "mute", "label"];
const KEYS = {
  osc: [...COMMON, "freq", "wave", "harmonics", "unison"],
  noise: [...COMMON, "color", "density", "rate"],
  fm: [...COMMON, "freq", "wave", "mods"],
  pluck: [...COMMON, "freq", "decay", "damping", "bright"],
  modal: [...COMMON, "freq", "modes", "decay", "damp", "hardness", "beat", "spread"],
  sample: [...COMMON, "src", "pitch", "start", "length", "reverse", "fadeIn", "fadeOut", "normalize"],
};
const PATCH_KEYS = ["note", "name", "layers", "bus", "tags", "parent", "axes"];
const BUS_KEYS = ["hp", "eq", "drive", "comp", "reverb", "delay", "width", "gain"];
const FILTER_TYPES = ["lowpass", "highpass", "bandpass", "notch", "peaking", "lowshelf", "highshelf", "allpass"];

function unknown(obj, allowed, where, warn) {
  for (const k of Object.keys(obj || {})) if (!allowed.includes(k)) warn.push(`${where}: unknown key "${k}" (allowed: ${allowed.join(", ")})`);
}

export function validate(p) {
  const warn = [];
  if (!p || !Array.isArray(p.layers) || !p.layers.length) throw new Error("patch needs a non-empty `layers` array");
  unknown(p, PATCH_KEYS, "patch", warn);
  unknown(p.bus, BUS_KEYS, "bus", warn);
  p.layers.forEach((L, i) => {
    const where = `layers[${i}]${L.label ? ` (${L.label})` : ""}`;
    if (!KEYS[L.type]) throw new Error(`${where}: type must be one of ${Object.keys(KEYS).join("|")}, got ${JSON.stringify(L.type)}`);
    unknown(L, KEYS[L.type], where, warn);
    if (["osc", "fm", "pluck", "modal"].includes(L.type) && L.freq == null) throw new Error(`${where}: needs freq (Hz or note name)`);
    if (L.type === "sample" && !L.src) throw new Error(`${where}: needs src (e.g. "lib:kenney_impact-sounds/...")`);
    for (const f of [].concat(L.filter || [], L.eq || [])) if (!FILTER_TYPES.includes(f.type)) throw new Error(`${where}: filter/eq type must be one of ${FILTER_TYPES.join("|")}, got ${f.type}`);
  });
  return warn;
}

// ---------- node builders ----------
function curveParam(param, t0, points, durMs, shape, opts) {
  const arr = sample(points, durMs, shape, opts);
  param.setValueAtTime(arr[0], t0);
  param.setValueCurveAtTime(arr, t0, Math.max(0.001, durMs / 1000));
}

function biquad(ctx, f, t0, durMs) {
  const b = ctx.createBiquadFilter();
  b.type = f.type;
  b.Q.value = f.q ?? (f.type === "peaking" ? 1 : 0.707);
  if (f.gain != null) b.gain.value = f.gain;
  if (f.env) curveParam(b.frequency, t0, checkPoints(f.env, "filter.env"), durMs, "exp", { floor: 10 });
  else b.frequency.value = toHz(f.freq ?? 1000);
  return b;
}

function chain(ctx, input, nodes) {
  let cur = input;
  for (const n of nodes) { cur.connect(n.in ?? n); cur = n.out ?? n; }
  return cur;
}

const curves = new Map();
function shaperCurve(type, driveDb, bits) {
  const key = `${type}:${driveDb}:${bits}`;
  if (curves.has(key)) return curves.get(key);
  const n = 4096, c = new Float32Array(n), g = dbToGain(driveDb);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, v = x * g;
    let y;
    if (type === "tanh") y = Math.tanh(v) / Math.tanh(g);
    else if (type === "hard") y = Math.max(-1, Math.min(1, v));
    else if (type === "fold") y = Math.sin((v * Math.PI) / 2);
    else if (type === "asym") y = (v >= 0 ? Math.tanh(v) : Math.tanh(v * 0.6) / 0.6 * 0.8) / Math.tanh(g);
    else if (type === "crush") { const q = Math.pow(2, (bits ?? 6) - 1); y = Math.round(x * q) / q; }
    else throw new Error(`drive.type must be tanh|hard|fold|asym|crush, got ${type}`);
    c[i] = y;
  }
  curves.set(key, c);
  return c;
}

// drive: {type, amount (dB into the shaper), mix 0..1, out (dB), bits (crush)}
function driveNode(ctx, d) {
  const inp = ctx.createGain(), out = ctx.createGain(), ws = ctx.createWaveShaper();
  ws.curve = shaperCurve(d.type ?? "tanh", d.amount ?? 12, d.bits);
  ws.oversample = "4x";
  const wet = ctx.createGain(), dry = ctx.createGain();
  const mix = d.mix ?? 1;
  wet.gain.value = mix * dbToGain(d.out ?? 0);
  dry.gain.value = 1 - mix;
  inp.connect(ws).connect(wet).connect(out);
  inp.connect(dry).connect(out);
  return { in: inp, out };
}

const HARM = 64;
function periodicWave(ctx, wave, harmonics, phase) {
  // custom harmonic amplitudes, or a built-in shape with a phase offset (decorrelates unison voices)
  const real = new Float32Array(HARM + 1), imag = new Float32Array(HARM + 1);
  const amp = (k) => {
    if (harmonics) return harmonics[k - 1] ?? 0;
    if (wave === "sine") return k === 1 ? 1 : 0;
    if (wave === "sawtooth") return 2 / (Math.PI * k);
    if (wave === "square") return k % 2 ? 4 / (Math.PI * k) : 0;
    if (wave === "triangle") return k % 2 ? (8 / (Math.PI * Math.PI * k * k)) * (((k - 1) / 2) % 2 ? -1 : 1) : 0;
    throw new Error(`wave must be sine|triangle|sawtooth|square, got ${wave}`);
  };
  for (let k = 1; k <= HARM; k++) { const a = amp(k); real[k] = a * Math.sin(k * phase); imag[k] = a * Math.cos(k * phase); }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: !harmonics });
}

// pitch modulation shared by every pitched source: bend (semitone points) + vibrato
function pitchMods(ctx, L, detuneParams, t0, durMs, offsets) {
  if (L.bend) {
    const pts = checkPoints(L.bend, "bend");
    detuneParams.forEach((p, i) => curveParam(p, t0, pts, durMs, "lin", { map: (v) => v * 100 + (offsets[i] || 0) }));
  } else detuneParams.forEach((p, i) => (p.value = offsets[i] || 0));
  if (L.vibrato) {
    const v = L.vibrato, lfo = ctx.createOscillator(), g = ctx.createGain();
    lfo.frequency.value = v.rate ?? 6;
    const depth = v.depth ?? 20, delay = (v.delay ?? 0) / 1000;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0, t0 + delay);
    g.gain.linearRampToValueAtTime(depth, t0 + delay + (v.fade ?? 50) / 1000);
    lfo.connect(g);
    detuneParams.forEach((p) => g.connect(p));
    lfo.start(t0); lfo.stop(t0 + durMs / 1000 + 0.05);
  }
}

// samples often begin with silence/room noise: unless `start` is given, skip to 1 ms before the
// first sample above -40 dB of the file's peak (on the reversed data when `reverse`)
const autoStart = new WeakMap();
function sampleStartMs(buf, L) {
  if (L.start != null) return L.start;
  const key = L.reverse ? "r" : "f";
  const memo = autoStart.get(buf) || {};
  if (memo[key] == null) {
    const d = buf.getChannelData(0), n = d.length;
    let p = 0;
    for (let i = 0; i < n; i++) p = Math.max(p, Math.abs(d[i]));
    let first = 0;
    for (let i = 0; i < n; i++) { const v = Math.abs(d[L.reverse ? n - 1 - i : i]); if (v > p * 0.01) { first = i; break; } }
    memo[key] = Math.max(0, (first / buf.sampleRate) * 1000 - 1);
    autoStart.set(buf, memo);
  }
  return memo[key];
}

async function buildLayer(ctx, L, dest, rng, assets) {
  const sr = ctx.sampleRate, t0 = (L.at ?? 0) / 1000;
  const ampPts = ampPoints(L.env);
  let durMs = endMs(ampPts);
  const stopAt = t0 + durMs / 1000 + 0.02;
  const src = ctx.createGain();
  const detunes = [], offsets = [];
  const bufSrc = (data) => {
    const b = ctx.createBuffer(1, data.length, sr);
    b.copyToChannel(data, 0);
    const s = ctx.createBufferSource();
    s.buffer = b;
    return s;
  };

  if (L.type === "osc") {
    const u = L.unison ?? {}, n = u.voices ?? 1, det = u.detune ?? 15, spread = u.spread ?? 0.5;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      const pos = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      if (L.harmonics || n > 1) o.setPeriodicWave(periodicWave(ctx, L.wave ?? "sine", L.harmonics, n > 1 ? rng() * 2 * Math.PI : 0));
      else o.type = L.wave ?? "sine";
      o.frequency.value = toHz(L.freq);
      detunes.push(o.detune); offsets.push(pos * det);
      const g = ctx.createGain();
      g.gain.value = 1 / Math.sqrt(n);
      if (n > 1 && spread) { const p = ctx.createStereoPanner(); p.pan.value = pos * spread; o.connect(g).connect(p).connect(src); }
      else o.connect(g).connect(src);
      o.start(t0); o.stop(stopAt);
    }
  } else if (L.type === "fm") {
    const f = toHz(L.freq), car = ctx.createOscillator();
    car.type = L.wave ?? "sine";
    car.frequency.value = f;
    detunes.push(car.detune); offsets.push(0);
    const mods = (L.mods ?? []).map((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = m.wave ?? "sine";
      const mf = f * (m.ratio ?? 1) + (m.offset ?? 0);
      o.frequency.value = mf;
      detunes.push(o.detune); offsets.push(0);
      // index = peak deviation / modulator freq
      if (m.index && typeof m.index === "object") curveParam(g.gain, t0, checkPoints(m.index, `mods[${i}].index`), durMs, "lin", { map: (v) => v * mf });
      else g.gain.value = (m.index ?? 2) * mf;
      o.connect(g);
      o.start(t0); o.stop(stopAt);
      return { o, g, into: m.into };
    });
    mods.forEach((m) => m.g.connect(m.into == null ? car.frequency : mods[m.into].o.frequency));
    car.connect(src);
    car.start(t0); car.stop(stopAt);
  } else if (L.type === "noise") {
    const s = bufSrc(noise(Math.ceil((durMs / 1000 + 0.03) * sr), sr, rng, L));
    s.connect(src); s.start(t0);
  } else if (L.type === "pluck" || L.type === "modal") {
    const len = Math.ceil((durMs / 1000 + 0.03) * sr);
    const s = bufSrc(L.type === "pluck" ? pluck(len, sr, rng, { ...L, freq: toHz(L.freq) }) : modal(len, sr, rng, { ...L, freq: toHz(L.freq) }));
    detunes.push(s.detune); offsets.push(0);
    s.connect(src); s.start(t0);
  } else if (L.type === "sample") {
    let buf = await assets.load(L.src);
    const ch = buf.getChannelData(0);
    let data = Float32Array.from(ch);
    if (buf.numberOfChannels > 1) { const r = buf.getChannelData(1); for (let i = 0; i < data.length; i++) data[i] = (data[i] + r[i]) / 2; }
    if (L.reverse) data.reverse();
    if (L.normalize !== false) { let p = 0; for (const v of data) p = Math.max(p, Math.abs(v)); if (p > 0) for (let i = 0; i < data.length; i++) data[i] /= p; }
    const rate = Math.pow(2, (L.pitch ?? 0) / 12);
    const startS = sampleStartMs(buf, L) / 1000;
    const availMs = ((buf.duration - startS) / rate) * 1000;
    const lenMs = Math.min(L.length ?? availMs, availMs);
    if (!L.env) {
      // default env for samples: play as-is with short fades
      const fi = L.fadeIn ?? 0, fo = Math.min(L.fadeOut ?? 10, lenMs / 2);
      ampPts.length = 0;
      ampPts.push([0, fi ? 0 : 1], [fi, 1], [lenMs - fo, 1], [lenMs, 0, "lin"]);
      durMs = lenMs;
    } else durMs = Math.min(durMs, lenMs);
    if (L.length != null) {
      // hard-limit the sample to `length` (with a fadeOut) even when an env is longer
      const end = Math.round((startS + (lenMs / 1000) * rate) * buf.sampleRate);
      const fo = Math.max(1, Math.round(((Math.min(L.fadeOut ?? 10, lenMs / 2) / 1000) * rate) * buf.sampleRate));
      for (let i = Math.max(0, end - fo); i < data.length; i++) data[i] *= i >= end ? 0 : (end - i) / fo;
    }
    const b = ctx.createBuffer(1, data.length, buf.sampleRate);
    b.copyToChannel(data, 0);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    detunes.push(s.detune); offsets.push(0);
    s.connect(src);
    s.start(t0, startS);
  }
  pitchMods(ctx, L, detunes, t0, durMs, offsets);

  const nodes = [];
  if (L.ring) {
    const r = L.ring, inp = ctx.createGain(), out = ctx.createGain(), rg = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
    const o = ctx.createOscillator();
    o.frequency.value = r.freq != null ? toHz(r.freq) : toHz(L.freq ?? 440) * (r.ratio ?? 1.5);
    rg.gain.value = 0;
    o.connect(rg.gain);
    inp.connect(rg).connect(wet).connect(out);
    inp.connect(dry).connect(out);
    wet.gain.value = r.mix ?? 1; dry.gain.value = 1 - (r.mix ?? 1);
    o.start(t0); o.stop(stopAt);
    nodes.push({ in: inp, out });
  }
  for (const f of [].concat(L.filter || [])) nodes.push(biquad(ctx, f, t0, durMs));
  const amp = ctx.createGain();
  curveParam(amp.gain, t0, ampPts, durMs, ampShape, { floor: 1e-4 });
  nodes.push(amp);
  if (L.am) {
    const a = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), depth = L.am.depth ?? 0.5;
    a.gain.value = 1 - depth / 2;
    lfo.frequency.value = L.am.rate ?? 8;
    lfo.type = L.am.wave ?? "sine";
    lg.gain.value = depth / 2;
    lfo.connect(lg).connect(a.gain);
    lfo.start(t0); lfo.stop(stopAt);
    nodes.push(a);
  }
  if (L.drive) nodes.push(driveNode(ctx, L.drive));
  for (const f of L.eq || []) nodes.push(biquad(ctx, f, t0, durMs));
  const g = ctx.createGain();
  g.gain.value = dbToGain(L.gain ?? 0);
  nodes.push(g);
  if (L.pan) { const p = ctx.createStereoPanner(); p.pan.value = L.pan; nodes.push(p); }
  chain(ctx, src, nodes).connect(dest);
  return t0 * 1000 + durMs;
}

function layerEndMs(L, assetsDur) {
  if (L.type === "sample" && !L.env) return (L.at ?? 0) + (assetsDur ?? 2000);
  return (L.at ?? 0) + endMs(ampPoints(L.env));
}

// ---------- bus ----------
function buildBus(ctx, bus, rng, dest) {
  const inp = ctx.createGain(), nodes = [];
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = bus.hp ?? 25; hp.Q.value = 0.707;
  nodes.push(hp);
  for (const f of bus.eq || []) nodes.push(biquad(ctx, f, 0, 10));
  if (bus.drive) nodes.push(driveNode(ctx, bus.drive));
  if (bus.comp) {
    const c = ctx.createDynamicsCompressor(), k = bus.comp;
    c.threshold.value = k.threshold ?? -18; c.ratio.value = k.ratio ?? 4; c.knee.value = k.knee ?? 6;
    c.attack.value = (k.attack ?? 10) / 1000; c.release.value = (k.release ?? 120) / 1000;
    const mk = ctx.createGain();
    mk.gain.value = dbToGain(k.makeup ?? 0);
    nodes.push({ in: c, out: c.connect(mk) && mk });
  }
  const post = chain(ctx, inp, nodes);
  const sum = ctx.createGain();
  post.connect(sum);
  if (bus.reverb) {
    const r = bus.reverb, send = ctx.createGain(), rhp = ctx.createBiquadFilter(), pre = ctx.createDelay(1), conv = ctx.createConvolver();
    send.gain.value = dbToGain(r.wet ?? -14);
    rhp.type = "highpass"; rhp.frequency.value = r.hp ?? 250;
    pre.delayTime.value = (r.predelay ?? 10) / 1000;
    const [L, R] = reverbIR(ctx.sampleRate, rng, r);
    const b = ctx.createBuffer(2, L.length, ctx.sampleRate);
    b.copyToChannel(L, 0); b.copyToChannel(R, 1);
    conv.normalize = true;
    conv.buffer = b;
    post.connect(send).connect(rhp).connect(pre).connect(conv).connect(sum);
  }
  if (bus.delay) {
    const d = bus.delay, send = ctx.createGain(), dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    send.gain.value = dbToGain(d.wet ?? -16);
    dl.delayTime.value = (d.time ?? 180) / 1000;
    fb.gain.value = Math.min(0.9, d.feedback ?? 0.35);
    lp.type = "lowpass"; lp.frequency.value = d.lp ?? 4000;
    post.connect(send).connect(dl).connect(lp).connect(fb).connect(dl);
    if (d.pingpong) {
      const m = ctx.createChannelMerger(2), p = ctx.createDelay(2);
      p.delayTime.value = (d.time ?? 180) / 2000;
      lp.connect(m, 0, 0); lp.connect(p).connect(m, 0, 1);
      m.connect(sum);
    } else lp.connect(sum);
  }
  let out = sum;
  if (bus.width != null && bus.width !== 1) {
    const w = bus.width, sp = ctx.createChannelSplitter(2), m = ctx.createChannelMerger(2);
    const g = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    sum.connect(sp);
    sp.connect(g((1 + w) / 2), 0).connect(m, 0, 0); sp.connect(g((1 - w) / 2), 1).connect(m, 0, 0);
    sp.connect(g((1 + w) / 2), 1).connect(m, 0, 1); sp.connect(g((1 - w) / 2), 0).connect(m, 0, 1);
    out = m;
  }
  const mg = ctx.createGain();
  mg.gain.value = dbToGain(bus.gain ?? 0);
  out.connect(mg).connect(dest);
  return inp;
}

// ---------- post: normalize, limit, trim ----------
function limit(chs, sr, ceilingDb) {
  const ceil = dbToGain(ceilingDb), n = chs[0].length;
  const look = Math.round(sr * 0.0015), rel = Math.exp(-1 / (sr * 0.06));
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) { let a = 0; for (const c of chs) a = Math.max(a, Math.abs(c[i])); req[i] = a > ceil ? ceil / a : 1; }
  // min over lookahead window (deque-free O(n*look) is fine at these lengths)
  const g = new Float32Array(n);
  let cur = 1, maxGr = 0;
  for (let i = 0; i < n; i++) {
    let m = 1;
    for (let j = i; j < Math.min(n, i + look); j++) if (req[j] < m) m = req[j];
    cur = m < cur ? cur + (m - cur) * 0.35 : m + (cur - m) * rel;
    g[i] = Math.min(cur, req[i]);
    maxGr = Math.max(maxGr, -gainToDb(g[i]));
  }
  for (const c of chs) for (let i = 0; i < n; i++) c[i] = Math.max(-ceil, Math.min(ceil, c[i] * g[i]));
  return Math.round(maxGr * 10) / 10;
}

function trimTail(chs, sr) {
  const th = dbToGain(-72);
  let last = 0;
  for (const c of chs) for (let i = c.length - 1; i > last; i--) if (Math.abs(c[i]) > th) { last = i; break; }
  const end = Math.min(chs[0].length, last + Math.round(sr * 0.01));
  const fade = Math.min(Math.round(sr * 0.01), end);
  return chs.map((c) => {
    const o = c.slice(0, end);
    for (let i = 0; i < fade; i++) o[end - 1 - i] *= i / fade;
    return o;
  });
}

// opts: {seed, sampleRate, loudness (LUFS momentary-max target; null = no normalization), ceiling dBFS, assets: {load(src)->AudioBuffer}}
export async function renderPatch(patch, { seed = 0, sampleRate = 48000, loudness = -18, ceiling = -1, assets } = {}) {
  const p = resolve(patch, seed);
  const warnings = validate(p);
  const rng = mulberry32(seed * 104729 + 3);
  const layers = p.layers.filter((L) => !L.mute);
  const bus = p.bus || {};
  // samples need their length known up front
  const sampleDur = {};
  for (const L of layers) if (L.type === "sample") { const b = await assets.load(L.src); sampleDur[L.src] = (b.duration * 1000 - sampleStartMs(b, L)) / Math.pow(2, (L.pitch ?? 0) / 12); }
  let end = Math.max(...layers.map((L) => (L.type === "sample" && !L.env ? (L.at ?? 0) + Math.min(L.length ?? Infinity, sampleDur[L.src]) : layerEndMs(L))));
  let tail = 0;
  if (bus.reverb) tail = Math.max(tail, (bus.reverb.decay ?? 1.2) * 1000 + (bus.reverb.predelay ?? 10));
  if (bus.delay) tail = Math.max(tail, ((bus.delay.time ?? 180) * Math.log(0.001)) / Math.log(Math.min(0.9, bus.delay.feedback ?? 0.35)));
  const totalS = Math.min(MAX_S, (end + tail) / 1000 + 0.05);
  if ((end + tail) / 1000 > MAX_S) warnings.push(`render capped at ${MAX_S}s`);
  const ctx = new OfflineAudioContext(2, Math.ceil(totalS * sampleRate), sampleRate);
  const busIn = buildBus(ctx, bus, rng, ctx.destination);
  for (const L of layers) await buildLayer(ctx, L, busIn, rng, assets);
  const buf = await ctx.startRendering();
  let chs = [buf.getChannelData(0).slice(), buf.getChannelData(1).slice()];
  const raw = momentaryMax(chs, sampleRate);
  if (!isFinite(raw)) throw new Error("patch rendered silence");
  let gainDb = 0, limitedDb = 0;
  if (loudness != null) {
    gainDb = loudness - raw;
    for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= dbToGain(gainDb);
  }
  limitedDb = limit(chs, sampleRate, ceiling);
  if (loudness != null && limitedDb > 0.5) {
    // limiting stole loudness: make up the shortfall once (bounded), then limit again
    const short = Math.min(6, loudness - momentaryMax(chs, sampleRate));
    if (short > 0.2) { for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= dbToGain(short); limitedDb = limit(chs, sampleRate, ceiling); }
  }
  if (limitedDb > 3) warnings.push(`limiter took ${limitedDb} dB off the peak: transient too spiky for the loudness target (see docs/mixing.md)`);
  chs = trimTail(chs, sampleRate);
  return { channels: chs, sampleRate, info: { rawLufsM: Math.round(raw * 10) / 10, normGainDb: Math.round(gainDb * 10) / 10, limitedDb, warnings, resolved: seed ? p : undefined } };
}
