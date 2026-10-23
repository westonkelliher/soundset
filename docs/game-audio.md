# Game SFX design principles

Reference for SFX-designing agents. Target: browser deckbuilder roguelike, SAP-style auto-battles + Dominion-style
deck cycling, cartoon animals, **cozy but punchy**. Numbers marked *(rule of thumb)* are practitioner conventions, not
standards; tune against human ratings.

## 1. The four jobs of a sound

Every cue must name its primary job. A cue doing none of these should not exist.

| Job | Question it answers | Example (this game) | Design consequence |
|---|---|---|---|
| Feedback | "Did my input register?" | card hover, button press, card dropped on slot | instant (<50 ms), tiny, quiet |
| Information | "What just happened / changed?" | unit fainted, buff applied, shield broke, not enough gold | distinct timbre per meaning; must be learnable eyes-closed |
| Reward | "Was that good? How good?" | level-up, combo, win round, rare card | scales with magnitude; consonant, rising, brighter |
| Rhythm / pacing | "Where are we in the sequence?" | attack-trade beats, draw→play→resolve, turn start | regular spacing; sound sells tempo of auto-battle |

- Hades (Korb): SFX "have a job to do that the other aspects of the audio don't": player feedback and *situational awareness*; plus a "Pavlovian delight" layer on top.
- Juice principle (Jonasson & Purho): the game should respond audibly/visibly to *everything* the player does — but juice must not misinform (a big sound implies a big event).
- Feedback is multi-channel: sound is one of ~5 layers (anim, numbers, screen FX, particles, sound). "The number one mistake is picking only one" (Hearthstone feedback analysis). Sound should agree with, not duplicate, the visual magnitude.
- Material Design: sound should be *informative*, *reassuring*, and **absent for frequently performed actions** unless it adds information. Reserve "hero sounds" for rare pivotal moments and use them consistently.

## 2. Information hierarchy & priority

Rank every cue. Higher tiers cut through; lower tiers recede and may be dropped.

| Tier | Cut-through | Examples | Treatment |
|---|---|---|---|
| P0 Hero | always heard, may duck others | round won/lost, boss appears, run over, legendary event | longest (0.6–2 s), widest band incl. low end, rare, ducks music 3–6 dB |
| P1 Critical info | always heard | unit faint/death, big ability trigger, out-of-gold/error, level up | 150–500 ms, unique timbre, never stolen |
| P2 Core action | heard, may be thinned | attack impact, damage taken, buff/debuff, card play | 80–300 ms, per-cue caps, variants |
| P3 Ambient feedback | recedes, droppable | hover, card slide, coin tick, shuffle riffle, stat tick-up | 20–120 ms, −12 to −24 dB relative to P2, high-passed, low information |

- Hearthstone team: "There is a case of having too much sound in the game" — decide what is heard *when*, or not at all; the game's pace demands intelligibility while still feeling epic.
- Players notice sounds that are too loud far more than missing ones; mix beats coverage (A Sound Effect, 37 tips).
- Separate by **frequency band** so tiers don't mask: low-mid body (200–500 Hz) for weighty confirms/impacts, 1–5 kHz for information, sparing >5 kHz sparkle for rewards. Don't put everything's transient at 2–4 kHz.
- Separate by **timbre family**: e.g. wood/paper = cards & UI, soft rubber/squeak/pluck = animals, bell/chime = reward, low dull thud = negative.
- Lower-tier sounds must yield in time too: if a P1 lands within ~80 ms of a P3, drop the P3.

## 3. Cohesive sonic palette ("style bible")

