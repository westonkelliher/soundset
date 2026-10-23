// browser.js — browser-side glue: sample loading (lib:/proj: URLs) and render helpers.
import { renderPatch } from "./render.js";
import { analyze, momentaryMax } from "./analysis.js";
import { dbToGain } from "./util.js";

const decoder = new OfflineAudioContext(1, 1, 48000);
const cache = new Map();

export function srcUrl(src) {
  if (src.startsWith("lib:")) return "/lib/" + src.slice(4).split("/").map(encodeURIComponent).join("/");
  if (src.startsWith("proj:")) return "/proj/" + src.slice(5).split("/").map(encodeURIComponent).join("/");
  if (/^(https?:)?\//.test(src)) return src;
  return "/proj/" + src.split("/").map(encodeURIComponent).join("/");
}

export const assets = {
  load(src) {
    if (!cache.has(src))
      cache.set(src, fetch(srcUrl(src)).then(async (r) => {
        if (!r.ok) throw new Error(`sample not found: ${src} (${r.status}); see \`soundset lib search\``);
        return decoder.decodeAudioData(await r.arrayBuffer());
      }));
    return cache.get(src);
  },
};

// a reference may be a patch (.json) or an audio file
export async function renderAny(ref, opts) {
  if (typeof ref === "string" && !ref.endsWith(".json")) {
    const b = await assets.load(ref);
    const chs = [b.getChannelData(0).slice(), (b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice()];
    let g = 0;
    if (opts?.loudness != null) { g = opts.loudness - momentaryMax(chs, b.sampleRate); for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= dbToGain(g); }
    return { channels: chs, sampleRate: b.sampleRate, info: { warnings: [], normGainDb: Math.round(g * 10) / 10 } };
  }
  let patch = ref;
  if (typeof ref === "string") {
    const r = await fetch(srcUrl(ref));
    if (!r.ok) throw new Error(`patch not found: ${ref} (paths are relative to the project dir and must stay inside it)`);
    patch = await r.json();
  }
  return renderPatch(patch, { ...opts, assets });
}

export function toAudioBuffer(ctx, r) {
  const b = ctx.createBuffer(r.channels.length, r.channels[0].length, r.sampleRate);
  r.channels.forEach((c, i) => b.copyToChannel(c, i));
  return b;
}

export { renderPatch, analyze };
