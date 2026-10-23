# Mixing & mastering game SFX

Numbers are starting points, not laws. "Spec" = from a published guideline; "heuristic" = common practice / our working default. Analyzer bands referenced below: **sub** <60, **low** 60–250, **lowmid** 250–500, **mid** 500–2k, **highmid** 2k–6k, **high** >6k.

---

## 1. Frequency map

| Range (Hz) | Analyzer band | Contributes | Too much → | Too little → |
|---|---|---|---|---|
| 20–40 | sub | felt rumble, inaudible on most devices | wasted headroom, woofer flap, limiter pumping | nothing (usually safe to cut) |
| 40–60 | sub | weight, "chest" of explosions/booms | boom, eats headroom | lightweight on big systems only |
| 60–120 | low | punch body, thump, kick fundamental | boomy, smeary when stacked | thin, no impact on headphones/TV |
| 120–250 | low | warmth, fullness, "size" | mud begins (~200), woolly | thin, cheap |
| 250–500 | lowmid | body; boxiness at 300–500 | boxy, "cardboard", "beach ball" | hollow |
| 500–1k | mid | core tone; identity on small speakers | honky, "cheap stereo" (~800) | scooped, vanishes on phones |
| 1–2k | mid | definition, nasal/honk at 1–1.5k | nasal, telephone-y | dull, distant |
| 2–5k | highmid | presence, attack click, intelligibility; ear most sensitive here | harsh, piercing, fatiguing | soft, lacks cut-through |
| 5–9k | highmid/high | sizzle, sibilance, crispness | fizzy, spitty, sibilant | dull |
| 10–16k | high | air, sparkle, "expensive" sheen | brittle, hiss, aliasing exposed | closed-in |
| >16k | high | little perceptual value | aliasing/noise, true-peak overs | — |

- Ear sensitivity peaks ~2–5 kHz (dip ~3–4 kHz in equal-loudness contours, ear-canal resonance). Energy there reads loudest per dB → main source of harshness and of "cuts through the mix".
- Device floors: laptop speakers ~200 Hz, tablets ~400 Hz, many phone speakers roll off from ~800 Hz. Anything only <200 Hz is gone on most handhelds.

## 2. EQ moves for common problems

Rules: cut narrow, boost wide; boosts ≤ +6 dB (usually +2–4); prefer cutting the competitor over boosting the hero; sweep to find resonances before notching.

| Problem | Where | Move |
|---|---|---|
| Sub rumble / DC / wasted energy | <25–40 Hz | HPF 12–24 dB/oct at 25–40 Hz (all assets) |
| Non-bass layer clutters lows | <80–200 Hz | HPF 80–200 Hz on clicks, whooshes, UI, debris layers |
| Mud | 180–350 Hz | bell −2 to −6 dB, Q 1–2 |
| Boxy | 300–600 Hz | bell −3 to −6 dB, Q 2–4 |
| Honky / cheap / nasal | 700 Hz–1.5 kHz | bell −2 to −4 dB, Q 2–4 |
| Harsh | 2.5–5 kHz | bell −2 to −5 dB, Q 2–5; dynamic EQ if only on peaks |
| Single resonant ring/whistle | anywhere | notch −6 to −12 dB, Q 8–15 |
| Fizz / sibilance | 5–9 kHz | bell −3 to −6 dB, Q 3–6 (or dynamic) |
| Hiss / aliasing / brittle | >12 kHz | LPF 12–16 kHz, or high shelf −3 to −6 dB |
| Lacks weight (big systems) | 50–100 Hz | bell +2 to +4 dB, Q 0.7–1 — and add harmonics (§7) |
| Lacks punch | 80–150 Hz + 2–5 kHz | +2–3 dB body bell, +2–3 dB attack bell Q ~1 |
| Lacks presence / buried | 1.5–4 kHz | +2–3 dB, Q ~1 |
| Dull | 8–12 kHz | high shelf +2 to +4 dB |
| Too bright for repeated sound | >3 kHz | LPF 6–10 kHz or shelf −3 dB |

