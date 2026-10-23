# Synthesis recipes for game SFX, by category

Target: cozy-but-punchy deckbuilder auto-battler (cartoon animals; SAP / Balatro / Slay the Spire feel).
Numbers are **starting points**: render, read the analysis, then move one parameter at a time.

## Notation
- `sine 150→45Hz/120ms exp`: osc + pitch env (start→end over time, curve). Multi-point: `400→1200/80→900/200`.
- `A2 H10 D180 exp`: amp env in ms (attack, hold, decay). `D` decays to silence (-60 dB).
- `LP 6k Q0.7 env 9k→2k/80ms`: filter type, cutoff, Q, cutoff envelope. Types: LP HP BP NOTCH PK (peaking: `PK 3k -4dB Q1`).
- `FM 1:1.4 I 8→0.5/300ms`: carrier:modulator ratio and index envelope.
- `uni 3 ±12c sp0.5`: unison voices, detune cents, stereo spread. `@+30`: layer start offset (ms). `-6dB`: layer gain relative to the main layer.
- `drive tanh 0.3`: waveshaper amount (0–1). `rev 0.8s pre15 damp0.6 wet15%`.
- Semitones → ratio = 2^(n/12): +1 1.059 · +2 1.122 · +3 1.189 · +4 1.260 · +5 1.335 · +7 1.498 · +9 1.682 · +12 2.000 · −1 0.944 · −3 0.841 · −5 0.749 · −6 0.707 · −7 0.667.

