# Turning human feedback into the next round

Shorthand used below (map these to your analyzer's bands):

| Band | Range | Typical words when excessive / lacking |
|---|---|---|
| SUB | 20–60 Hz | subby, rumble / no weight (laptop & phone speakers can't reproduce this) |
| BASS | 60–250 Hz | boomy (~125), muddy (~200) / thin, weak |
| LOWMID | 250–500 Hz | boxy, cloudy, woolly / hollow, scooped |
| MID | 500 Hz–2 kHz | honky (500–700), "cheap/Walmart" (~800), nasal (1–1.5k), tinny (1–2k) / distant, scooped |
| HIMID | 2–6 kHz | harsh, hard (~3k), piercing, fatiguing / dull, lacks definition |
| HIGH | 6–12 kHz | sizzly, sibilant (5–10k), brittle / dark, muffled |
| AIR | 12 kHz+ | fizzy, etched / closed, veiled |

Patch levers (exact keys: `docs/patch-format.md`): per layer `osc`/`fm`/`noise`/`pluck`/`modal`/`sample` with `bend` (pitch env), `filter` (+ cutoff `env`), `env` (amp), `drive`, `eq`, `unison`, `am`, `ring`; bus `comp`, `reverb`, `delay`, `drive`, `eq`; `rand`/`pick` for variants.

Step sizes: "a bit/slightly" = 0.5× default step, "more/less X" = 1×, "way/much/still too" = 2×. Default steps: EQ band ±3 dB (Q≈1), filter cutoff ×/÷1.5 (≈0.6 oct), envelope times ×/÷1.6, pitch ±2 st, drive ±6 dB, reverb send ±6 dB, detune ±8 cents. Changes under ~3 dB in a band or ~20% in a time are inaudible in a quick A/B of 3: don't spend a candidate on them (siblings must differ by §3's margins).

## 1. Descriptor lookup

"Verify" = the analysis number that should move. Δcentroid in octaves (×2 = +1 oct).

### Spectral balance / tone

| Word | Acoustic correlate | Moves | Verify |
|---|---|---|---|
| thin | weak fundamental vs harmonics; little 100–300 Hz | +3–6 dB shelf/bell at 120–250 Hz; add sine/triangle sub-layer at F0 or F0/2; lower HPF to ≤40 Hz; less resonance Q; drive a low layer lightly so harmonics of bass survive small speakers | BASS energy ↑, centroid ↓ 0.3–0.7 oct |
| thick / full | strong fundamentals, adequate 100–300 Hz, more partials/voices | if wanted: unison 3–5 voices ±8–15 ct, +3 dB at 150–300 Hz, layer octave-down. If "too thick": HPF 80–120 Hz, −3 dB at 200–300 | BASS+LOWMID share |
| muddy | excess ~150–300 Hz, smeared lows, long low reverb | −3 to −6 dB at 200–300 Hz (Q 1–1.5); HPF reverb return at 300–500 Hz; shorten low-layer decay 30–50%; remove overlapping low layers | LOWMID ↓; low-band decay ms ↓ |
| boomy / tubby | resonance ~80–150 Hz ringing | −4 dB narrow (Q 2–4) at peak 80–150 Hz; shorten sub decay; less filter resonance at low cutoff | BASS decay ↓, crest ↑ |
| boxy / cardboard | bump 300–500 Hz, lacking lows+highs | −3 to −6 dB at 300–500 Hz; +2 dB shelf ≥8 kHz | LOWMID ↓, centroid ↑ |
| honky / nasal / pinched | bump 500 Hz–1.5 kHz (honk 500–700, nasal ~1–1.5k) | −3 to −6 dB at offending peak (find max in MID); lower filter resonance; avoid bandpass/formant at those freqs | MID ↓ |
| cheap / plasticky (tonal sense) | ~800 Hz–2 kHz bump, no extremes, narrow band, static spectrum | −3 dB at 800 Hz–1.5 kHz; widen bandwidth (add SUB/BASS + AIR); add slow filter/pitch movement; replace bare square/saw with detuned unison or sampled layer; more transient detail | spectrum less peaky; band spread ↑ |
| tinny / telephone | narrowband, weak lows, peaky mids; highest-agreement EQ word (SocialEQ); synonyms: hollow, crisp, light, shrill, raspy | add BASS (+4–6 dB at 100–200), cut 1–3 kHz peak 3 dB, extend highs smoothly | BASS ↑, MID peak ↓ |
| hollow / scooped | mid dip or too much reverb; odd-harmonic-only (square) | +3 dB at 500 Hz–1 kHz; reduce reverb send; switch square→saw or add even harmonics (pulse width ≠50%) | MID ↑ |
| harsh / hard / edgy | excess 2–6 kHz, harmonics too strong vs fundamental, odd-order distortion | −3 to −6 dB at 2.5–5 kHz; lower filter cutoff to ≤4 kHz; drive: hard clip→soft/tube; FM index ↓ 30%; lower high-osc level | HIMID ↓, centroid ↓ |
| shrill / piercing / screechy | sharp narrow peaks 3–10 kHz; high sharpness (acum) | find narrow peak; −6 dB Q 4–6; reduce resonance on high filters; lower pitch 2–5 st | HIMID/HIGH peak ↓ |
| brittle / glassy | weak fundamentals + peaky highs | add BASS/LOWMID body; −3 dB 5–10 kHz; slower attack on noise layer | centroid ↓ |
| sizzly / fizzy | 5–12 kHz noise/aliasing | LPF noise layer 6–8 kHz; reduce bitcrush/SR-reduction; oversample drive | HIGH/AIR ↓ |
| bright | high spectral centroid (best single correlate) | if more wanted: +3 dB shelf ≥5 kHz, cutoff ×1.5–2, saw/pulse instead of sine, FM index ↑, add noise transient | centroid ↑ 0.5–1 oct |
| dark / dull / muffled / veiled | low centroid, weak highs | +3–6 dB shelf at 5–8 kHz; cutoff ×2; short noise click at onset (2–10 ms, HPF 3 kHz); keep sustained part darker if "harsh" also present | centroid ↑, HIGH ↑ |
| warm | low agreement word (SocialEQ) — usually more 100–400 Hz, gentle highs, mild even-harmonic saturation | +2 dB at 200–400 Hz, −2 dB shelf ≥6 kHz, soft-saturation (tape/tube) drive +3–6 dB, slow detune; **split interpretations across candidates** | centroid ↓ 0.3 oct, LOWMID ↑ |
| cold / clinical / sterile | high centroid, pure/static waveforms, no saturation, sharp transients | the inverse of warm; add subtle drift (±3–5 ct LFO 0.2–1 Hz), even harmonics, soften transient | — |
| metallic / clangy / bell | inharmonic partials, long ringing high partials (FM non-integer ratio, ring mod, comb/resonator) | if unwanted: FM ratio → integer (1, 2, 3), lower index; shorten high-partial decay; remove comb/resonance. If wanted: ratio 1.4, 3.5, √2; decay 300–1500 ms | spectrogram: non-harmonic lines |
| airy / breathy | energy 12–20 kHz, noise component | +2–4 dB shelf ≥10–12 kHz; HPF'd noise layer (≥6 kHz) at −18 to −24 dB under body | AIR ↑ |
| sparkly / shimmery | short HF partials re-triggering, chorused highs | add high bell/FM partials (ratio 3–7) with random short blips; octave-up shimmer reverb; chorus on high layer | HIGH variance over time ↑ |
| round / smooth / soft (timbre) | HF rolloff, no peaks | LPF 4–6 kHz, sine/triangle, slower attack 5–15 ms | centroid ↓ |
| sharp | high sharpness (energy above ~3 kHz/16 Bark) **or** fast attack | ask which via candidate split: one HF-cut, one attack-softened | — |

### Texture / distortion

| Word | Acoustic correlate | Moves | Verify |
|---|---|---|---|
| crunchy / crispy | pleasant mid-high distortion, dense upper partials, gritty transient | drive +6–12 dB on a mid layer (bandpass 800 Hz–4 kHz), parallel blend 30–50%; noise burst 10–40 ms; bitcrush 8–10 bit on transient only | HIMID ↑, crest ↓ slightly |
| gritty / dirty / grungy | broadband distortion, noise, roughness | drive + noise layer; FM with slight inharmonicity; AM at 30–70 Hz (roughness) | — |
| rough / raspy / buzzy | amplitude/freq modulation 20–150 Hz (max roughness ≈70 Hz for carriers ≥1 kHz); close partials beating | to add: AM/FM at 40–80 Hz depth 30–100%. To remove: kill LFOs/detune in 15–150 Hz range, reduce unison detune < ~5 ct or spread > 30 ct | spectrogram sidebands |
| wobbly / fluttery | modulation < 20 Hz (fluctuation strength, max ~4 Hz) | remove/slow LFO; or make deliberate | — |
| clean | no distortion/noise | drive 0, remove noise layer, sine/triangle, no bitcrush | crest ↑ |
| smeared / blurry | poor transient, long overlapping layers, reverb pre-delay 0 | sharpen attack (<3 ms), shorten decays 30%, reverb pre-delay 15–30 ms, reverb send −6 dB | attack ms ↓ |
| 8-bit / chiptune / too retro | pulse waves (12.5/25/50% duty), stepped triangle, LFSR noise, bitcrush, stepped pitch, no reverb/stereo | to remove: replace pulse with detuned saw/FM or sample layer; smooth (exponential) pitch envelopes; replace bitcrush with saturation; add filter env + reverb 10–20%; add noise transient with LPF. To add: inverse; pitch steps per 16 ms frame | spectrogram: stepped pitch lines, aliasing |
| synthetic / electronic | static, perfectly periodic, no noise, exact repeats | add 5–15% noise, random micro-pitch (±5 ct), filter env, sample layer; per-play variation (±3% pitch, ±1 dB) | — |
| organic / realistic / natural | noise + inharmonic transients, exponential decays, room | layer a recorded sample (impact, cloth, wood) under synth; exponential decays; short room reverb (0.3–0.8 s, send −18 dB) | — |
| cartoony / toony / cute | exaggerated pitch motion, high register, tonal, short | pitch env sweeps ±5–12 st over 50–200 ms; raise pitch +5–12 st; sine/triangle; boing = pitch LFO 8–15 Hz decaying | — |
| cheap (overall) | usually *static + narrowband + stock waveform + no layering*; sometimes too loud/harsh | ≥2 layers (transient / body / tail) with separate bands; add movement (filter/pitch env); remove 800 Hz–2 kHz bump; subtle room; never bare square | layer count, spectral spread |

### Envelope / dynamics / time

| Word | Acoustic correlate | Moves | Verify |
|---|---|---|---|
| punchy | fast attack (<5 ms), strong 60–200 Hz transient, short decay, high crest | attack 0–3 ms; low pitch drop on body (e.g. 150→50 Hz over 30–80 ms); transient click layer 2–10 ms; bus comp slow attack (10–30 ms) to let transient through; cut tail | attack ms ↓, crest ↑ |
| snappy / tight | fast attack + fast decay, no ringing lows | attack <3 ms, decay ×0.6, gate tail, cut low resonance | decay ms ↓ |
| loose / flabby | slow low-end decay, ringing, weak transient | shorten BASS decay 40–60%, HPF 40 Hz, sharpen attack | low decay ↓ |
| soft / gentle | slow attack, low crest, darker | attack 10–40 ms, LPF ≤5 kHz, remove click | attack ↑, crest ↓ |
| weak / underwhelming | low mass: little BASS, short, low crest, small layer count | loudness is fixed, so not gain: add sub/body layer + transient, 30–80 ms longer body, pitch drop, slight saturation | BASS ↑, duration ↑ |
| clicky | 1–5 ms broadband spike, envelope discontinuity, DC step | attack ≥1–2 ms on all layers; fade-in on samples; HPF 20 Hz; reduce click layer −6 dB or LPF it 4–6 kHz | first 5 ms peak ↓ |
| heavy / big / weighty | low F0, SUB/BASS, longer decay, wide/reverberant | pitch −5 to −12 st; sub layer 40–70 Hz; decay ×1.5; slow pitch drop; reverb tail 0.8–2 s (HPF 200 Hz) | BASS/SUB ↑ |
| light / small / tiny | high register, short, no lows | pitch +5–12 st; HPF 200–400 Hz; decay ×0.5; dry | centroid ↑ |
| aggressive | high HIMID, distortion, fast attack, roughness, downward pitch | drive +9–15 dB, attack <2 ms, AM 50–70 Hz, +3 dB at 2–4 kHz | — |
| wet / washy | high reverb/delay send | reverb send −6 to −10 dB, decay ÷2, pre-delay 20 ms, HPF return 300 Hz | tail RT ↓ |
| dry | no reverb | send +6 dB, 0.3–1.2 s decay | — |
| distant / far | low direct/reverb ratio, HF loss, soft attack | (to bring close) reverb −6 dB, +2 dB 3–6 kHz, sharpen attack | — |
| close / in-your-face | high direct, presence, full lows (proximity) | (to push back) reverb +6 dB, −3 dB shelf ≥4 kHz, attack ×2 | — |
| too long / lingers | tail duration, reverb | decay/release ×0.6, reverb decay ÷2, fade-out earlier; check −40 dB point | decay ms ↓ |
| too short / abrupt / cut off | truncated tail, no release | release ×1.6, add 100–300 ms tail layer or reverb; exponential not linear fade | — |
| laggy / late / sluggish | slow attack, pre-delay, quiet onset, sample with leading silence | trim leading silence to <2 ms; attack <5 ms; put transient layer first; check onset at t=0 | onset ms ≈0 |
| busy / cluttered | too many layers/events, overlapping bands | drop weakest layer; give each layer its own band; shorten overlaps | — |
| boring / flat / static | no movement in time | add pitch env (±2–7 st), filter sweep, second event (e.g. 60–120 ms later), stereo/variation | spectrogram change over time |
| generic / stock | archetypal preset (bare saw sweep, white-noise whoosh) | add a signature: inharmonic partial, tonal element in game key, unusual layer, distinctive pitch contour | — |

### Affect / function (game words — always ambiguous; spread interpretations across candidates)

| Word | Common correlates | Moves |
|---|---|---|
| satisfying / juicy | exaggerated, layered, coherent with action; fast transient + weighty body + tonal/rewarding tail; "larger than life", less realistic | 3-layer stack: click (2–10 ms) + body w/ pitch drop + tonal tail (in game key, rising for rewards); +30–80 ms duration; slight saturation. Reserve for important cues (~10%) |
| rewarding / positive | upward pitch, consonant intervals, major/bright | pitch env up (+5/+7/+12 st), arpeggio maj triad/5th, sine/bell tones |
| negative / error | downward pitch, dissonance, buzz | pitch down, minor 2nd/tritone, square/buzz, short and blunt |
| annoying / grating | HIMID 2–5 kHz, sharpness, roughness, long, repetitive, too loud relative to importance | −3 to −6 dB 2–5 kHz, kill 20–150 Hz modulation, shorten 30–50%, more per-play variation, lower cue loudness target 2–3 LU |
| fatiguing (repeated cue) | same as annoying + identical repeats | randomize pitch ±3% / gain ±1 dB / layer choice; shorten; darken; lower target |
| magical / mystical | shimmering highs, chorus, reverb, inharmonic bells, upward glissandi | bells (FM ratio 3.5, 7), chorus, reverb 1.5–3 s, sparkle layer, slow upward sweep |
| cheap (affective) | see texture table; also *too loud or too clean* | — |
| "doesn't fit" / out of place | key clash with music, wrong register, wrong reverb space | tune tonal parts to game key; match reverb to game's other SFX |

## 2. Interpreting thumbs and comments

### Parse each round into structured deltas
- Per candidate: `vote ∈ {+1, −1, none}`, comments → list of `(word, direction, component, intensity)`. Component ∈ `attack (0–30 ms) | body | tail | whole`.
- Map words via §1; when a word has several correlates (warm, cheap, sharp, satisfying), **don't pick one — assign interpretations to different candidates**.
- Thumb = global verdict; comment = delta. "👍 too long" means *keep everything, shorten only*.
- Comments on a 👎 candidate tell you which axis made it bad → add that region to the tabu list, not the whole patch.

### Next-3 allocation by state

| State after round | Candidate A | B | C |
|---|---|---|---|
| 1 up, others down, comment on up | up + comment at 1× step | up + comment at 2× step (or alt interpretation) | explore: new direction, or up × another axis |
| 1 up, no comment | up + clearly audible change (§3 margins) on axis 1 | up + clearly audible change on axis 2 | crossover/morph of up with best-down's liked part, or explore |
| 2 up | crossover/morph (midpoint) | up1 + its comments | up2 + its comments |
| all up, no select | one-axis variants of the best (OFAT), each clearly audible, to find the deciding feature | — | — |
| all down, comments | treat comments as gradient on the least-bad; move 2× | opposite of the shared complaint | new direction far from all tabu regions |
| all down, no comments | revert to best-so-far from log + 1 change | 2 unexplored round-1 style directions | — |
| 2+ rounds of all down | stop guessing: present 3 extreme archetypes along the most-likely axis (e.g. very dark / mid / very bright) to re-locate; ask for one comment |

Defaults: **2 exploit + 1 explore** after round 1; drop to 3 exploit once a candidate gets 👍 twice in a row; return to 1 explore if the score stops improving for 2 rounds.

### Mutation size
- Start large, shrink: round 2 ≈ 25–35% of each parameter's range (or 1 octave cutoff / 6 dB / ×2 times); each round with a 👍 halve it; floor at ~3 dB, ~25% time, ~½ oct: below that the 3 sound the same.
- Mutate **few genes, by a lot** rather than all genes slightly (Dahlstedt: mutation probability × range control the degree of change). Mutate 1–3 parameters per candidate so you can attribute the vote.
- Group parameters (transient / pitch / filter / envelope / FX) and evolve one group at a time once the direction is right; protects finished parts.
- Keep dependent parameters coupled: FM modulator as integer ratio of carrier, filter cutoff relative to F0, envelope times relative to cue duration.

### Crossover ("attack of A + tail of B")
- Layered patch: take A's transient layer(s) and attack params (attack ms, pitch-env start, click, first ~30–50 ms) + B's body/tail layers, decay/release, reverb send, filter-env end.
- Align onsets to 0 ms; if both have a click/transient keep only one; crossfade over 10–30 ms at the seam; re-check summed BASS (double low layers → mud) and re-normalize loudness.
- Other operators: **morph** = linear interpolation of all params (midpoint, or 0.3/0.7) — good for 2 liked candidates; **insemination** = A with a small block of B's genes — good when A was liked and B had one nice feature.

### Contradictions
- Same round, opposite comments ("A too bright", "C too dull") → target between them on that axis; next round bracket: midpoint ± ¼ of the gap.
- Across rounds → recency wins, but keep the old point in the log; if it flips twice, the word means something else (e.g. "harsh" = roughness, not HF) — test the alternative correlate.
- Thumb vs comment conflict → trust the thumb for direction, the comment for the next change.
- Comment vs analysis ("too quiet" while loudness-matched) → it's spectral/temporal: quiet-sounding = low HIMID, short, or masked; add 2–4 kHz presence or duration, not gain.

### Worked translations

| Feedback | Next 3 |
|---|---|
| `A 👍 "more crunch" \| B 👎 \| C 👎 "too 8-bit"` | A + drive 9 dB on 1–4 kHz band layer (parallel 40%); A + 20 ms noise burst LPF 6 kHz; A + both at 0.5×. Tabu: pulse/bitcrush (C) |
| `"tail of B, attack of A"` | crossover (A transient + B tail, 20 ms crossfade); same with B's reverb send −3 dB; morph 0.3A/0.7B |
| `A 👎 "muddy" \| B 👎 "thin" \| C 👎 "cheap"` | bracket BASS between A and B (−3 dB at 250 Hz vs A, +4 dB at 150 Hz vs B); C's fix: add layer + movement; one new direction |
| `all 👍, no select` | best at ×0.6 length; best + centroid ½ oct up; best + centroid ½ oct down |
| `B 👍 "more satisfying"` | B + pitch-drop body + click; B + rising tonal tail in key; B + 60 ms longer body + soft saturation |
| `C 👎 "annoying"` (UI cue) | C −5 dB at 3 kHz + 40% shorter; C one octave lower, sine; new soft-attack (8 ms) direction |

### Fatigue and stopping
- Signs: comments get shorter/vanish, blanket all-👍/all-👎, reversals of stable preferences, "fine"/"whatever".
- Interactive evolution is fatigue-limited; 10–20 generations is the practical maximum (Takagi). For one SFX cue aim to converge in ≤5 rounds.
- When fatigued: suggest selecting the best so far (any earlier round is selectable), or present 2 distinct takes on it + 1 contrast; defer the cue to a later session.
- Keep binary/coarse input (thumbs) — discrete coarse ratings reduce fatigue vs fine scales.

### Per-cue hypothesis log (keep in `notes/<cue>.md`; `state.json` is tool-managed)
```json
{"cue":"impact","round":3,
 "champion":"r2_B",
 "beliefs":[{"axis":"centroid","target":"1.8–2.5 kHz","evidence":["r1 A too bright","r2 C too dull"],"conf":0.7},
            {"axis":"decay_ms","target":"150–250","evidence":["r2 B 👍 'too long' at 400"],"conf":0.6}],
 "word_map":{"warm":"LOWMID+ & soft sat (not HF cut — r2 HF-cut was 👎)"},
 "tabu":[{"from":"r1_C","region":"pulse waves + bitcrush","reason":"'too 8-bit'"}],
 "next_test":"is 'crunch' drive on mid layer or noise transient?"}
```
- One belief per axis with target range + confidence; each candidate tests ≥1 belief.
- **Tabu list**: store rejected candidates' feature vectors (centroid, attack ms, decay ms, band energies, crest) and offending component. Reject any new candidate within a small distance of a tabu point on the offending component (e.g. centroid within ¼ oct and same waveform family) unless it's deliberately re-testing.
- Re-present the unchanged champion (unlabeled, random slot) every 2–3 rounds as a hidden reference: if it now loses, preferences drifted or fatigue set in. (soundset lets Weston select any earlier round's candidate directly, so re-present only for this drift check, never to make it selectable.)

## 3. Candidate-set design

- **Name the axis each candidate tests** (internally): e.g. A = "+crunch via drive", B = "+crunch via noise transient", C = "explore: tonal tail".
- **Meaningful variance is mandatory in every round, including convergence rounds** (Weston, round 3: "these 3 sound the same… we always want some meaningful variance unless the user specifies they want three of the same thing with slight variation"). Converging = 3 distinct takes on the favorite, never 3 near-copies.
- Differences must be clearly audible: ≥½–1 oct centroid, ≥2× attack/decay, ≥6 dB band change, ≥3 st pitch, or a different layer. Near-identical triplets waste a round and tire the listener.
- Vary ≤2 axes per candidate after round 1 so votes are attributable.
- **Loudness-match every candidate** to the cue target, within ±0.5 LU: louder is judged better, even with sub-1 dB differences listeners don't notice as loudness. For sounds <400 ms integrated LUFS is unreliable — match max momentary (400 ms) loudness or K-weighted RMS over the active part. True peak ≤ −1 dBTP.
- Keep durations comparable (±20%) unless duration is the tested axis; longer/fuller sounds read as "better"/juicier.
- Same seed for randomization within a round; jitter only at bake.
- Randomize slot order (A/B/C) each round; never always put the "safe" one first.
- **Round 1: three distinct directions**, e.g.
  - synthetic (FM/subtractive) / organic (sample-led) / hybrid; or
  - bright-short-snappy / dark-heavy-long / tonal-musical;
  - plus fixed loudness and similar duration. Goal is to learn which region, not to polish.
- Respect context: SFX that are fine solo can be lost or annoying in-game; offer "▶ in context" and weight its feedback higher. Frequency-slot cues against neighbors (e.g. impact owns BASS, UI clicks own 2–5 kHz).
- Check output on small speakers mentally: anything <150 Hz may be inaudible on laptops/phones — carry bass weight via harmonics (saturation, 2nd/3rd harmonic layer), not sub alone.

## 4. Listening-test pitfalls

| Pitfall | Effect | Mitigation |
|---|---|---|
| Level mismatch | louder wins, even <1 dB | normalize ±0.5 LU (see §3); report LUFS/peak per candidate |
| Order / primacy | first-presented rated higher in pairwise tests (Knoll & Siedenburg 2022); recency also occurs | randomize slot order; log slot position; discount votes that just track slot |
| Duration bias | longer/fuller sounds seem more impressive solo | match duration; judge in context |
| Solo vs context | solo favors big/bright; in-game they mask or annoy | in-context playback; weight it higher |
| Repetition / habituation | re-listening makes any sound blander or more annoying | keep candidates short (≤2–3 s for SFX; standards cap stimuli at ~10–20 s); limit cues per session |
| Fatigue | votes become random/blanket | ~10 cues/session or split sessions; watch fatigue signs (§2) |
| Reference-matching / anchoring | candidates closest to the current/reference sound win | vary the reference; don't always present a near-copy of current |
| Range-equalizing | listener spreads votes across what's present; one 👎 may just be "worst of 3" | read votes as relative within round, not absolute |
| Vocabulary ambiguity | "warm", "sharp", "cheap" vary by person | branch interpretations across candidates; build `word_map` per listener |
| Playback device | laptop/phone speakers lose <150 Hz, earbuds exaggerate bass | assume small speakers; keep HIMID clarity; ask device once |
| Clipping / inter-sample peaks | distortion read as "cheap/harsh" | true peak ≤ −1 dBTP; check crest factor after drive |
| Too many simultaneous changes | can't attribute the vote | ≤2 axes per candidate |
| Random seed differences | candidates differ by noise, not design | fixed seed within round |
| Expectation from labels | knowing which is "new" biases | never label candidates by strategy |

## Sources
- https://www.prosoundweb.com/in-the-studio-the-6-trouble-frequencies/ (Owsinski trouble frequencies)
- https://www.radioworld.com/news-and-business/glossary-of-sound-quality-terms (Bartlett sound-quality glossary)
- https://izotope.com/en/learn/a-glossary-of-common-and-confusing-mixing-terms.html
- https://archives.ismir.net/ismir2013/paper/000173.pdf (Cartwright & Pardo, SocialEQ)
- https://labs.sonicfield.org/library/an-interlanguage-unification-of-musical-timbre (Zacharakis et al., luminance/texture/mass)
- https://archives.ismir.net/ismir2011/paper/000006.pdf (Zacharakis et al. 2011)
- https://depositonce.tu-berlin.de/items/b605438e-8a1b-4c32-970b-05b33ee6b7bf/full (Saitis & Weinzierl, The Semantics of Timbre)
- https://www.phys.unsw.edu.au/jw/reprints/SchubertWolfe06.pdf (brightness ↔ spectral centroid)
- https://acousticslab.org/RECA293/293Files/293Downloads/Lakatos2000_Timbre.pdf (centroid + rise time)
- https://metricgate.com/docs/sharpness-acum-din45692/ and https://mosqito.readthedocs.io/en/latest/source/reference/mosqito.sq_metrics.sharpness.sharpness_din.sharpness_din_st.html (sharpness, DIN 45692)
- https://acoustics.salford.ac.uk/?p=716 and https://support.sw.siemens.com/en-US/okba/KB000042814_EN_US/Sound-Modulation-Metrics-Fluctuation-Strength-and-Roughness/index.html (roughness, fluctuation)
- https://arxiv.org/pdf/2008.12073 (DrumGAN; Audio Commons timbral models)
- https://pypi.org/project/timbral_models/
- https://en.wikipedia.org/wiki/Ricoh_2A03
- https://www.dmu.ac.uk/documents/technology-documents/research/mtirc/nowalls/mww-dahlstedt.pdf (Dahlstedt, MutaSynth)
- https://research.universityofgalway.ie/en/publications/interactive-ec-control-of-synthesized-timbre-3/ (McDermott et al.)
- https://eprints-gro.gold.ac.uk/20164/1/yeeking_acm_cie.pdf (Yee-King, interactive GA sound design)
- https://neuro.bstu.by/ai/Data-mining/Messy-GA/ProcIEEE_3.pdf (Takagi 2001, IEC survey)
- https://www.cse.unr.edu/~quiroz/inc/docs/trans2009.pdf (Quiroz et al., small-subset IGA)
- https://kgajos.seas.harvard.edu/papers/huang14knobs.pdf (Huang et al., GP active learning of synth knobs)
- https://koyama.xyz/project/sequential_line_search/ (Koyama, sequential line search)
- https://arxiv.org/pdf/2505.23673 (Bayesian optimization from human feedback)
- https://eprints.staffs.ac.uk/8527/1/3677084.pdf (Juicy Audio, CHI PLAY 2024)
- https://designingsound.org/2017/11/19/sunday-sound-thought-96-juicy/
- https://arxiv.org/pdf/2411.12719 (Rethinking MUSHRA: biases, fatigue)
- https://curdt.home.hdm-stuttgart.de/PDF/Klein.pdf (ITU-R BS.1116/BS.1534 procedures)
- https://doaj.org/article/95d755128ddb469680e06a4a615fd2f0 (Knoll & Siedenburg 2022, presentation order)
- https://www.cstr.ed.ac.uk/downloads/publications/2012/janskaeral_IS_2012.pdf (order balancing in paired comparison)
- https://theaudiostuff.com/tools/abx-test.md and https://www.soundonsound.com/reviews/meterplugs-perception (level matching)
