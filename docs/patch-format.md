# Patch format (authoritative)

A patch is one JSON file: layers summed into a bus, rendered offline in Chrome's Web Audio (`web/engine/render.js`), then **normalized to the cue's loudness** (momentary-max LUFS from `soundset.json`), peak-limited to −1 dBFS and tail-trimmed at −72 dB. You never set the absolute level. Layer `gain` only sets the balance *between* layers.

Units: time **ms**, frequency **Hz or note name** (`"C5"`, `"F#3"`, `"Eb4"`), level **dB**, pitch offsets **semitones**, detune **cents**. Unknown keys produce a warning in `soundset check`, so read the warnings: a typo there is a silently ignored parameter.

```json
{
  "note": "what this candidate tries (shown to Weston under the waveform; keep it to one short line)",
  "layers": [ { "type": "osc", ... }, ... ],
  "bus": { ... }
}
```

## Common layer keys (all types)
| key | default | meaning |
|---|---|---|
| `type` | — | `osc` `fm` `noise` `pluck` `modal` `sample` |
| `label` | — | your name for the layer (shows in errors) |
| `at` | 0 | start offset, ms |
| `gain` | 0 | dB, relative balance between layers |
| `pan` | 0 | −1 … 1 |
| `env` | `{a:2,d:300}` | amplitude envelope (below). It sets the layer's length |
| `bend` | — | pitch envelope, semitone points `[[0,12],[60,0]]` (straight in semitones, i.e. exponential in Hz). Pitched types only |
| `vibrato` | — | `{rate:6, depth:20 (cents), delay:0, fade:50}` |
| `filter` | — | one filter or an array of them, applied before the amp env (below) |
| `drive` | — | waveshaper, applied after the amp env, so loud parts saturate more (below) |
| `eq` | — | array of filters after the drive (use `peaking`/`lowshelf`/`highshelf`/`highpass`) |
| `am` | — | tremolo `{rate:8, depth:0..1, wave}`. 20–80 Hz gives roughness/growl |
| `ring` | — | ring mod `{freq | ratio (of layer freq), mix:0..1}`: metallic, inharmonic |
| `mute` | false | skip this layer (useful for A/B-ing a layer) |

Chain: source → ring → filter(s) → amp env → am → drive → eq → gain → pan → bus.

### Envelopes
- Amp shorthand: `{a, h, d, s, sus, r, curve}`. Attack `a` is a linear rise to 1, `h` holds, `d` decays to `s` (default 0) with `curve` (default `"exp"` = straight in dB, the natural ring-out), then `sus` ms at `s` and `r` ms release. Examples: tick `{a:0.5,d:25}`, thump `{a:1,h:15,d:160}`, swell `{a:250,d:120,curve:"lin"}`.
- Points: `[[ms, value, shape?], ...]`. `shape` is for the segment *ending* at that point: `"lin"`, `"exp"`, or a number k (power curve, k>1 slow start). Used by `env`, `bend`, `filter.env`, FM `index`.
- Defaults: amp rises `lin` and falls `exp`; filter cutoff `exp`; bend and FM index `lin`.

### Filter / EQ objects
`{type, freq, q, gain, env}`. Types: `lowpass highpass bandpass notch peaking lowshelf highshelf allpass`. `q` defaults to 0.707 (peaking 1). `gain` (dB) applies to peaking and shelves. `env` = cutoff points in Hz, e.g. `[[0,9000],[80,1500]]`. A filter sweep is the cheapest way to make a sound feel alive.

### Drive
`{type, amount, mix, out, bits}`. Types: `tanh` (soft, warm), `asym` (even harmonics, "tube"), `hard` (clip, aggressive), `fold` (wavefolder, buzzy/metallic), `crush` (bit-depth quantize; `bits` default 6 = lo-fi). `amount` = dB pushed into the shaper (0–36; 6 = gentle, 12 = obvious, 24 = fuzz). `mix` 0..1 (parallel blend, default 1), `out` dB. 4× oversampled.