## Global rules (read first)
- **Anatomy.** Transient (0–15 ms: identity and "click"), body (15–150 ms: pitch and weight), tail (decay and space). A weak sound is usually missing one of the three. A strong body with no transient sounds muffled.
- **Bands.** Sub 30–80 Hz (felt; laptops and phones drop most of it). Body/weight 100–400 Hz. "Mud" 200–500 Hz when stacked. Presence and annoyance 2–5 kHz (the ear is most sensitive here). Air and sparkle 6–12 kHz.
- **Small-speaker translation.** Anything that must read as heavy also needs energy at 120–300 Hz: a 2nd/3rd harmonic via `drive tanh 0.2–0.4`, or a body layer an octave above the sub. A pure 45 Hz sine is silent on a phone.
- **Clean low end.** HP every non-sub layer at 80–150 Hz. HP the sub at about 25 Hz (energy below that wastes headroom).
- **Clicks.** Any sine or tonal layer starting at nonzero amplitude needs `A ≥1–3 ms`; every layer needs a 2–5 ms fade at its end. A vertical line on the spectrogram at onset or end means an unintended click. A 0 ms attack is only for deliberate tick or transient layers.
- **Duration budgets (auto-battler: events overlap, game speed-up).** UI 30–150 ms (hover ≤60). Combat hits 80–400 ms. Rewards and sparkles 300–900 ms. Jingles 1.5–3 s. Long tails smear when 6 animals hit in 1 s.
- **Relative loudness ladder** (the engine normalizes, so set each cue's LUFS target relative to the heavy hit = 0 dB). Hover −14 · click −9 · card deal −10 · card play −5 · coin −6 · error −7 · light hit −4 · heavy hit 0 · slam/explosion 0 to +1 · buff −6 · jingles −3 (sustained, so integrated LUFS overstates them).
  - For cues <400 ms, integrated LUFS (400 ms gating blocks) is unreliable. Compare momentary-max and peak. Keep true peak ≤ −1 dBTP.
  - Console games standardize around −24 LUFS integrated for the overall mix (Sony ASWG-R001). Mobile runs louder with a narrower range.
- **Variation.** Per play: ±3% pitch (about ±50 c), ±1 dB, and 2–4 baked variants. For combos or chains, step pitch +1 semitone per consecutive event, or walk a major pentatonic scale (0,2,4,7,9,12).
- **Cozy vs punchy.** Cozy: sine, triangle, plucks, modal wood or glass, consonant intervals, short rooms (0.3–0.8 s), little drive. Punch: a sharp transient, a fast pitch drop, a sub thump, and a brief bus comp (ratio 3–4:1, attack 5–10 ms so the transient survives, release 60–120 ms).

### Human comment → parameter move
| Comment | First move | Second move |
|---|---|---|
| harsh / piercing / shrill | PK 3k −4 to −6 dB Q1; LP 7–9k | less drive; square→triangle |
| muddy / boomy | HP 150; PK 300 −4 dB | shorten body decay 30% |
| thin / weak / small | add sub thump 120→50Hz; body layer 150–250 Hz | drive tanh +0.2; lower pitch 2–3 st |
| no punch / soft | transient noise burst 5 ms HP 2k; faster pitch drop | attack to 0–1 ms; comp attack 10 ms |
| too long / laggy | decay −40%; reverb wet halved | trim leading silence (onset must be <5 ms) |
| clicky / poppy (unwanted) | attack 2–5 ms; end fade 5 ms | LP the transient at 6k |
| too 8-bit / cheap | square→saw+LP or FM; add `uni 3 ±10c` | room reverb 0.4 s wet 10% |
| too realistic / serious | add pitched element (modal or pluck); shorten tail | raise pitch 3–5 st; less sub |
| boring / static | pitch env (even ±1 st); filter env | second layer @+20–40 ms |
| sad / negative (unintended) | make intervals rise; major 3rd/5th | remove detune and minor intervals |
| cheesy / too cute | fewer arpeggio notes; less reverb | lower register, slower glide |

## Building blocks

### Sub-drop / thump
- `sine 150→45Hz/80–200ms exp`, `A1 D150–300 exp`. A faster drop (30–60 ms) gives "punch"; a slower one (150–400 ms) gives "boom" or "trailer".
- Pitch-env depth: a few semitones gives a subtle thump; an octave or more gives an aggressive snap. Kick-style pitch-env decay is 20–80 ms against an amp decay of about 200 ms.
- Click layer: white noise `A0 D5–15`, −15 dB.
- Small-speaker copy: duplicate an octave up (300→90 Hz) at −10 dB, or `drive tanh 0.3` on the sub.

### Karplus-Strong pluck
- Delay N = fs/f. Loss (decay) 0.990–0.998: 0.990 ≈ muted/kalimba, 0.997 ≈ guitar/harp. Stretch/brightness: averaging blend 0.5 (dark) to 0.9 (bright).
- Excitation: white noise burst = bright; LP 2k noise = soft/felt; a single-sample pulse = harp-like.
- Drum variant: invert the sign with probability 0.5 per sample → snare/bongo noise-pitch blend.
- Cozy pluck: KS 523–1046 Hz (C5–C6), loss 0.993, LP noise excitation 4k, + sine at f `A1 D120` −8 dB to reinforce pitch.
- Use for: UI select, card play accent, coin (high), jingle melody.

### Modal ratio tables (modal resonator: ratio, gain, decay)
| Material | Ratios | Notes |
|---|---|---|
| Church bell | 0.5 (hum), 1 (prime), 1.2 (tierce, minor 3rd), 1.5, 2 (nominal), 2.5, 2.667, 3, 4 | hum decays longest; inharmonic strike dies first |
| Handbell (beating pairs) | 1, 1.0019, 1.794, 1.801, 2.520, 2.522, 2.991, 2.994, 3.786 | close pairs give the shimmer/beating |
| Tibetan bowl 152 mm | 1, 2.662, 4.838, 7.516, 10.640, 14.210 | long (3–8 s); 1.0 + 1.003 pair for beat |
| Wine glass | 1, 2.32, 4.25, 6.63, 9.38 | f0 600–1500 Hz; decay 1–2 s |
| Aluminum bar (glock/chime) | 1, 2.756, 5.423, 8.988, 13.448 | f0 1–3 kHz → glockenspiel/"ding" |
| Xylophone (tuned wood bar) | 1, 3.932, 9.538, 16.688 | decay 80–300 ms |
| Vibraphone | 1, 3.984, 10.668, 17.979 | decay 0.8–2 s |
| Uniform wooden bar | 1, 2.572, 4.644, 6.984, 9.723 | f0 300–1200 Hz, decays 40–150 ms |
| Wood plate (cedar/fir) | 1, 1.42–1.47, 2.09–2.11, 2.47–2.57 | dense low modes → "box/knock" |
| Pot lid (metal plate) | 1, 3.2, 6.23, 6.27, 9.92, 14.15 | 6.23/6.27 pair = clangy beat |
| Chalandi plates | 1, 1.726, 5.806, 7.419, 13.919 | gong-ish plate clank |
| Circular membrane | 1, 1.593, 2.136, 2.295, 2.917, 3.500, 3.598 | toms, bongos, drum "boing" |
| Tabla (dahina) | 1, 2.89, 4.95, 6.99, 8.01 | pitched drum |

- Gains: start at `1/ratio` and give 2–3 upper modes +3 dB for character. Decays: wood `d_k = d_1/ratio_k` (strongly damped); metal and glass `d_k = d_1/√ratio_k`.
- Wood never sounds wooden from modes alone. Add a 3–8 ms noise excitation (BP at about 2× f0, Q1) or KS drum variant.
- Detune each mode ±0.2–0.5% per variant for natural variation.

### FM ratio table
| Use | c:m | Index env | Dur | Source/notes |
|---|---|---|---|---|
| Bell | 1:1.4 (≈1:√2; Chowning 200:280 Hz) | 10→0, same curve as amp | 15 s (game: 0.6–2 s) | Chowning bell |
| Wood drum | 1:0.6875 (80:55 Hz) | 25→0 fast (first 10–20%) | 0.2 s | Chowning wood drum |
| FM drum | 1:1.4 | ≈6–8, 1.0→0.3 in first 0.7% of note, 0 by 10% | 0.75 s @130 Hz | CLM fm-drum |
| Tubular bell | pairs 2:5 (I 3), 0.6:4.8 (I 2), 0.22:0.83 (I 1) | exp decay, 5 s | — | CLM fm-bell |
| Brass stab | 1:1 | 5, tracks amp | 0.6 s | Chowning brass |
| Hollow/clarinet | 1:2 | 1–3 | — | odd harmonics |
| Clank / metal hit | 1:3.5 or 1:2.76 | 4→0.5/150ms | 0.2–0.6 s | inharmonic, harsh above I 6 |
| Tine "ding" attack | 1:14 | 3→0/30ms | — | DX-style e-piano tine (heuristic) |
| Glassy | 1:7 or 1:9 | 1.5→0.2/200ms | 0.5–1 s | sparse high partials |

- Integer ratios give harmonic spectra; non-integer give inharmonic (bells, metal). Index sets brightness, with sidebands at c ± k·m, roughly k ≤ I+2.
- Decay the index faster than the amp: the sound darkens as it fades, which is the main "real" cue.

### Wood knock / tick
- Modal wooden bar at 400–900 Hz: decays 60/30/18/12 ms, + noise `A0 D4` BP 2k Q1.2 −6 dB. Total ≤100 ms.
- Clave/block: sine 2–2.5 kHz `A0 D25–40` + 2.57× partial −10 dB.

### Metal clink (808 cymbal family)
- 6 square oscs at 205.3, 304.4, 369.6, 522.7, 540, 800 Hz → two BPs: 3.44 kHz and 7.1 kHz → HP ~10 kHz shelf for the top band.
- Hat/clink `A0 D30–80`; ping `BP 1k` swept down over 0.2 s; tail `HP 2.6k` decaying over 0.75 s.
- 808 cowbell: squares at 540 + 800 Hz, BP about 2.6 kHz, `D 60/300` (two-stage).

### Noise sweeps
- Whoosh: pink noise `BP Q1.5–3`, center rise-fall `400→2.5k→800Hz`, amp swell A≈60–70% of duration then fast D. BP = narrow and hyped; HP = starts deep and thins.
- Riser: noise LP opening `300→8k/dur exp` + saw `uni 5–7 ±20–30c` pitch +12 to +24 st over the duration + rev 1.5 s wet 30%. End with a cut, or land on a hit. Game risers: 300–1000 ms.
- Reverse swell: render a hit with a long tail, reverse it, trim; place so it ends exactly on the target event.

### Stinger intervals
| Reads as | Pattern (semitones) | Timing |
|---|---|---|
| positive / confirm | +4 (M3) or +7 (P5), 2 notes | 50–80 ms apart |
| reward / level | 0, 4, 7, 12 (major arpeggio) or pentatonic 0, 2, 4, 7, 9, 12 | 40–70 ms/note, last held |
| big win | 0, 4, 7, 12 then a held major chord, top note 16 or 19 | — |
| neutral / back | single note, or −5 / −7 (falling 4th/5th) | soft, not sour |
| negative / error | −1 (m2), −6 (tritone), descending minor 0, −3, −7, or a repeated low note ×2 | 60–100 ms |
| sinister / debuff | 0, 3, 6, 9 (diminished), chromatic descent, ±25–40 c detune | slower, 90–150 ms |

- Register: positive cues sit at C5–C7 (523–2093 Hz); negative cues sit an octave lower and are LP'd ≤2 kHz.

## Category recipes

### UI click / select
- Reads as: 30–80 ms, instant onset, centroid 1.5–4 kHz, no tail.
- L1 tick: white noise HP 3k `A0 D6–10`.
- L2 tone: sine or triangle 900–1600 Hz, pitch `+3st→0/15ms`, `A1 D40–60 exp`, −3 dB.
- Select/confirm: L2 becomes two notes, +4 or +7 st, second @+50–70 ms (e.g. 784→988 Hz). Or KS pluck C6 loss 0.99.
- sfxr "blipSelect": square/saw 145–1270 Hz, sustain 23–90 ms, decay ≤90 ms, HP about 350 Hz.
- Variants: softer = drop L1, LP 4k. Woodier = modal wood bar f0 700 Hz. Toy = KS pluck.
- Mistakes: anything >150 ms; low end below 120 Hz; very different timbres across UI cues (build one family, vary pitch and env).

### UI hover
- 15–50 ms, −5 dB below click, no noise layer, no content >5 kHz. It fires constantly, so it must be the least fatiguing cue.
- `triangle 1.8–2.6 kHz A1 D25`, pitch `+1st→0/10ms`. Option: ±1 st random step per hover.
- Mistake: reusing the click (players stop hearing the click); bright square waves.

### UI back / cancel
- Same family as confirm, inverted: two notes −5 or −7 st, or one note pitch `0→−2st/40ms`; LP 2.5k; 10–20% shorter.
- Not an error: stay consonant (no m2 or tritone), and keep it quieter than confirm.

### Card deal (slide)
- Reads as: paper friction 40–100 ms, centroid 3–6 kHz, then a tiny landing tick.
- L1 slide: pink noise BP 3k Q0.8, center env `2k→4.5k/60ms`, `A5 D60`. Amp env as a slight swell: `0→1 over 25ms`.
- L2 land tick @+50: white noise HP 4k `A0 D6`, −6 dB, + modal wood plate f0 900 Hz decay 15 ms, −12 dB.
- Multiple deals: 70–110 ms apart, ±5% pitch and ±1.5 dB each.
- Samples: Kenney Casino Audio (CC0; 23 card, 19 chip and 12 dice sounds). Use the card slide/place files, trimmed to ≤120 ms and pitched ±2 st.
- Mistakes: white noise without BP (sounds like static); no landing (sounds like wind).

### Card flip
- Two events 25–45 ms apart: lift "fft" + slap.
- L1 air: pink noise BP Q1.5, `1.5k→4k/50ms`, `A8 D40`.
- L2 slap @+35: white noise BP 2.5k Q1.2 `A0 D12` + wood plate f0 600 Hz modes 1/1.47/2.09, decays 25/15/10 ms, −6 dB.
- Magical/reveal: add glass modal f0 1.3 kHz decay 400 ms @+40, −10 dB.

### Shuffle (riffle)
- 400–800 ms train of 20–40 micro-ticks (white noise HP 3k, `A0 D2–4`). Interval 10–30 ms, accelerate then decelerate; gain random ±3 dB.
- Bed: pink noise BP 2k Q0.7, amp swell over the full length, −12 dB.
- Ends with a "bridge" settle: noise BP 1.2k `D40` + wood thud 250 Hz `D50`.
- Prefer a sample (Kenney shuffle) with trim, plus synth bed if thin; 30 layered ticks is fragile.

### Card play (commit to board)
- Must feel more decisive than a deal: slide + thud + identity accent, 150–300 ms.
- L1: deal slide, 50 ms.
- L2 thud @+45: `sine 200→90Hz/50ms A1 D90`, drive tanh 0.2.
- L3 accent @+50: KS pluck or modal glass at the card's "key" (C5–G5), decay 250 ms, −8 dB.
- Rev 0.4 s wet 8%.
- Heavier (rare/strong cards): body 160→60 Hz, + sub. Cuter: accent a 5th higher, no thud drive.

### Coin / gold gain
- Reads as: bright metallic + rising 2-note, 200–450 ms, centroid 2.5–5 kHz.
- Classic (Mario): square 988 Hz (B5) for about 80–90 ms → 1319 Hz (E6, +5 st) for about 400 ms with decay.
- sfxr pickupCoin: saw, 570–2860 Hz, attack 0, sustain ≤23 ms, decay 23–570 ms, punch 0.3–0.6, optional jump ×1.04–1.48 at 40–115 ms.
- Cozy recipe:
  - L1 clink: modal aluminum bar f0 2.2 kHz, modes 1/2.756/5.423, decays 220/120/60 ms.
  - L2 @+70: same at +5 or +7 st.
  - L3: white noise HP 6k `A0 D8` −10 dB.
- Many coins: 3–6 clinks @+25–45 ms random, pitches from major pentatonic, last one highest. +1 st per extra coin in a streak.
- Mistakes: no second note (reads as a "hit"); f0 <1 kHz (reads as a pot); long reverb (smears count).

### Purchase / buy
- "Cha-ching": chip/coin clinks + register bell + a small weight thud, 400–700 ms.
- L1: 2–3 metal clinks (as coin, f0 1.8 kHz) @0/+40/+75.
- L2 bell @+90: handbell modes at f0 1.6–2 kHz, decay 500 ms; or `FM 1:1.4 I 5→0/400ms`.
- L3 thud @0: `sine 180→100Hz/40ms D70` −8 dB (commitment).
- Rev 0.6 s wet 12%.
- Variant "sell": reverse order (bell first, coins scatter falling in pitch).

### Error / denied
- 150–300 ms, low-mid, unmistakable but not harsh. Never louder than confirm.
- Classic buzz: square or saw 180–250 Hz, two pulses of 70–90 ms with a 40 ms gap, LP 1.5k Q0.7, or the 2nd pulse −1 st.
- Cozy "bonk": wood knock f0 300 Hz + `triangle 330→250Hz/120ms D150`, second hit −3 st @+90.
- Mistakes: high-frequency beeps (feel like a bug); harsh buzz in a cozy game; sounding like "back".

### Attack windup
- Rising inhale, 150–350 ms, ending at or 0–20 ms before the swing/launch.
- L1: triangle or saw `200→500Hz exp`, LP 2k, amp `A 80% of duration` then cut.
- L2: pink noise BP Q2, `500→2.5k`, same env, −4 dB.
- Cartoon: slide-whistle `sine 400→1200Hz/250ms`. Vibrato via a multi-point pitch env zigzag of ±30 c at about 6 Hz.
- Heavier: down an octave + `uni 3 ±15c`. Faster game speed: compress to 120 ms.
- Mistake: windup louder than the hit (steals the payoff).

### Whoosh / swing
- Fast melee 100–250 ms; peak at 60–70% of duration, aligned to contact.
- L1: pink noise BP Q2, center `500→2.5k→900Hz`, `A140 D80` (for 220 ms).
- L2 (cartoon "vwip"): `sine 300→900Hz` −12 dB.
- Light: higher center (1k→5k), 80–120 ms. Heavy: lower center (200→900), 300 ms, + low sine 80→60 Hz −10 dB. Doppler: pitch/center up while approaching, down after the peak.
- Mistakes: too slow (drags behind the animation); too short (reads as a click); white noise unfiltered.

### Melee impact — light
- 80–150 ms, centroid 1–2.5 kHz, peak in the first 5 ms.
- L1 transient: white noise HP 2k `A0 D5`.
- L2 body: `triangle 260→140Hz/40ms A0.5 D80`.
- L3 (cozy) pitched pap: modal wood bar f0 500 Hz or `FM 1:1.4 I 4→0/60ms` at 400 Hz, −6 dB.
- hitHurt (sfxr): square/saw/noise 145–2260 Hz, pitch dropping fast, sustain ≤23 ms, decay 23–200 ms.

### Melee impact — heavy
- 250–400 ms, centroid 400–1200 Hz.
- L1 transient: white noise HP 1.5k `A0 D8`.
- L2 body: `sine 180→70Hz/60ms D150`, drive tanh 0.4.
- L3 sub: `sine 110→45Hz/150ms D250`, HP 25.
- L4 crunch: pink noise LP `4k→600/120ms` `D150` −6 dB.
- Bus comp 4:1 att 8 ms; rev 0.5 s wet 10% on L2 and L4 only (keep the sub dry).
- Layer separation: give each layer its own band. Two layers both centered near 200 Hz cancel and muddy.
- Variants: crit = + bright metal clink @0 −8 dB + 30 ms longer tail; squishy = BP 800 Hz noise `D60` + pitch-up blip.

### Block / shield clink
- Metal: 808 clink (BP 3.4k/7.1k, D 120 ms), or modal Chalandi/aluminum at f0 1.4 kHz with decays 400/250/120 ms, + dull thud `sine 160→100Hz D50` −6 dB (force absorbed).
- Wood shield: wood plate f0 350 Hz, decays 70/40/25 ms, + noise BP 1.5k `D10`.
- Bubble/magic shield: glass modes f0 1.2 kHz + `FM 1:7 I1.5→0`, rev 1 s wet 20%.
- "Armor gained" (non-hit): clink + rising +7 st ping @+60.
- Mistake: too much ring; it fights the next hit. Keep ≤400 ms.

### Damage number pop
- 40–90 ms, plays 30–60 ms after the impact so it doesn't mask it; −8 to −10 dB relative to the hit.
- `sine 500→1100Hz/15ms` then hold, `A0.5 D45`; or bubble pop `sine 1.2k→2.4k/8ms D25`.
- Scale with value: big damage → lower start (−5 st), longer (+30 ms), + tick noise. Crit: + two-note ping.
- Mistake: same loudness as the impact (cluttered).

### Creature faint / death (cartoon, not gory)
- 350–700 ms falling contour + soft poof.
- L1: `triangle 700→420→150Hz/80/450ms`, amp `A5 D450`. Wobble = zigzag ±40 c at 7 Hz in the pitch env.
- L2 @+250 poof: pink noise LP `2k→400/200ms` `A10 D220` −6 dB.
- L3 option: descending minor tones 0, −3, −7 (e.g. 659, 554, 440 Hz) KS plucks 90 ms apart.
- Rev 0.7 s wet 15%.
- Cuter: higher start (1.2 kHz) + "pop" end. Heavier boss: body 300→60 Hz + sub thump at the end.
- Mistake: harsh noise or distortion (reads as violent); >1 s (blocks the next event).

### Projectile / orb throw and land
- Throw: 80–150 ms whoosh (higher, light) + `sine 300→900Hz/60ms` "thwip" −8 dB.
- In-flight: usually none. Optional faint `sine 1.2k` tremolo −20 dB.
- Land, damage: light impact recipe, pitch falling, noise-heavy, centroid ≤2 kHz.
- Land, buff: no noise transient. Glass modal f0 1.5–2.5 kHz + 2-note rise (+4, +7), rev 1 s wet 20%.
- The two must contrast on 3 axes: pitch direction (fall vs rise), noisiness (noise vs pure), and register (low-mid vs high).

### Buff / heal / power-up sparkle
- Buff sparkle: 4–6 notes rising on a major pentatonic, 35–60 ms apart, 1–4 kHz.
  - Notes: `sine + FM 1:3.5 I1→0/150ms`, `D250–400`, `uni 3 ±8c sp0.6`.
  - Shimmer: white noise HP 6k swell `A150 D250` −14 dB.
  - Rev 1.5 s pre20 damp0.4 wet 25%.
- Heal: warmer and slower. Triangle notes C5–C6, 70–90 ms apart, + pad swell (saw `uni 5 ±12c` LP 1.5k, `A150 D400`) −10 dB.
- Power-up: rising sweep under the arpeggio (saw 300→1200 Hz/300 ms, LP 3k).
  - sfxr powerUp: square/saw 145–885 Hz, rising slide, optional repeat every 20–165 ms (a staircase), decay 23–570 ms.
- More magical: + glass modes, longer reverb (2 s), predelay 30 ms. Cuter: an octave up, fewer notes.
- Mistakes: everything above 6 kHz (thin, fatiguing); reverb wet >35% (wash); minor notes.

### Debuff
- 300–600 ms; descending, sour, closing filter.
- L1: saw `uni 3 ±30c`, pitch `0→−3st/400ms`, LP `3k→600/400ms` Q2.
- L2: diminished arpeggio 0, −3, −6 at 80 ms, triangle `D150`, −6 dB.
- Sickly/poison: ring mod at a non-integer ratio (×0.53) on L1. Weaken: "wah-wah" via LP env zigzag 1.5k↔500 at 5 Hz.
- Mistakes: harsh enough to read as damage; same contour as buff, only lower.

### Level-up / merge
- Level-up (SAP-style, 0.8–1.4 s):
  - riser 250 ms (noise LP 500→6k + saw +12 st)
  - → arpeggio 0, 4, 7, 12 @50–60 ms (pluck or bell)
  - → held major chord (root, 3rd, 5th, octave) `D600`
  - → impact thump `sine 140→60Hz/80ms` at the chord onset
  - → sparkle tail.
- Merge (combining 2 units): two triangle tones start ±50 c apart and glide to unison over 300 ms (beating slows, so they "lock"), then a pop at the lock (`sine 600→1400Hz/10ms D40`), then a +7 st chime.
- Bigger tier: + an octave on top, longer tail, sub. Mistake: >1.5 s blocks shop flow; keep the stinger to ~1 s at fast game speed.

### Explosion / burst
- Cozy burst = "poof/pomf", not war. 0.5–1.2 s.
- L1 transient: white noise full-band `A0 D10`.
- L2 body: pink/brown noise LP `5k→300Hz/400ms exp` `A2 D500`, drive tanh 0.3.
- L3 sub: `sine 90→35Hz/300ms D400`.
- L4 crackle: 10–20 random clicks over 300 ms, HP 2k, −12 dB.
- Rev 1.2 s wet 15%.
- sfxr explosion: noise, sustain 23–360 ms, decay ≤570 ms, punch 0.2–0.8, optional downward slide.
- Variants: magic burst = add a bell chord + pitch up; small pop = 150 ms version with no sub; "ka-boom" = a quiet first crack, then the louder boom @+60 ms.
- Mistakes: unfiltered white noise tail (static), a sub with no 150–300 Hz harmonic (vanishes on laptops), an overlong tail.

### Ground slam
- 300–600 ms; weight first, debris after.
- L0 (optional) pre-whoosh descending @−150.
- L1: `sine 100→40Hz/200ms D350`.
- L2: `sine 160→60Hz/120ms D200` drive tanh 0.5.
- L3 dirt: pink noise LP 1.2k `A2 D250`.
- L4 debris @+60: 5–8 wood-knock grains (modal wood f0 300–700 Hz, D20) spread over 200 ms.
- Comp 4:1; rev 0.8 s damp 0.7 wet 12%.
- Mistake: everything in the sub; the "feel" lives at 60–250 Hz plus the transient.

### Victory jingle
- 1.5–3 s, 140–180 BPM, major, bright pluck/bell/square-lead timbre.
- Figure: 0, 4, 7, 12 (16th notes) → held I chord (or IV → V → I).
- Melody: KS or square with LP 4k `D200`. Bass: triangle root `D300`. Last note: sustain 600–900 ms + chime + cymbal-ish noise HP 6k `D800` −14 dB.
- Rev 1.2 s wet 18%.
- Mistakes: ending on an unresolved note; >3 s (delays the next run step).

### Defeat jingle
- 1.5–2.5 s, 70–100 BPM, gentle (cozy), not punishing.
- Descending minor line (e.g. 0, −2, −3, −7) slowing down (each note +15% longer), lower register, LP 2k, triangle/soft square.
- End on a minor chord, or a "sad trombone" chromatic 0, −1, −2, −3 with the last note's wobble ±40 c at 5 Hz.
- Mistake: harsh or loud (players hear it a lot).

### Round start / ready
- Ready: two pips (sine 660 Hz, 80 ms, 300 ms apart) → go (1320 Hz, 200 ms). Or a 300–500 ms riser into a bright hit.
- Fight: snare-ish noise burst + tom (membrane modes f0 140 Hz) + major 5th stab, total ≤600 ms.
- Shop/round open: short rising pluck 0, 7, 12 + soft bell.

## Analysis checklist before showing a candidate
- Onset ≤5 ms from file start (trim leading silence); no clicks at onset or end on the spectrogram.
- Duration and attack time match the category budget above. The tail reaches −60 dB before the file ends, with no truncation.
- Centroid sits in the target range. Sub-band energy appears only on cues meant to be heavy, and those also carry 120–300 Hz energy.
- True peak ≤ −1 dBTP. Check the loudness ladder against sibling cues, not in isolation.
- Make 3 candidates that differ on one clear axis (e.g. synthetic / sampled / hybrid). In comments, map the rating back to that axis.

## Sources
- https://raw.githubusercontent.com/chr15m/jsfxr/master/sfxr.js (sfxr preset ranges and unit formulas)
- https://raw.githubusercontent.com/KilledByAPixel/ZzFX/master/ZzFX.js
- https://csound.com/manual/misc/modalfreq/ (modal frequency ratio table)
- https://en.wikipedia.org/wiki/Strike_tone (bell partials)
- https://en.wikipedia.org/wiki/Vibrations_of_a_circular_membrane
- https://ccrma.stanford.edu/software/clm/compmus/clm-tutorials/fm2.html (FM drum and bell)
- https://courses.cs.washington.edu/courses/cse466/10wi/pdfs/FMSynthesisExamples.pdf (Chowning bell, wood drum, brass; via search excerpt)
- https://ccrma.stanford.edu/CCRMA/Courses/SoundSynthesis/Lectures/5/5.html
- https://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1453.pdf (TR-808 cymbal oscillators and BPs)
- https://www.soundonsound.com/techniques/synthesizing-bells
- https://www.soundonsound.com/techniques/synthesizing-realistic-cymbals
- https://www.soundonsound.com/techniques/practical-snare-drum-synthesis
- https://beatkitchen.io/guides/electronic-music/02-drum-design/
- https://community.vcvrack.com/t/kick-drums-basslines-from-sine-oscillators-lfos-and-envelopes/10548
- https://violetrecording.com/how-to-make-impact-sounds/
- https://violetrecording.com/how-to-design-ui-sounds/
- https://violetrecording.com/how-to-make-whoosh-sounds/
- https://www.gamedeveloper.com/audio/the-power-of-pitch-shifting
- https://designingsound.org/2013/02/20/different-loudness-ranges-for-console-and-mobile-games
- https://audiomediainternational.com/mobile-loudness-an-adaptive-approach/ (ASWG-R001 −24 LUFS)
- https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips (Kenney Casino Audio)
- https://wokwi.com/projects/453849283066409985 (Mario coin B5→E6 timing)
- https://musicradar.com/how-to/synth-sweep-fx
- https://vi-control.net/community/threads/riser-uplifter-effects.172558/
- https://forum.ableton.com/viewtopic.php?p=514254 (whoosh filter choice)