- **Pick a neighbourhood first.** Regamey (Celeste): choose "sweet or dissonant", "cozy or jarring" and judge every sound against it; align the team with references ("is this Nightmare on Elm Street or Scooby Doo?"). For this game: *cozy toy-box with snap*. Reference neighbourhood: Animal Crossing UI, Balatro chips, Peggle hits, Hearthstone tavern.
- **Beautiful corner** (Kilborn): fully finish 3–5 cues (e.g. card play, attack hit, faint, coin, level up), approve them, then derive everything else from them.
- **Small core palette**: ~10–20 core sound "atoms", each with variants, recombined per cue. Families share a core identity and vary slightly.
- **Shared tuning**: all pitched cues tuned to one key/scale (pick the music's key; if unknown use C major pentatonic — C D E G A — which can't clash with itself). Atonal noise layers are exempt.
- **Shared space**: one short room/plate reverb for the whole set (or none). Mixed reverbs = sounds from different games. Keep tails short (<300 ms) for frequent cues; bake none, or bake identically.
- **Shared material vocabulary**: define ≤6 materials and what they mean (see table). Never use a material outside its meaning.
- **Shared envelope grammar**: e.g. all positive cues = fast attack + ringing tail; all negative = fast attack + choked/damped tail; all UI = <80 ms, no tail.
- Synthesis cohesion: sounds built from "only a few related techniques" yield cohesive results across hundreds of files (Signal Frontiers library, A Sound Effect). Reuse the same oscillator types, filter shapes and noise colours across the set.

| Material | Meaning | Synth recipe sketch |
|---|---|---|
| Paper/card | deck & hand actions | filtered noise burst, bandpass 2–6 kHz, 20–150 ms, slight pitch sweep |
| Soft wood/felt | placement, board, UI confirm | short sine/triangle "tok" 300–900 Hz, 5–40 ms decay + noise click |
| Rubber/squeak/boing | animal bodies, bumps, cute impacts | sine/triangle with fast pitch envelope (up-bend or wobble), 80–250 ms |
| Bell/glass/chime | reward, gold, level, buff | additive partials or FM bell, tuned to key, 200–800 ms tail |
| Coin/metal tick | currency | 2 high partials, 30–80 ms, metallic FM |
| Dull thud/buzz-free low | negative, error, faint | lowpassed body 80–250 Hz + harmonics, short, downward pitch |

## 4. Cartoon vs realistic

- Decide exaggeration level up front: "low key emphasises realism, high key goes silly and melodic" (Krotos). This game: medium-high key — melodic, pitched, elastic, but not slapstick on every event.
- Cartoons don't obey physics, so sounds needn't either (Mangini). Sound tells the emotional truth, not the physical one. Hearthstone calls this "subjective sound design": minion sounds are driven by card art/personality, not animation states.
- Cartoon hits = clear **pitched attack** (click/twang/pop) over a short musical tone. Elasticity comes from pitch bends and time-stretch.
- Character via signature timbre (Aadahl, Kung Fu Panda: Mantis = wooden ratchets, Po = gut-bucket boings that escalate as he improves). Give each animal family a timbral signature; give contrast between heavy and light units (brute vs rubbery).
- Mouth/vocal sources ("suction pops, juicy lip smacks") read as alive and cute — in synthesis, approximate with formant-filtered pulses and fast pitch blips.
- "Interesting without being an assault" (Aadahl). Kung Fu Panda's first "big and bold" mix was pulled back after test screening — cozy games need lower violence/decibel ceilings.
- Synthesis implication: cartoon reads come from **pitch movement** (bends, chirps, vibrato) and **clean tonal cores**; realism comes from noise complexity. Lean tonal; use noise only for texture/transient.

## 5. Reward & escalation

- Magnitude must be audible: bigger event → longer, wider band, more layers, higher pitch, more consonance. Never make a small reward sound like a big one.
- **Pitch-stepping chains**: each consecutive event in a chain steps up one scale degree.
  - Peggle 2: peg hits are an "ascending diatonic scale" that changes to match the harmony of the current music phrase, even mid-shot; the winning-peg drumroll is tuned to the music.
  - Balatro: each scored card plays a rising note; joker "donks" speed up and rise in pitch as buffs/retriggers stack (Engadget); a separate "ka-ching" layer for mult; threshold crossing = bass drop + flash.
  - Inscryption: the damage scale's clinks escalate in pitch and sound more strained as you near death — escalation can signal danger, not only reward.