## Layer types
| type | keys | notes |
|---|---|---|
| `osc` | `freq`, `wave` (`sine triangle sawtooth square`), `harmonics` [amp of h1, h2, …] (custom timbre, overrides wave), `unison` `{voices, detune (±cents, default 15), spread (0..1 stereo)}` | unison voices get random phases (no flam). Square = hollow/8-bit, saw = buzzy/bright, `harmonics: [1,0,0.3,0,0.1]` = soft organ |
| `fm` | `freq` (carrier), `wave`, `mods` [`{ratio, index, wave, offset (Hz), into}`] | `index` is a number or index points `[[0,8],[120,0.5]]` (decaying index = bright attack → pure tail, the classic FM bell/pluck). Integer ratios are harmonic. Non-integer ratios (1.41, 2.76) give bell/metal. **Half-integer ratios (1.5, 3.5) are harmonic but drop the perceived root an octave** (carrier C6 + ratio 3.5 reads as C5). `into: i` makes this modulator modulate mods[i] (a stack) instead of the carrier |
| `noise` | `color` (`white pink brown blue crackle sh`), `density` (crackle impulses/s, default 400), `rate` (sh: sample-and-hold Hz, 8-bit noise) | almost always used with a `filter`: noise + bandpass sweep = whoosh |
| `pluck` | `freq`, `decay` (T60 seconds, default 1), `damping` (0 bright/metallic … 1 dull/nylon, default 0.5), `bright` (pick hardness 0..1, default 0.7) | Karplus-Strong string: harp, pizzicato, koto, "plink". Needs an `env` at least as long as you want it to ring |
| `modal` | `freq`, `modes` (preset name, or custom `[{r, g, d}]` = ratio / gain / **absolute** T60 ms: custom `d` is NOT scaled by `decay` (it defaults to `decay` when omitted)), `decay` (base T60 ms, scales preset decays, default 600), `damp` (higher modes die faster: T60·r^−damp), `hardness` (0..1: 1 = bright strike, lower = soft mallet), `beat` (Hz twin detune = shimmer), `spread` (±cents random per mode) | presets: `bar` (xylophone), `marimba`, `glass`, `bell` (church, includes hum 0.5), `plate`, `disc` (coins!), `wood` (block: use decay 40–120), `tube`, `string`. Struck objects: coins, glass marbles, wood, metal |
| `sample` | `src` (`"lib:<path>"` from `soundset lib search`, or a project-relative path), `pitch` (semitones, also changes length), `start` (ms into file; **default: auto-skips leading silence** to 1 ms before the first sample above −40 dB of peak. Give `start` explicitly to override), `length` (ms), `reverse`, `fadeIn`, `fadeOut` (ms, default 10), `normalize` (default true = peak 1 before `gain`) | without `env` it plays the file (trimmed) with short fades; with `env` the env shapes it. Pitch a sample down 3–12 st for weight, up for cuteness. `bend` works too |

## Bus (optional)
The `//` comments below are annotations only. JSON has no comments, so leave them out of real patches.
```json
"bus": {
  "hp": 25,                                   // DC/rumble highpass, Hz
  "eq": [ {"type":"peaking","freq":3000,"q":1,"gain":-3} ],
  "drive": { "type":"tanh", "amount":6, "mix":0.5 },       // glue
  "comp": { "threshold":-18, "ratio":4, "attack":10, "release":120, "knee":6, "makeup":0 },
  "reverb": { "decay":0.5, "predelay":10, "wet":-18, "hp":250, "bright":12000, "damping":3000, "size":0.5, "er":0.5 },
  "delay": { "time":180, "feedback":0.35, "wet":-16, "lp":4000, "pingpong":false },
  "width": 1,                                 // 0 mono … 1 as-is … 2 wide (keep lows mono: do width on high layers via unison spread)
  "gain": 0
}
```
- Order: hp → eq → drive → comp → (dry + reverb send + delay send) → width.
- `reverb.wet` is the send level in dB (−24 subtle, −18 present, −12 obvious). `hp` keeps lows out of the tail. `damping` = tail cutoff Hz at T60 (lower = darker), `bright` = cutoff at the start.
- `comp.attack` 5–15 ms lets the transient through (punch). 1 ms flattens it.

## Randomization (variants)
Any number can be `{"rand":[min,max]}` (add `"int":true` to round) and any value can be `{"pick":[a,b,c]}`. **Seed 0** (what Weston reviews) uses the midpoint / first pick. Bake renders seeds 0…N−1 as the in-game variants, and noise, pluck, modal, unison and reverb also differ per seed. Keep ranges small: they are variations of *one* sound (pitch ±0.5–1 st, times ±15%, gain ±1.5 dB). Never use rand to "try options": that is what the 3 candidates are for.

## Translating docs/recipes.md shorthand
| recipes.md | patch JSON |
|---|---|
| `sine 150→45Hz/120ms exp` | `{"type":"osc","freq":150,"bend":[[0,0],[120,-21]]}` (−21 st = 12·log2(45/150)). Bend is already exponential in Hz |
| `A2 H10 D180 exp` | `"env":{"a":2,"h":10,"d":180}` |
| `LP 6k Q0.7 env 9k→2k/80ms` | `"filter":{"type":"lowpass","q":0.7,"env":[[0,9000],[80,2000]]}` |
| `PK 3k -4dB Q1` | `{"type":"peaking","freq":3000,"gain":-4,"q":1}` in `eq` |
| `FM 1:1.4 I 8→0.5/300ms` | `{"type":"fm","freq":F,"mods":[{"ratio":1.4,"index":[[0,8],[300,0.5]]}]}` |
| `uni 3 ±12c sp0.5` | `"unison":{"voices":3,"detune":12,"spread":0.5}` |
| `@+30`, `-6dB` | `"at":30`, `"gain":-6` |
| `drive tanh 0.3` (0–1 scale) | `"drive":{"type":"tanh","amount":9}`: amount dB ≈ 30 × x |
| `rev 0.8s pre15 damp0.6 wet15%` | `"bus":{"reverb":{"decay":0.8,"predelay":15,"damping":2500,"wet":-16}}` (wet dB = 20·log10(x); damp 0.6 ≈ 2–3 kHz) |
| `KS pluck` | `{"type":"pluck",...}` · `modal glass/bar/...` → `{"type":"modal","modes":"glass"}` |
| `HP 2k` on a layer | `"filter":{"type":"highpass","freq":2000}` |

## Worked examples
Examples live in `examples/*.json` and all of them render; run `soundset analyze examples/<f>.json` to see each one. They are deliberately different starting points, not finished sounds.