- Synth equivalents: HPF/LPF on the voice; lower filter cutoff or resonance to cure harshness; resonance (Q) > ~5 on a filter sweep is a classic source of whistle peaks.

## 3. Layering & frequency slotting

Classic impact/explosion stack (each layer owns a slot; HPF/LPF at the boundaries):

| Layer | Job | Typical band | Envelope |
|---|---|---|---|
| Transient / click | attack, localization, cut-through | HPF ~1 kHz, energy 2–8 kHz | 1–15 ms |
| Body | identity: what the thing is | 150 Hz–2 kHz | 20–200 ms |
| Sub / thump | weight | LPF 120–200 Hz, e.g. sine sweep 150→45 Hz | 50–300 ms |
| Detail / debris | realism, texture | 2–10 kHz | 50–500 ms |
| Tail | size, space | darkened (LPF 2–6 kHz) | 0.2–2 s |

- One layer owns the lows. Two layers with energy <150 Hz = unfocused low end and phase cancellation risk.
- Carve, don't stack: if two layers peak at the same Hz, cut 2–4 dB in the supporting layer at the hero's peak.
- Kick-style split used widely: click layer HPF >1 kHz, body layer LPF <200 Hz.
- Each layer should contribute a *different* band to the analyzer. If layer N doesn't change any band by ≥1–2 dB, delete it.
- Contrast > clutter: 3–4 layers is typical; more usually smears the transient.

## 4. Phase & transient alignment

- Align transients to sample accuracy; a 0.5–1 ms offset can turn a punchy hit thin (low-frequency cancellation).
- Polarity test: invert one low layer; keep whichever polarity gives more low/sub energy.
- Deliberate offsets: transient layer 0–5 ms *before* body exaggerates snap; body delayed 5–20 ms reads as "bigger/farther" but softer.
- Start layers at a zero crossing / phase 0 (sine start at 0°); otherwise add a ≤1 ms fade-in.
- Pitch-swept sub (kick-style) and a separate low body layer frequently cancel — check low-band energy of the sum vs each layer alone; sum should be ≥ the louder layer.

## 5. Dynamics

### Compression (one-shots)

| Goal | Ratio | Attack | Release | Gain reduction |
|---|---|---|---|---|
| Punch (let transient through) | 3–4:1 | 10–30 ms | 50–150 ms | 3–6 dB |
| Glue layered bus | 1.5–2:1 | 10–30 ms | 100–300 ms / auto | 1–3 dB |
| Thicken body/tail (density) | 4–8:1 | 0.1–2 ms | 50–100 ms | 6–10 dB |
| Peak control | 10–20:1 / limiter | 0–1 ms | 20–100 ms | ≤3 dB |
| Parallel ("NY") | 8–10:1 fast | 0.1–1 ms | 50–100 ms | 10+ dB, blend 20–40% |

- Attack time ≈ how much of the transient survives: 10 ms attack passes ~10 ms of hit untouched → higher crest factor.
- Fast attack lowers crest factor and dulls; slow attack + fast release = more punch.
- Release should return to 0 dB GR before the tail matters; long release on a short one-shot just ducks its own tail.
- At 1–2 dB GR, attack/release barely matter.

### Transient shaping

- Punch: attack +3 to +6 dB, sustain −2 to −6 dB → tighter, closer, higher crest.
- Distance/softness: attack −3 to −6 dB → sits farther back (defined transients read close; smoothed read far).
- Synth-native shaping: shorter amp attack (0–2 ms), faster decay, add a 2–10 ms noise/click burst, fast pitch drop (e.g. +12 st → 0 in 10–30 ms) on the body.

### Saturation / distortion