- Chain rules *(rule of thumb)*: step on scale degrees, not semitones (chromatic climbs sound tense); reset after ~0.5–1.5 s gap or end of sequence; cap at 1–2 octaves then hold the top note and add a layer (sparkle/octave) instead of climbing forever; final step of a completed chain gets a resolution chord or tonic.
- Consecutive pickups (coins, stat ticks): +1 scale degree per pickup within a ~300–600 ms window; otherwise random pick from 2–3 in-key notes.
- Use low end (sub/bass drops) only for big moments — Peggle reserved LFE for Fever/Power activation. Scarcity is what makes it hit.
- Tune reward SFX to the music key; Peggle's "Free Ball" choir always harmonizes with the current phrase. Unintended clashes with the score read as errors (A Sound Effect, sci-fi UI).

### Intervals and contour

| Interval / gesture | Reads as | Use for |
|---|---|---|
| Rising contour (any consonant) | gain, success, "up" | buffs, level up, gold gained |
| Falling contour | loss, ending, "down" | damage taken, cancel, discard, faint |
| Unison/octave | neutral, emphatic, stable | confirm, generic tick, octave sparkle on big wins |
| Perfect 4th/5th | strong, open, heroic-neutral | confirm, ability trigger, turn start (Mario coin: B→E, a 4th up) |
| Major 3rd / major triad arpeggio | happy, bright | rewards, level up, victory |
| Major 2nd | light motion, neutral | hover, small step, "next" |
| Minor 3rd (falling) | sad, gentle negative | faint, defeat (cozy-negative) |
| Minor 2nd / tritone | tension, wrong, alarm | error, danger, boss warning — use sparingly |

- Positive = consonant + rising + bright + ringing tail; negative = dull + falling + damped. In a cozy game keep negatives **soft** (falling minor 3rd + dull thud), not harsh buzzers. Errors should be "dissonant enough to grab attention without becoming irritating, especially when heard often" (sfxengine).
- Confirm/cancel pair *(convention)*: confirm = short two-note up (e.g. 5th or 4th), cancel = same timbre two-note down. Same family, opposite direction.

## 6. Repetition fatigue & variation

| Frequency of play | Variants | Pitch random | Volume random | Notes |
|---|---|---|---|---|
| Rare (<1/min) | 1 | 0 | 0 | consistency is the point; hero sounds must be identical |
| Occasional | 2–3 | ±2–3% | ±1 dB | |
| Frequent (several/turn) | 3–5 | ±3–6% | ±1.5–2 dB | avoid immediate repeats |
| Very frequent (bursts, many/sec) | 4–8 or param-randomized synth | ±5–8% or scale-snapped | ±2–3 dB | also cap instances, see §9 |

- Practitioner consensus: ~3 variants is enough for most cues; more for footstep-like high-frequency cues (gamedev.net); 3–5 rotations for UI actions. Celeste gives nearly every surface its own suite of footstep/grab variants.
- **Don't vary everything.** Iconic, information-bearing cues (coin, error, level-up) should be stable — constantly changing them distracts and breaks learnability.
- Pitch randomization on **tonal** cues knocks them out of key and loses highs; randomize the noise/transient layer freely, but snap tonal layers to scale degrees or keep them fixed.
- Selection: shuffle-bag / "avoid last N" (N = variants−1), never pure random.
- Per-play synth params beat stored variants: jitter filter cutoff ±10–20%, decay ±10%, transient noise seed, detune ±3–8 cents.
- Repetition isn't only identical samples: *the same loudness* every time is also fatiguing. Compress/peak-match so a cue fired hundreds of times never spikes.
- Players who ask for a mute toggle often just needed one sound much quieter (A Sound Effect, 37 tips).

### Frequent sounds: short, soft, low-information

- Duration ∝ 1 / frequency of play. Microinteraction sounds: 100–300 ms max, many should be 20–80 ms, so they never delay the next action.
- Quieter than gameplay: P3 cues sit 12–24 dB under P2.
- Low information: no melody, no strong pitch, little low end, gentle transient; high-pass ~200–400 Hz; soft lowpass ~8 kHz to avoid ear fatigue.
- Material Design: frequently performed actions often need **no** sound. Before adding a hover sound, ask whether it informs.

## 7. Timing & sync with animation

