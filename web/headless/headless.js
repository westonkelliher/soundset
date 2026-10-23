// headless.js — entry point driven by src/headless.js (playwright): render to WAV, draw analysis sheets.
import { renderAny, analyze } from "../engine/browser.js";
import { encodeWav } from "../engine/wav.js";
import { drawAnalysis } from "../sheet/draw.js";

function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const fmt = (m) => {
  const n = (q) => `${q.inharmonic ? "strongest partial " : ""}${q.hz}Hz ${q.note.name}${q.note.cents >= 0 ? "+" : ""}${q.note.cents}c`;
  const p = (m.pitch ? n(m.pitch) : "unpitched/inharmonic") + (m.pitchEnd ? " → " + n(m.pitchEnd) : "");
  return `dur ${m.durMs}ms · attack ${m.attackMs}ms · peak@${m.peakAtMs}ms · t20 ${m.t20Ms}ms · t40 ${m.t40Ms}ms · crest ${m.crestDb}dB\n` +
    `LUFS-M ${m.lufsM} · peak ${m.peakDb}dBFS · centroid ${m.centroidHz}Hz (peak ${m.centroidPath.atPeak} → +100ms ${m.centroidPath.plus100} → t20 ${m.centroidPath.atT20}) · pitch ${p} · stereo corr ${m.stereoCorr}`;
};

window.ss = {
  // -> {wav: base64, metrics, info}
  async render(ref, opts) {
    const r = await renderAny(ref, opts);
    return { wav: b64(encodeWav(r.channels, r.sampleRate)), metrics: analyze(r.channels, r.sampleRate), info: r.info };
  },
  // items: [{title, note, ref, opts}] -> [{title, metrics, info} | {title, error}]
  async sheet(items) {
    const root = document.getElementById("sheet");
    root.innerHTML = "";
    const done = [];
    for (const it of items) {
      try { done.push({ it, r: await renderAny(it.ref, it.opts) }); }
      catch (e) { done.push({ it, error: String(e.message || e) }); }
    }
    const msMax = Math.max(100, ...done.filter((d) => d.r).map((d) => (d.r.channels[0].length / d.r.sampleRate) * 1000));
    const out = [];
    for (const d of done) {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<div class="title"></div><div class="note"></div><div class="m"></div>`;
      div.querySelector(".title").textContent = d.it.title;
      div.querySelector(".note").textContent = d.it.note || "";
      root.appendChild(div);
      if (d.error) { div.querySelector(".m").className = "err"; div.querySelector(".err").textContent = "ERROR: " + d.error; out.push({ title: d.it.title, error: d.error }); continue; }
      const m = analyze(d.r.channels, d.r.sampleRate);
      const mEl = div.querySelector(".m");
      mEl.textContent = fmt(m);
      for (const w of d.r.info.warnings || []) { const e = document.createElement("div"); e.className = "warn"; e.textContent = "⚠ " + w; div.appendChild(e); }
      const c = document.createElement("canvas");
      div.appendChild(c);
      drawAnalysis(c, d.r.channels, d.r.sampleRate, { msMax, metrics: m });
      out.push({ title: d.it.title, metrics: m, info: d.r.info });
    }
    return out;
  },
};
window.ssReady = true;