| Type | Harmonics | Character | Use |
|---|---|---|---|
| Soft clip / tanh | odd (3,5,…) | smooth, loudness without obvious grit | impacts, sub layers, final stage |
| Tube / asymmetric | even (2) + odd | warm, thick; 2nd = octave reinforces pitch | bass/body, UI tones that feel "solid" |
| Tape | mostly even, soft comp, LF bump, HF roll-off | rounded, glued | buses, explosions |
| Hard clip | strong odd, bright | aggressive, harsh if overdone | short transients only; can raise loudness 2–4 dB w/o audible damage on <5 ms peaks |
| Bitcrush / rate-reduce | inharmonic aliasing | lo-fi, digital | retro/UI identity; LPF after |
| Wavefold / FM | dense, inharmonic | metallic, sci-fi | magic, robots |

- Why it helps: adds harmonics in 200 Hz–5 kHz that small speakers can play (§7), and lowers crest factor (more perceived loudness per dB of peak).
- Gain-stage: EQ before saturation shapes what distorts; LPF after hard clip/bitcrush (8–12 kHz) to remove fizz and true-peak overs.
- Parallel blend 10–40% keeps the clean transient.

### Limiting / clipping (asset final stage)

- Ceiling: −1 dBTP (spec for whole-game output); use −1 to −2 dBTP on assets that will be lossy-encoded (OGG/MP3/AAC add overs).
- True peak can exceed sample peak (worst cases ~+3 to +6 dB on HF-heavy content). If only sample peak is measured, keep it ≤ −1.5 dBFS on bright sounds.
- Limiter GR on a one-shot: ≤2–3 dB. More flattens the transient (crest drops, attack blurs).
- Do not normalize every asset to −1 dBTP; set level by loudness category (§10).

## 6. Reverb & space

- Default for gameplay SFX: **dry or near-dry**. The engine adds environmental reverb; baked reverb + engine reverb = wash. Bake only "character" space (UI shimmer, magic bloom, stylized hits).
- Short room: RT60 0.2–0.6 s; early reflections 10–30 ms; predelay 5–20 ms (20–40 ms keeps the transient clear of the wash).
- Big event (boss slam, explosion): 1–2.5 s tail, but darkened.
- Return processing: HPF 200–400 Hz (keep low end dry/mono), LPF/damping 4–8 kHz (dark tails mask less, fatigue less).
- Wet level: 5–20% for subtle; >30% only for stylized.
- Responsiveness: frequent sounds (footsteps, UI, gunfire) total length <300–500 ms; long tails on frequently retriggered sounds pile up and mask the next hit.
- No leading silence: onset within ≤2 ms of file start. Any pre-roll is added latency.

## 7. Translation to laptop / phone speakers

- Speakers roll off: laptop ~200 Hz, tablet ~400 Hz, phone ~800 Hz. Sine-like bass is the hardest thing to hear on them.
- Put **identity** in 400 Hz–5 kHz; every sound needs some energy there. 700 Hz–2 kHz attack boosts help localization without harshness.
- Missing-fundamental trick: the ear infers a fundamental from its harmonics (2nd–4th matter most). Recipe:
  1. Duplicate the sub/low layer → LPF ~120 Hz.
  2. Saturate it (soft clip or tube; even-order emphasis) until harmonics appear at 2f, 3f, 4f.
  3. HPF that result at 150–250 Hz, blend −10 to −15 dB under the main layer.
  4. Synth-native: add 2nd/3rd harmonic oscillators at −12 to −18 dB, or use a square/saw through a low LPF instead of a pure sine.
- Simulated check: re-analyze with HPF at 200 / 400 / 800 Hz (6 dB/oct). The sound must remain recognizable — numerically, momentary max should drop ≤ ~6 dB at the 200 Hz HPF for any sound that matters on mobile.
- Heuristic: if sub+low > ~70% of energy, it disappears on a laptop. Aim lowmid+mid+highmid ≥ ~30–40% of energy for impacts.
- Many small devices are effectively mono → §8.

## 8. Stereo width & mono compatibility