- Structure big actions as **anticipation → impact → aftermath** (Hearthstone feedback analysis): windup sound builds expectation, impact sound lands on the contact frame, aftermath tail gives time to process. Hearthstone "doesn't shy away from going 300%" on the impact beat.
- Spells/abilities have two key beats — **cast** and **hit** — put the emotional design there (Hearthstone sound team).
- Impact on the frame. Audio *early* is much more noticeable than audio late: broadcast detection thresholds ~+45 ms early / −125 ms late (ITU-R BT.1359); ATSC tightens to ≤15 ms early / ≤45 ms late. Target: impact sound within 0–30 ms after the contact frame.
- Cartoon exception: a hit can land a frame early/late *deliberately* for comedy (Krotos) — only on purpose.
- Windup/anticipation layers: 80–300 ms rising whoosh/pitch-up before the hit; design the windup so its peak *is* the hit (sound file starts early; schedule start = impactTime − windupLength).
- Input feedback latency budget *(rule of thumb)*: click/hover → sound ≤ 50 ms total feels instant; ≤ 100 ms acceptable; > 150 ms feels laggy. Browser output latency alone is a few ms to ~50 ms, so author SFX with **zero leading silence** and attack ≤ 5 ms.
- Schedule on the audio clock, not timers: `setTimeout` jitters by tens of ms; use `audioContext.currentTime` with ~25 ms scheduler tick / ~100 ms lookahead for sequenced events (web.dev). Draw with rAF against the audio clock.
- Don't lock input behind sound/animation: Hearthstone returns control before long draw/fatigue animations finish. Sounds must survive being interrupted (clean fade-out ≥5 ms; no clicks).
- Rhythm: Hearthstone's fixed-timing turn moments give it a "more rhythmic, musical feel." For auto-battles, space sequential attacks on a steady grid (e.g. 250–450 ms per beat at 1×) so sound becomes the battle's pulse; at 2×/4× speed, shorten/thin sounds rather than just overlapping them.

## 8. Voice limiting, stealing, ducking

- **Global voice cap** *(rule of thumb)*: 16–32 simultaneous voices in a browser game; more costs CPU and mud.
- **Per-cue cap**: 2–4 instances of the same cue; P3 cues cap at 1–2.
- **Steal policy**: lowest priority first, then oldest/quietest within that priority; never steal P0/P1. Reserve voices for critical audio; over-zealous culling can mute subtle cues players rely on (bugnet).
- **Ducking**: P0 stingers duck music 3–6 dB (attack 10–50 ms, release 200–500 ms); VO ducks music ~6–9 dB. Hades does it musically — combat state lives in the music stems (drums/bass in combat, drums drop out at combat end), so SFX don't need to announce it.
- Peggle: music and ambience follow complementary dynamic arcs so each gets its moment; mixing states coordinate them.

## 9. Stacking many simultaneous hits (auto-battler)

The danger: 5 units trigger "start of battle" abilities on the same frame → wall of noise.

- **Per-cue cooldown**: same cue can't restart within 30–60 ms; within cooldown, bump the existing instance's gain instead of retriggering.
- **Collapse N→1**: when ≥3 of the same cue fire in one frame, play one "group" variant (thicker, longer) rather than N copies. Loudness of N identical sounds summed ≈ +3 dB per doubling (uncorrelated) up to +6 dB (correlated/phasey) — compensate.
- **Time stagger**: spread simultaneous triggers 30–80 ms apart in board order (left→right / front→back), turning a smear into a flam/roll. Matches SAP-style sequential resolution.
- **Pitch stagger**: staggered triggers step up a scale (each +1 degree) → reads as a pleasant arpeggio, not a pile-up. This is the Peggle/Balatro chain trick applied to simultaneity.
- **Gain normalization per burst**: total burst loudness ≈ one P2 hit + 3–4 dB, regardless of N.
- **Priority within burst**: the most important event (faint, kill, big number) plays full; the rest play as thinned "ghost" versions (−6 to −10 dB, high-passed).
- Dry, peak-matched short sounds stack better than reverb-heavy ones; tails accumulate into mud.

## 10. UI sound principles

