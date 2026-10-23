// wav.js — 24-bit PCM WAV encoder (pure). Collapses to mono when the channels are identical.
export function isMono(chs) {
  if (chs.length < 2) return true;
  const [l, r] = chs;
  for (let i = 0; i < l.length; i++) if (Math.abs(l[i] - r[i]) > 1e-5) return false;
  return true;
}

export function encodeWav(chs, sr) {
  const out = isMono(chs) ? [chs[0]] : chs;
  const nc = out.length, n = out[0].length, bps = 3;
  const buf = new ArrayBuffer(44 + n * nc * bps), v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * nc * bps, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * nc * bps, true); v.setUint16(32, nc * bps, true); v.setUint16(34, 24, true);
  str(36, "data"); v.setUint32(40, n * nc * bps, true);
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < nc; c++) {
      const s = Math.max(-1, Math.min(1, out[c][i]));
      const x = Math.round(s * 8388607);
      v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255);
      o += 3;
    }
  return new Uint8Array(buf);
}