- Keep <120–150 Hz mono (sub band highest collapse risk). Low-band side energy ≈ 0.
- 3D/positional in-world SFX: author **mono**; engine pans/spatializes. 2D/UI/stingers may be stereo.
- Width only above ~300 Hz–1 kHz, via genuinely different content per side (different noise seeds, detuned voices ±5–15 cents, alternate layers), not delay.
- Haas (1–30 ms L/R delay) combs badly in mono — avoid on anything that carries the identity.
- Correlation: average > +0.3, never sustained < 0. Mono-sum loudness loss should be < 1–2 dB.

## 9. Ear fatigue & harshness

- 2–5 kHz: most sensitive region. Repeated sounds (UI, footsteps, rapid-fire) need restrained highmid; save bright edges for rare/important events.
- Narrow resonant peaks (>6 dB above neighbors in 2–6 kHz) = piercing. Notch them.
- Pure sines/squares in 2–4 kHz with long sustain are the most annoying; keep UI tones short (<150 ms) or roll off >4 kHz.
- Error/deny sounds: lower and duller (falling pitch, LPF), not harsher.
- Variation prevents "machine-gun" fatigue: 3–5 variants, ±1–2 semitones (or ±5%) pitch, ±1–2 dB level randomization.

## 10. Loudness targets

### Whole-game output (specs)

| Context | Integrated | Tolerance | True peak | Notes |
|---|---|---|---|---|
| Console / PC (IESD / Sony ASWG-R001; MS & Nintendo aligned) | −24 LUFS | ±2 LU | ≤ −1 dBTP | ≥30 min representative gameplay, BS.1770 |
| Older Sony/IESD (2013) | −23 LUFS | ±2 | ≤ −1 dBTP | same method |
| Mobile / handheld (IESD) | −16 LUFS | ±2 | ≤ −1 dBTP | LRA 10–15 LU |
| Sony mobile / PS Vita | −18 LUFS | — | — | |
| Measured shipped games (ASWG survey) | ~−18 LUFS avg | | | games run hot vs film −23 |
| LRA | mobile/puzzle 5–10, family medium, FPS/war 15–20 LU | | | >20 LU "probably excessive" (EBU) |

### Measuring one-shots

- Integrated is meaningless for a 200 ms asset (gating, silence). Use **momentary max** (400 ms window) for short sounds; short-term (3 s) for loops/ambiences; integrated only for music/long beds. (Wwise loudness normalization: momentary max for short sounds, integrated for long; default target −23.)
- Sounds shorter than ~200 ms are perceived quieter than their peak suggests (temporal integration); momentary max tracks this reasonably. A 30 ms tick at −1 dBFS peak can still read −20 LUFS M.
- Console convention (Audiokinetic): dialogue ref −12 dB RMS; music/amb/SFX/UI −16 dB RMS; peaks < −3 dBFS. Normalizer preset convention: game SE −12 LUFS, BGM −18 LUFS.

### Asset level heuristics (momentary max, for a ~−18 to −16 LUFS game; subtract ~6–8 dB for a −24 console mix)

| Category | Relative to hero | M-max LUFS | Peak |
|---|---|---|---|
| Hero impact / boss slam / critical alert | 0 LU (reference) | −10 to −7 | −1 dBTP |
| Player actions (attacks, hits) | −2 to −5 | −13 to −10 | ≤ −1 |
| Enemy / secondary actions | −4 to −8 | −16 to −12 | ≤ −3 |
| Pickups / rewards | −4 to −8 | −16 to −12 | ≤ −3 |
| UI confirm / positive | −6 to −10 | −18 to −14 | ≤ −3 |
| UI hover / tick / scroll | −10 to −16 | −24 to −18 | ≤ −6 |
| Footsteps / foley | −10 to −16 | −24 to −18 | ≤ −6 |
| Ambience loops (short-term) | −14 to −20 | −30 to −24 S | ≤ −10 |
| Music bed (integrated) | −6 to −12 below SFX peaks | −22 to −18 I | ≤ −1 |

### Headroom when sounds stack