- Subtle, short, consistent, distinguishable. Give each distinct UI function its own sound (A Sound Effect); reuse identical "auditory icons" for the same function everywhere.
- Confirm / cancel / error must be distinguishable eyes-closed, yet from one family. Eyes-closed test: can a player complete basic tasks from audio alone?
- Error ≠ punishment: in a cozy game, "can't afford" = soft dull thud + small falling interval, not a buzzer. Dissonance level ∝ seriousness.
- Separate buses: navigation, confirm, warning/error, so each can be balanced.
- Hover: optional; if present ≤ 40 ms, very quiet, no pitch identity (or tiny pitch variation by item).
- Hero UI moments (run start, unlocks, rare card reveal) get a fuller sound — sparingly (Material "hero sounds").
- Match pitch direction to visual motion (opening/rising = up; closing/falling = down) (A Sound Effect, sci-fi UI).
- Design from function: "how the UI actually works, rather than just making a cool sound to match" (Ivanov).

## 11. Card-game specifics

| Action | Frequency | Recipe *(observed conventions)* |
|---|---|---|
| Hover / lift card | very high | near-silent paper tick or nothing; ≤ 40 ms, −24 dB |
| Draw (single) | high | short paper slide 80–150 ms, slight upward sweep |
| Draw (hand of 5) | per turn | staggered 50–90 ms, ascending pitch per card (Balatro-style), one shared reverb |
| Shuffle / reshuffle discard into deck | per cycle | one riffle 300–700 ms per shuffle, not per card; Dominion-style cycling = this happens often, so keep it soft and distinctive (it marks a deck-cycle *rhythm*) |
| Play card | high | whoosh (on lift/throw) + felt/wood "thunk" on landing frame; magnitude scales with card cost/rarity |
| Discard / trash | medium | softer, downward, papery; trash/remove = slightly darker or "poof" |
| Buy / gain card | medium | coin out + card in; positive interval |
| Not enough resources | medium | soft dull thud, falling minor interval |
| Card reveal / rare | rare | build + chime; rarity tiers get distinct sounds (common/rare/legendary) |
| End turn / start battle | per turn | clear rhythmic marker, fixed (no variation) |

- Hearthstone: board/cards treated as **physical objects** (adapted from physical CCGs); minion sounds express card personality; spells emphasize cast & hit; legendary cards get distinct stingers; early sounds were remastered WoW cues — reuse of a known vocabulary builds instant recognition.
- Balatro: chip, mult, and shuffle sounds work as a three-part set whose ordering creates variety; the Blind chip "breaking" on round win is the closer; music shifts calm (shop) → intense (blind). Called "an A-1 example of economical sound design": few sounds, each doing a clear job, escalating with the math.
- Slay the Spire (observed): crunchy, crisp sound on every card play, hit, block, relic trigger; block/defence and attack use contrasting materials (metal clank vs slash) so outcome is readable by ear.

## 12. Browser constraints

- **Autoplay unlock**: audible playback is blocked until a user gesture (click, tap, keydown; not mousemove/scroll). Create/`resume()` the `AudioContext` inside the first gesture handler; check `ctx.state`, handle `statechange` (tab backgrounding re-suspends). Design so the first sound heard is a response to a click.
- **Use Web Audio buffers/synth, not `<audio>` elements**, for SFX: sample-accurate scheduling, polyphony, no per-play decode. Pre-decode everything at load.
- **Latency**: `new AudioContext({latencyHint: "interactive"})`; output latency ~few ms–50 ms depending on device; Bluetooth headphones add 100–300 ms (nothing to do but keep sounds non-critical for timing). Trim leading silence to 0.
- **Formats** (only matters for rendered assets): Opus (WebM/Ogg) best quality/size, but Safari support is partial/version-dependent; Vorbis/Ogg unsupported on Safari. AAC in MP4/M4A plays everywhere → ship `.m4a` as baseline, `.webm` (Opus) as preferred. MP3 adds encoder padding (start gap) — bad for tight SFX/loops.
- **iOS**: the hardware silent switch can mute Web Audio; Safari exposes `navigator.audioSession` on newer versions. Treat iOS as "possibly silent" — sound never carries information that visuals don't also show.
- **Laptop/phone speakers**: perceived response ~200–400 Hz up; a pure sine below ~200 Hz vanishes. Give low elements harmonics (saturation, square/saw, 2nd/3rd harmonic layers, then lowpass ~300 Hz on the sub layer) so the ear infers the fundamental. Put each cue's *identity* in 300 Hz–5 kHz; low end is a bonus for headphones.
- Avoid harsh 2–5 kHz resonances at volume — tiny speakers peak there and it's the fatigue zone.
- Test the mix with all game audio playing, on low-end playback (sfxengine).
- **Loudness**: peak-normalize all cues to a ceiling (e.g. −1 dBFS) and set relative levels by tier, not by file; a master limiter guards bursts.

