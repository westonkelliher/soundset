// draw.js — canvas drawing: tile waveforms (review page) and analysis panels (agent sheets).
import { mono, stft, BANDS } from "../engine/analysis.js";

export const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function resolveColor(c) {
  // canvas wants concrete colors; run CSS colors (incl. oklch relative syntax) through a probe element
  const el = document.createElement("div");
  el.style.color = c;
  document.body.appendChild(el);
  const out = getComputedStyle(el).color;
  el.remove();
  return out;
}
const colorCache = new Map();
export const color = (name) => { if (!colorCache.has(name)) colorCache.set(name, resolveColor(cssVar(name))); return colorCache.get(name); };

function setup(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);
  return g;
}

// min/max waveform; msMax fixes the time scale so tiles are comparable
export function drawWave(canvas, chs, sr, { w = 240, h = 56, msMax } = {}) {
  const g = setup(canvas, w, h), x = mono(chs);
  const total = Math.max(x.length, Math.round(((msMax ?? 0) * sr) / 1000));
  g.fillStyle = color("--wave");
  for (let px = 0; px < w; px++) {
    const a = Math.floor((px / w) * total), b = Math.floor(((px + 1) / w) * total);
    let lo = 0, hi = 0;
    for (let i = a; i < Math.min(b, x.length); i++) { if (x[i] < lo) lo = x[i]; if (x[i] > hi) hi = x[i]; }
    const y0 = h / 2 - hi * (h / 2 - 1), y1 = h / 2 - lo * (h / 2 - 1);
    g.fillRect(px, y0, 1, Math.max(1, y1 - y0));
  }
  return total / sr * 1000;
}

function lerpColor(stops, t) {
  t = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t)), u = t - i;
  return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * u);
}
const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);

const FREQ_LABELS = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const fmtHz = (f) => (f >= 1000 ? f / 1000 + "k" : String(f));

// analysis panel: dB envelope strip + log-frequency spectrogram + time axis + band bars
export function drawAnalysis(canvas, chs, sr, { w = 900, msMax, metrics } = {}) {
  const left = 44, right = 150, envH = 70, specH = 220, axisH = 18, h = envH + specH + axisH + 6;
  const g = setup(canvas, w, h), x = mono(chs);
  const pw = w - left - right;
  const total = Math.max(x.length, Math.round(((msMax ?? 0) * sr) / 1000));
  const ms = (total / sr) * 1000;
  g.fillStyle = color("--spec-0"); g.fillRect(0, 0, w, h);
  g.font = "10px " + cssVar("--mono");

  // envelope in dB (-60..0): per-pixel peak, held over ±2 ms so low tones don't scallop
  const per = Math.max(1, Math.round(total / pw)), hold = Math.round(sr * 0.002);
  const px2db = [];
  for (let px = 0; px < pw; px++) {
    const a = Math.max(0, px * per - hold), b = Math.min(x.length, (px + 1) * per + hold);
    let p = 0;
    for (let i = a; i < b; i++) { const v = Math.abs(x[i]); if (v > p) p = v; }
    px2db.push(20 * Math.log10(p + 1e-9));
  }
  const ey = (db) => 6 + ((-db) / 60) * (envH - 8);
  g.strokeStyle = color("--grid"); g.fillStyle = color("--grid-label");
  for (const db of [0, -20, -40, -60]) {
    g.beginPath(); g.moveTo(left, ey(db)); g.lineTo(left + pw, ey(db)); g.stroke();
    g.fillText(`${db}dB`, 4, ey(db) + 3);
  }
  g.fillStyle = color("--wave");
  px2db.forEach((db, px) => { const y = ey(Math.max(-60, Math.min(0, db))); g.fillRect(left + px, y, 1, ey(-60) - y); });

  // spectrogram
  const top = envH + 4, fMin = 30, fMax = Math.min(20000, sr / 2);
  const size = 1024, hop = Math.max(16, Math.floor(total / pw));
  const frames = stft(x, size, hop);
  let mx = 1e-20;
  for (const f of frames) for (const v of f) if (v > mx) mx = v;
  const stops = ["--spec-0", "--spec-1", "--spec-2", "--spec-3", "--spec-4"].map((n) => rgb(color(n)));
  const img = g.createImageData(pw, specH);
  for (let px = 0; px < pw; px++) {
    const fr = frames[Math.floor((px / pw) * (total / hop))] ;
    for (let py = 0; py < specH; py++) {
      const f = fMin * Math.pow(fMax / fMin, 1 - py / (specH - 1));
      let c = stops[0];
      if (fr) {
        const k = (f / sr) * size, k0 = Math.floor(k), u = k - k0;
        const p = (fr[k0] ?? 0) * (1 - u) + (fr[k0 + 1] ?? 0) * u;
        c = lerpColor(stops, (10 * Math.log10(p / mx + 1e-12) + 80) / 80);
      }
      const o = (py * pw + px) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  const dpr = window.devicePixelRatio || 1;
  const tmp = document.createElement("canvas");
  tmp.width = pw; tmp.height = specH;
  tmp.getContext("2d").putImageData(img, 0, 0);
  g.drawImage(tmp, left, top, pw, specH);
  g.strokeStyle = color("--grid"); g.fillStyle = color("--grid-label");
  for (const f of FREQ_LABELS) {
    const y = top + (1 - Math.log(f / fMin) / Math.log(fMax / fMin)) * (specH - 1);
    g.globalAlpha = 0.45; g.beginPath(); g.moveTo(left, y); g.lineTo(left + pw, y); g.stroke(); g.globalAlpha = 1;
    g.fillText(fmtHz(f), 4, y + 3);
  }

  // time axis
  const step = [5, 10, 20, 50, 100, 200, 500, 1000].find((s) => ms / s <= 12) ?? 1000;
  for (let t = 0; t <= ms; t += step) {
    const px = left + (t / ms) * pw;
    g.globalAlpha = 0.35; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, top + specH); g.stroke(); g.globalAlpha = 1;
    g.fillText(`${t}ms`, px + 2, top + specH + 13);
  }

  // band bars
  if (metrics) {
    const bx = left + pw + 14, bw = right - 24;
    g.fillStyle = color("--grid-label");
    g.fillText("energy %", bx, 12);
    BANDS.forEach(([name], i) => {
      const y = 22 + i * 30, v = metrics.bands[name] ?? 0;
      g.fillStyle = color(`--band-${i}`);
      g.fillRect(bx, y + 10, (bw * v) / 100, 10);
      g.fillStyle = color("--grid-label");
      g.fillText(`${name} ${v}%`, bx, y + 7);
    });
    const y = 22 + BANDS.length * 30 + 6;
    g.fillText(`centroid ${metrics.centroidHz}Hz`, bx, y);
    g.fillText(`flatness ${metrics.flatness}`, bx, y + 14);
  }
  return dpr;
}