- Uncorrelated equal sounds add power: 2 → +3 dB, 4 → +6, 8 → +9. Identical sample fired simultaneously adds amplitude: +6 dB per doubling.
- Hence leave ~6–12 dB of bus headroom; HDR buses typically sit −12 to −18 dB with a master limiter at −1 dBTP.
- Voice limits: same sound ≤3–5 concurrent instances; retrigger cooldown ≥30–50 ms for rapid events.

### Ducking / priority

- Priority (high→low): critical feedback (damage taken, low HP, fail) → VO → player actions → enemy actions → pickups → UI → ambience → music.
- Duck music/ambience 3–9 dB under VO/big events. Example shipped values: −9 dB, 500 ms down, 1000 ms back. For gameplay-triggered ducks: attack 10–50 ms, release 300–1000 ms.
- UI and critical VO usually sit outside HDR/auto-ducking so they're never masked.
- Ducking is seasoning — overuse pumps audibly.
- Design-side ducking: big impacts get a 50–150 ms near-silent gap or a dip before them in the same asset (contrast reads louder than level).

## 11. Clicks & pops

- Fade-in: 0.5–2 ms on transient sounds (keeps attack), 2–10 ms on tonal/sustained starts.
- Fade-out: ≥5–20 ms; for low tones ≥ one to two cycles of the lowest frequency (50 Hz → ≥20–40 ms).
- Every file starts and ends at exactly 0. Last 1 ms below −60 dBFS.
- DC offset: |mean| < 0.001 (−60 dBFS). Fix with HPF 10–20 Hz; asymmetric saturation and some envelopes introduce DC.
- Synth sources: oscillator not starting at phase 0, zero-attack envelopes on low tones, hard filter cutoff jumps, and gate retriggers all click. A 0 ms attack is only acceptable when the click *is* the transient you want.
- Loop points: zero crossing + matching slope, or a 5–20 ms crossfade.

## 12. Analyzer targets by archetype (heuristic)

Crest = peak − RMS over the active (non-silent) part. Sine = 3 dB, square = 0 dB, unprocessed drums 16–18 dB, heavily compressed 6–8 dB.

| Archetype | Attack (to peak) | Length (to −40 dB) | Crest dB | Centroid Hz | Dominant bands | M-max LUFS |
|---|---|---|---|---|---|---|
| Punchy impact / hit | 0–5 ms | 150–500 ms | 12–20 | 400–1500 | low + mid, highmid transient | −13 to −8 |
| Heavy explosion | 0–10 ms | 1–3 s | 10–16 | 200–800 | sub/low + lowmid, dark tail | −10 to −7 |
| Soft UI tick / hover | <2 ms | 20–80 ms | 10–18 | 1.5k–5k | mid/highmid, near-zero sub/low | −24 to −18 |
| UI confirm / positive | 1–5 ms | 100–300 ms | 8–14 | 1k–3k | mid + highmid, rising pitch | −18 to −14 |
| Error / deny | 1–10 ms | 150–350 ms | 6–12 | 400–1200 | lowmid/mid, falling, dull | −18 to −14 |
| Pickup / coin | 0–3 ms | 150–600 ms | 8–14 | 2k–6k | highmid + high | −16 to −12 |
| Whoosh / swing | 30–200 ms (swell) | 150–600 ms | 6–12 | 800–4k (moving) | broadband noise, filtered | −16 to −11 |
| Footstep | 0–5 ms | 60–200 ms | 12–18 | 500–2k | low/lowmid thump + mid detail | −24 to −18 |

- Punchy = high crest + fast attack + short decay + a highmid transient spike in the first ~10 ms of the spectrogram.
- Mushy = crest <8 dB on a hit, attack >10 ms, lowmid dominant, centroid <300 Hz.
- Harsh = highmid > mid by >6 dB on a repeated sound, or a bright horizontal line (resonance) in 2–6 kHz on the spectrogram.
- Spectrogram cues: vertical line at onset = transient/click (good on hits, a defect at the end); energy above ~16 kHz with fold-back patterns = aliasing; horizontal bars = tonal ringing.

## 13. Checklist before showing candidates to a human