## 13. Lessons from specific games

- **Balatro** — Rising pitch per scored card turns arithmetic into melody; accelerating, pitch-climbing retriggers make stacking feel exponential; distinct layer per stat (chips vs mult "ka-ching"); a bass drop reserved for crossing the threshold; few sounds, each economical. Sound mirrors the math.
- **Hearthstone** — Subjective sound design (emotion over physics); cast/hit beats; anticipation→300% impact→aftermath; rhythmic fixed-timing turns; don't over-sound — decide what's heard when; give control back before long animations end; distinctive whimsical tavern identity built from a coherent team "in sync."
- **Peggle / Peggle 2** — Ascending diatonic peg hits harmonized with the current music phrase; reward choir always in key; LFE reserved for Fever; music/ambience in complementary arcs. The definitive chain-escalation model.
- **Peglin** — A cautionary note: a review calls its audio "bafflingly quiet" with peg impacts lacking weight. Pachinko loops live or die on hit satisfaction; give every repeated impact a transient + tonal body.
- **Super Auto Pets** — Minimalist music, calm in shop and energizing in battle; cute, low-stress tone that stays upbeat even after a loss. Lesson: shop vs battle should differ in energy; defeat stays gentle.
- **Slay the Spire** — Crisp, crunchy response on every card, hit, block, relic; composer also did sound design (Clark Aboud) → music and SFX share a palette.
- **Hades** — SFX = feedback + situational awareness + "Pavlovian delight"; music stems announce combat state (drums out at combat end); designed for readability even when streamed; content built to survive hundreds of hours.
- **Celeste** — Pick an emotional neighbourhood and references; per-surface variant suites for the most frequent action; the "hero" moments (doors, payoffs) get the spotlight; aim to affect players "without them even realizing."
- **Inscryption** — Tactile tabletop objects; tension escalates by pitch (scale clinks strain as death nears). Escalation can mean danger.
- **Vampire Survivors** — The over-the-top treasure chest animation is matched to a catchy short sound; gem-collect chime is the most-heard sound in the game, so it's tiny, bright, and satisfying in bulk. Audio and visuals sit at the same (low) fidelity — match fidelity across senses.
- **Dicey Dungeons** — Clear concept ("'90s game show") drives a whole synth-made (Eurorack) SFX set; "audio overload" made playful; style concept > realism.
- **Nuclear Throne / Vlambeer** — Every shot = sound + camera kick + screenshake that decays fast; feel is built by stacking small synchronized responses on a single frame.

## 14. Sound brief template (one per cue)

```
cue:        unit_faint
purpose:    information (P1) — a unit has died; secondary: emotional beat
emotion:    gentle sadness, cozy not grim; slight comedy
material:   rubber/squeak body + soft "poof" noise; no metal
size:       matches unit size param (small=higher/shorter, big=lower/longer)
duration:   250–400 ms, tail ≤ 150 ms
pitch:      falling minor 3rd within key (e.g. G→E in C pentatonic); tonal core
frequency:  ~2–6× per battle; can coincide with hits
priority:   P1; never stolen; may drop simultaneous P3
variation:  3 variants; pitch fixed to scale; noise layer jitter ±10% cutoff
sync:       start on the frame the unit begins its fade; no lead-in silence
stacking:   if ≥2 in 60 ms → stagger 50 ms, step down one degree each
must-not:   sound like error/"can't afford"; harsh 2–5 kHz; sub below 80 Hz
references: Peggle peg-miss soft, Animal Crossing UI, SAP faint
```

