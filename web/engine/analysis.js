// analysis.js — loudness (BS.1770 K-weighting), metrics, spectra. Pure: Float32Array channels in.
import { hzToNote, gainToDb } from "./util.js";

// ---------- FFT (in-place radix-2) ----------
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const hann = (n) => Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));

export function mono(chs) {
  if (chs.length === 1) return chs[0];
  const m = new Float32Array(chs[0].length);
  for (const c of chs) for (let i = 0; i < m.length; i++) m[i] += c[i] / chs.length;
  return m;
}

// short-time power spectra: frames[f][bin] (power), hop/size in samples
export function stft(x, size = 1024, hop = 256) {
  const w = hann(size), frames = [];
  for (let s = -size / 2; s < x.length; s += hop) {
    const re = new Float32Array(size), im = new Float32Array(size);
    for (let i = 0; i < size; i++) { const j = s + i; re[i] = j >= 0 && j < x.length ? x[j] * w[i] : 0; }
    fft(re, im);
    const p = new Float32Array(size / 2);
    for (let k = 0; k < size / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
    frames.push(p);
  }
  return frames;
}

// ---------- loudness ----------
function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function kWeight(x, sr) {
  let w0 = (2 * Math.PI * 1681.974450955533) / sr, A = Math.pow(10, 3.999843853973347 / 40), al = Math.sin(w0) / (2 * 0.7071752369554196), c = Math.cos(w0), sA = Math.sqrt(A);
  const shelf = [A * (A + 1 + (A - 1) * c + 2 * sA * al), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - 2 * sA * al),
    A + 1 - (A - 1) * c + 2 * sA * al, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - 2 * sA * al];
  w0 = (2 * Math.PI * 38.13547087602444) / sr; al = Math.sin(w0) / (2 * 0.5003270373238773); c = Math.cos(w0);
  const hp = [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al];
  return biquad(biquad(x, shelf), hp);
}

// block loudnesses (LUFS) of K-weighted mean square over `winS` windows every `hopS`
function blocks(chs, sr, winS, hopS) {
  const kw = chs.map((c) => kWeight(c, sr));
  const win = Math.round(winS * sr), hop = Math.round(hopS * sr);
  const len = kw[0].length, out = [];
  const csum = kw.map((c) => { const s = new Float64Array(c.length + 1); for (let i = 0; i < c.length; i++) s[i + 1] = s[i] + c[i] * c[i]; return s; });
  // windows may hang off both ends (zero padded) so short sounds still get measured
  for (let start = -win + hop; start < len; start += hop) {
    const a = Math.max(0, start), b = Math.min(len, start + win);
    let z = 0;
    for (const s of csum) z += (s[b] - s[a]) / win;
    out.push(z);
  }
  return out;
}
const lufsOf = (z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-20));

// max momentary loudness (400 ms window) — the level measure used for one-shot SFX
export function momentaryMax(chs, sr) {
  return lufsOf(Math.max(...blocks(chs, sr, 0.4, 0.01)));
}

export function integrated(chs, sr) {
  const z = blocks(chs, sr, 0.4, 0.1).filter((v) => lufsOf(v) > -70);
  if (!z.length) return -Infinity;
  const rel = lufsOf(z.reduce((a, b) => a + b, 0) / z.length) - 10;
  const g = z.filter((v) => lufsOf(v) > rel);
  return lufsOf(g.reduce((a, b) => a + b, 0) / g.length);
}

// ---------- envelope + metrics ----------
export function envelopeDb(x, sr, ms = 1) {
  const n = Math.max(1, Math.round((sr * ms) / 1000)), out = [];
  for (let i = 0; i < x.length; i += n) {
    let p = 0;
    for (let j = i; j < Math.min(x.length, i + n); j++) p = Math.max(p, Math.abs(x[j]));
    out.push(gainToDb(p));
  }
  return out; // one value per `ms`
}