- [ ] Onset ≤2 ms from file start; no leading silence.
- [ ] Starts/ends at zero; fade-in ≥0.5 ms, fade-out ≥5 ms; no end-click on the spectrogram.
- [ ] |DC| < 0.001; HPF ≥25 Hz applied; nothing meaningful below 30 Hz unless it's a sub-boom.
- [ ] True peak ≤ −1 dBTP (≤ −1.5 to −2 if bright or lossy-encoded).
- [ ] Momentary max inside its category band (§10); all candidates in a batch level-matched within ±1 LU so the rater judges timbre, not loudness.
- [ ] Crest / attack / length / centroid within archetype ranges (§12), or deviation is intentional and stated.
- [ ] Survives 200 Hz HPF: still recognizable, M-max drop ≤ ~6 dB; lowmid+mid+highmid carry ≥30% energy.
- [ ] Low end (<150 Hz) mono; in-world SFX mono; correlation > 0; mono sum loss <2 dB.
- [ ] No narrow resonant peak >6 dB in 2–6 kHz; repeated/UI sounds not highmid-dominant.
- [ ] No aliasing above 16 kHz; LPF after distortion/bitcrush.
- [ ] Tails short enough for retrigger rate; reverb returns HPF'd 200–400 Hz.
- [ ] Layers each add a distinct band; summed low energy ≥ loudest single layer (no phase cancellation).
- [ ] Variation set (3–5) differs in pitch/timbre, not only level.
- [ ] Each candidate labeled with its key numbers and the one-line hypothesis it tests.

## Sources

- https://www.audiogang.org/wp-content/uploads/2015/04/IESD-Mix-Ref-Levels-v03.02.pdf (IESD/GANG: −24 LUFS ±2 console, −16 mobile, −1 dBTP)
- https://audiomediainternational.com/mobile-loudness-an-adaptive-approach/ (ASWG-R001 −24, Sony mobile −18)
- https://fast-and-wide.com/blog/46-blog/3716-sound-design-level-up (ASWG survey, −23 PS3 target, true-peak oversampling)
- https://designingsound.org/2013/02/loudness-in-game-audio/
- https://designingsound.org/2013/02/20/different-loudness-ranges-for-console-and-mobile-games
- https://www.gamedeveloper.com/audio/game-audio-theory-ducking
- https://www.gamedeveloper.com/audio/hdr-audio-in-wwise-best-practices-so-far-
- https://audiokinetic.com/en/blog/wwise-hdr-overview-and-best-practices-for-game-mixing (via search summary; site 403s)
- https://www.audiokinetic.com/en/blog/loudness-processing-best-practice-chapter-3-scalable-loudness-processing-for-games/ (via search summary)
- https://tech.ebu.ch/docs/r/r128s1.pdf (short-form: use max short-term loudness)
- https://nugenaudio.com/loudness-true-peak
- https://www.production-expert.com/production-expert-1/2018/6/11/8-tips-for-great-sounding-mixes-on-small-speakers
- https://www.izotope.com/en/learn/what-is-audio-saturation
- https://www.izotope.com/en/learn/how-to-use-transient-shaper-for-better-drum-breaks
- https://www.izotope.com/en/learn/mono-vs-stereo
- https://www.izotope.com/en/learn/layering-drums-benefits-pitfalls-and-techniques
- https://www.izotope.com/en/learn/what-is-crest-factor
- https://www.soundonsound.com/techniques/drum-compression
- https://www.prosoundweb.com/in-the-studio-the-6-trouble-frequencies/
- https://attackmagazine.com/technique/tutorials/layering-kick-drum-samples/2
- https://www.masteringthemix.com/blogs/learn/how-to-add-width-to-bass-without-losing-mono-compatibility
- https://valhalladsp.com/2011/05/23/valhallaroom-tips-and-tricks-short-drum-rooms/
- https://docs.godotengine.org/en/latest/classes/class_audioeffectreverb.html
- https://en.wikipedia.org/wiki/Equal-loudness_contour
- https://musiciwant.com/guide/missing-fundamental-bass-your-brain-invents