Fields: **purpose** (job + tier), **emotion**, **material**, **size/weight**, **duration**, **pitch/interval + contour**,
**frequency of play**, **priority**, **variation**, **sync point**, **stacking rule**, **must-not** (confusables), **references**.
A cue without a frequency-of-play and confusables line is under-specified.

## 15. Quick checklist for a candidate patch

- [ ] Primary job stated; tier assigned; nothing louder/longer than its tier allows
- [ ] Attack ≤ 5 ms, no leading silence; impact aligns to event time
- [ ] Pitched layers in key; contour matches valence (up = good, down = bad)
- [ ] Shares material/envelope/reverb grammar with approved "beautiful corner" cues
- [ ] Readable on laptop speakers (identity in 300 Hz–5 kHz)
- [ ] Survives 50 repeats without annoyance (frequent cues: short, soft, low-info)
- [ ] Doesn't collide with its confusables (e.g. confirm vs buy vs level-up)
- [ ] Stack test: 5 simultaneous instances stay intelligible with stagger + cap

## Sources

- https://hearthstone.blizzard.com/en-us/blog/23964694 (Hearthstone sound team)
- https://jboger.substack.com/p/hearthstone (Hearthstone signs & feedback)
- https://www.gamedeveloper.com/design/video-10-pieces-of-i-hearthstone-i-design-wisdom
- https://blakecrosley.com/guides/design/balatro
- https://www.jacobson.news/blogs/the-speed-and-sound-of-balatro
- https://www.engadget.com/gaming/engadgets-balatro-of-the-year-2024-140021833.html
- https://www.audiogang.org/peggle2-sonic-joy/
- https://www.audiokinetic.com/en/blog/peggle-blast-peg-hits-and-the-music-system/
- https://www.scorpioofshadows.com/post/peglin-review
- https://ee.pocketgamer.com/articles/084151/super-auto-pets-review-chill-auto-chess-game-with-deep-strategic-gameplay/
- https://www.megacrit.com/press-kits/slay-the-spire/
- https://gameplay.co/hades-game-music-sound-design-darren-korb-supergiant-games/
- https://www.gamedeveloper.com/design/supergiant-s-fourth-outing-i-hades-i-introduces-a-more-mature-organized-dev-process
- https://www.nintendolife.com/features/the-secrets-of-sounds-and-the-joy-of-door-noises-an-interview-with-celestes-audio-designer
- https://mechanicsofmagic.com/2024/04/19/rwp-read-write-play-2024-inscryption-khaled-messai/
- https://www.androidpolice.com/vampire-survivors-developer-interview/
- https://www.gamedeveloper.com/disciplines/road-to-the-igf-cavanagh-houston-dobbe-s-i-dicey-dungeons-i-
- https://infovore.org/?p=5275 (Art of Screenshake breakdown)
- https://verbotengames.wordpress.com/2014/04/05/breaking-down-juice-it-or-lose-it/
- https://www.asoundeffect.com/game-audio-tips/
- https://www.asoundeffect.com/sci-fi-ui-sound-effects/
- https://sfxengine.com/blog/best-practices-for-game-ui-sounds
- https://m2.material.io/design/sound/about-sound.html
- https://designingsound.org/2010/03/16/erik-aadahl-special-animation-sound-design-exclusive-interview/
- https://krotos.studio/blog/cartoon-sound-effect
- https://99percentinvisible.org/episode/classic-cartoon-sound-effects/transcript/
- https://gamedev.net/forums/topic/711420-creating-variations-using-existing-commentary/5445917
- https://bugnet.io/blog/how-to-fix-important-sounds-being-dropped
- https://developer.valvesoftware.com/wiki/Soundmixer
- https://en.wikipedia.org/wiki/Audio-to-video_synchronization
- https://tvtechnology.com/opinions/atsc-recommends-av-sync-rules
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs
- https://web.dev/articles/audio-scheduling
- https://musictech.com/tutorials/subs-for-small-speakers/
- https://www.sonarworks.com/blog/learn/make-your-mix-sound-great-on-small-speakers