export const BANDS = [["sub", 20, 60], ["low", 60, 250], ["lowmid", 250, 500], ["mid", 500, 2000], ["highmid", 2000, 6000], ["high", 6000, 20000]];

function pitchEstimate(x, sr, from) {
  // normalized autocorrelation on 50 ms after `from`; returns {hz, clarity} or {hz: strongest partial, inharmonic}
  const n = Math.min(x.length - from, Math.round(sr * 0.05));
  if (n < sr * 0.02) return null;
  const seg = x.subarray(from, from + n);
  const minLag = Math.floor(sr / 4000), maxLag = Math.min(Math.floor(sr / 50), Math.floor(n / 2));
  let best = 0, bestLag = 0;
  const e0 = seg.reduce((a, v) => a + v * v, 0);
  if (e0 <= 0) return null;
  const r = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0, ea = 0, eb = 0;
    for (let i = 0; i + lag < n; i++) { s += seg[i] * seg[i + lag]; ea += seg[i] * seg[i]; eb += seg[i + lag] * seg[i + lag]; }
    r[lag] = s / Math.sqrt(ea * eb + 1e-20);
  }
  // first strong peak (avoids octave errors from picking a later, equal peak)
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (r[lag] > r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] > 0.5) {
      if (r[lag] > best * 1.1 || !bestLag) { best = r[lag]; bestLag = lag; }
      if (best > 0.85) break;
    }
  }
  // strongest partial in the window (zero-padded FFT)
  const size = 8192, re = new Float32Array(size), im = new Float32Array(size);
  for (let i = 0; i < Math.min(n, size); i++) re[i] = seg[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  fft(re, im);
  const k0 = Math.ceil((30 * size) / sr);
  let pk = k0;
  for (let k = k0 + 1; k < size / 2; k++) if (re[k] ** 2 + im[k] ** 2 > re[pk] ** 2 + im[pk] ** 2) pk = k;
  const partial = (pk * sr) / size;
  if (bestLag) {
    const a = r[bestLag - 1], b = r[bestLag], c = r[bestLag + 1];
    const hz = sr / (bestLag + ((a - c) / (2 * (a - 2 * b + c) || 1)));
    // harmonic only if the strongest partial sits on a low harmonic of the periodicity
    const h = partial / hz;
    if (Math.round(h) >= 1 && Math.round(h) <= 10 && Math.abs(h - Math.round(h)) < Math.max(0.04 * Math.round(h), (2 * sr) / size / hz)) return { hz, clarity: best };
  }
  return { hz: partial, clarity: 0, inharmonic: true };
}

