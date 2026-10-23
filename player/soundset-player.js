// soundset-player.js — plays `soundset bake` output in a game. Copied next to manifest.json by every bake.
//   const sfx = await createPlayer({ base: "./sfx/" });  sfx.play("impact");
// Per cue (manifest "play"): random variant (never the same twice in a row), ±pitch cents, ±gain dB,
// max simultaneous voices (oldest is cut), and a cooldown so bursts of the same event don't stack into noise.

export async function createPlayer({ base = "./sfx/", volume = 1 } = {}) {
  const manifest = await (await fetch(base + "manifest.json", { cache: "no-store" })).json();
  const decoder = new OfflineAudioContext(1, 1, 48000);
  const buffers = {};
  await Promise.all(Object.entries(manifest.cues).map(async ([cue, m]) => {
    buffers[cue] = await Promise.all(m.files.map(async (f) => decoder.decodeAudioData(await (await fetch(base + f)).arrayBuffer())));
  }));
  let ctx = null, master = null, muted = false;
  const live = {}, last = {}, lastAt = {};

  function ensure() {
    if (!ctx) {
      ctx = new AudioContext({ latencyHint: "interactive" });
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  return {
    has: (cue) => !!buffers[cue],
    setMuted(m) { muted = m; },
    setVolume(v) { volume = v; if (master) master.gain.value = v; },
    // opts: {gain (dB offset), pitch (cents offset)}; returns false if the cue isn't baked
    play(cue, opts = {}) {
      const bufs = buffers[cue];
      if (!bufs) return false;
      if (muted) return true;
      ensure();
      const p = manifest.cues[cue].play || {}, now = ctx.currentTime * 1000;
      if (now - (lastAt[cue] ?? -1e9) < (p.cooldown ?? 0)) return true;
      lastAt[cue] = now;
      let i = Math.floor(Math.random() * bufs.length);
      if (bufs.length > 1 && i === last[cue]) i = (i + 1) % bufs.length;
      last[cue] = i;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = bufs[i];
      src.detune.value = (opts.pitch ?? 0) + (Math.random() * 2 - 1) * (p.pitch ?? 0);
      g.gain.value = Math.pow(10, ((opts.gain ?? 0) + (Math.random() * 2 - 1) * (p.gain ?? 0)) / 20);
      src.connect(g).connect(master);
      const voices = (live[cue] ??= []);
      if (voices.length >= (p.voices ?? 4)) { try { voices.shift().stop(); } catch {} }
      voices.push(src);
      src.onended = () => { const k = voices.indexOf(src); if (k >= 0) voices.splice(k, 1); };
      src.start();
      return true;
    },
  };
}