export function analyze(chs, sr) {
  const x = mono(chs), N = x.length;
  let peak = 0, dc = 0, clip = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > peak) peak = a; if (a >= 0.999) clip++; }
  for (let i = 0; i < N; i++) dc += x[i];
  dc /= N || 1;
  const env = envelopeDb(x, sr, 1);
  const pk = Math.max(...env), peakAt = env.indexOf(pk);
  const first = env.findIndex((v) => v > pk - 40);
  const reach = env.findIndex((v) => v >= pk - 1);
  const after = (db) => { let last = peakAt; for (let i = peakAt; i < env.length; i++) if (env[i] > pk - db) last = i; return last - peakAt; };
  const durMs = peakAt + after(60);
  // active region: above -40 dB of peak
  let ss = 0, cnt = 0;
  for (let i = 0; i < env.length; i++) if (env[i] > pk - 40) { const s = Math.round((i * sr) / 1000); for (let j = s; j < Math.min(N, s + sr / 1000); j++) { ss += x[j] * x[j]; cnt++; } }
  const rmsDb = gainToDb(Math.sqrt(ss / Math.max(1, cnt)));

  // spectrum over the active part
  const size = 2048, frames = stft(x, size, 512), binHz = sr / size;
  const total = new Float64Array(size / 2);
  let weighted = 0, power = 0, flatSum = 0, flatN = 0;
  const centroids = [];
  frames.forEach((f, fi) => {
    let fp = 0, fw = 0, logSum = 0, lin = 0;
    for (let k = 1; k < f.length; k++) { total[k] += f[k]; fp += f[k]; fw += f[k] * k * binHz; logSum += Math.log(f[k] + 1e-20); lin += f[k]; }
    if (fp > 0) centroids.push({ ms: ((fi * 512) / sr) * 1000, hz: fw / fp, p: fp });
    if (lin > 1e-9) { flatSum += Math.exp(logSum / (f.length - 1)) / (lin / (f.length - 1)); flatN++; }
    weighted += fw; power += fp;
  });
  const bands = {};
  let tot = 0;
  for (let k = 1; k < total.length; k++) tot += total[k];
  for (const [name, lo, hi] of BANDS) {
    let e = 0;
    for (let k = Math.ceil(lo / binHz); k < Math.min(total.length, hi / binHz); k++) e += total[k];
    bands[name] = Math.round((1000 * e) / (tot || 1)) / 10; // % of energy
  }
  let domK = 1;
  for (let k = 1; k < total.length; k++) if (total[k] > total[domK]) domK = k;
  const loud = centroids.filter((c) => c.p > Math.max(...centroids.map((d) => d.p)) * 0.01);
  const cAt = (ms) => { const c = loud.reduce((b, c) => (Math.abs(c.ms - ms) < Math.abs(b.ms - ms) ? c : b), loud[0] || { hz: 0 }); return Math.round(c.hz); };
  // pitch at the start of the body and near the end of the audible part (catches bends / arpeggios)
  const pAt = (ms) => { const e = pitchEstimate(x, sr, Math.max(0, Math.round((ms * sr) / 1000))); if (!e) return null;
    if (e.inharmonic) return { hz: Math.round(e.hz), note: hzToNote(e.hz), inharmonic: true }; // strongest partial
    return e.clarity > 0.75 ? { hz: Math.round(e.hz * 10) / 10, note: hzToNote(e.hz), clarity: Math.round(e.clarity * 100) / 100 } : null; };
  const p0 = pAt(Math.max(0, reach) + 3), endAt = peakAt + after(20) - 40;
  const p1 = endAt > reach + 45 ? pAt(endAt) : null;
  let corr = 1;
  if (chs.length > 1) {
    let lr = 0, ll = 0, rr = 0;
    for (let i = 0; i < N; i++) { lr += chs[0][i] * chs[1][i]; ll += chs[0][i] ** 2; rr += chs[1][i] ** 2; }
    corr = lr / Math.sqrt(ll * rr + 1e-20);
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    durMs, peakDb: r1(gainToDb(peak)), rmsDb: r1(rmsDb), crestDb: r1(gainToDb(peak) - rmsDb),
    lufsM: r1(momentaryMax(chs, sr)), lufsI: r1(integrated(chs, sr)),
    attackMs: Math.max(0, reach - first), peakAtMs: peakAt, t20Ms: after(20), t40Ms: after(40),
    bands, centroidHz: Math.round(weighted / (power || 1)),
    centroidPath: { atPeak: cAt(peakAt), plus100: cAt(peakAt + 100), atT20: cAt(peakAt + after(20)) },
    dominantHz: Math.round(domK * binHz),
    pitch: p0, pitchEnd: p1 && (!p0 || Math.abs(1200 * Math.log2(p1.hz / p0.hz)) > 50) ? p1 : null, // pitchEnd only if it moved
    flatness: Math.round((flatSum / (flatN || 1)) * 1000) / 1000, // ~0 tonal, ->1 noise-like
    stereoCorr: Math.round(corr * 1000) / 1000,
    dc: Math.round(dc * 10000) / 10000, clipped: clip,
    startClick: Math.abs(x[0]) > 0.02, endClick: Math.abs(x[N - 1]) > 0.01,
  };
}
