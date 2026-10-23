# CLAUDE.md — soundset

Human-in-the-loop game SFX design. Agents write synth patches (JSON), and Weston hears 3 candidates per cue in a review page and either **selects** one (done) or gives 👍/👎 and comments (another round). Selected patches are **baked** into `.ogg` variants for the game.

## You cannot hear. Work like it.
Your ears are `soundset check` (numbers), `soundset look` (spectrogram + envelope PNG: **Read it**) and the docs. Before any audio design work, read:
1. `docs/patch-format.md`: the exact JSON (always; it is short).
2. `docs/recipes.md`: per-category synthesis recipes and building blocks.
3. `docs/mixing.md`: frequency map, dynamics, loudness, analyzer targets by archetype (§12) and the pre-review checklist (§13).
4. `docs/game-audio.md`: what each sound is *for*: priority, palette, variation, repetition, card-game specifics.
5. `docs/feedback.md`: how to turn 👍/👎 and comments into the next 3 (required for rounds ≥2).

Also read the project's `soundset.json` `palette` and each cue's `trigger` and `brief`. They are the style bible.

## Workflow (run inside a project dir, the one with `soundset.json`)
1. `soundset status`: what each cue needs (`needs-candidates` / `ready` = awaiting review / `selected`).
2. For each cue that needs candidates:
   - `soundset history <cue>` (all past candidates, votes, comments) and `notes/<cue>.md` (your hypothesis log).
   - Write exactly 3 patches: `patches/<cue>/r<N>A.json`, `r<N>B.json`, `r<N>C.json` (N = last round + 1).
     - Round 1: three clearly different **directions** (e.g. synthetic / sample-led / hybrid, or dark-heavy / bright-snappy / tonal).
     - Later rounds: follow docs/feedback.md (≈2 exploit the liked ones per comments + 1 explore; vary ≤2 axes each; never re-propose a rejected region; randomize which slot holds what).
     - `note`: one plain-words line Weston will read ("wood knock + soft felt thump, short"). Don't put jargon dumps or self-praise in it.
     - Use `{"rand":…}` only for small natural variation (it becomes the baked round-robin), not to explore.
   - Update `notes/<cue>.md`: per-axis beliefs, tabu regions, what each of A/B/C tests.
3. `soundset check`: fix every ✗ and ⚠ (unknown keys are typos; limiter >3 dB means a spiky transient; durations over the category max).
4. `soundset look <cue>`: Read the PNG. Compare each candidate to docs/mixing.md §12 targets, to each other (are they *audibly* different?), and to the reference (the old sound). Iterate before Weston hears anything.
5. `soundset review --title "<what>" --about "<why, for Weston coming back later>"`. Run it **in the background**: it blocks until Weston finalizes, then prints `SELECTED` / `ITERATE` / `UNTOUCHED` / `REOPENED` per cue and records it in `state.json`. Act on that output and don't re-ask in chat.
6. Repeat 2–5 until every cue is selected, then `soundset bake` → `<out>/*.ogg` + `manifest.json` + `soundset-player.js`. Then do a gain-only in-game mix pass: change category or cue `loudness` in `soundset.json` and bake again.

## Rules
- Never edit `state.json` or reviewed patch files: rounds are history. New ideas go in the next round.
- Loudness is normalized per cue, so don't chase level with `gain`. Balance layers, shape envelopes, and set the mix only in `soundset.json`.
- Frequent cues (clicks, deals, hits) must be short, soft-edged, and fine on the 200th repetition. Long tails smear in an auto-battler.
- Put the identity in 200 Hz–5 kHz (laptop speakers). Sub alone is inaudible there, so add harmonics (`drive`) or a body layer.
- Keep every tonal element in the project's key/scale (`palette`), so stacked sounds don't clash.
- Samples: `soundset lib search <words>` (Kenney CC0 packs; `soundset lib fetch` if `library/` is empty). Pitch, trim and layer them, and pair them with synthesis for character.
- If several cues need work, you may give each a subagent. Give each one this file, the docs, the cue, and its history.

## Code map (for changing the tool itself)
- `web/engine/`: shared browser engine: `render.js` (patch → OfflineAudioContext → normalize/limit/trim), `gen.js` (noise, Karplus-Strong, modal, reverb IR), `env.js`, `resolve.js` (rand/pick per seed), `analysis.js` (BS.1770 loudness, metrics, FFT), `wav.js`, `browser.js` (sample loading).
- `web/review/`: the review page (vanilla JS). `web/headless/` + `src/headless.js`: the same engine in headless Chrome for check/look/render/bake. `web/sheet/draw.js`: waveform + spectrogram drawing.
- `src/`: `cli.js`, `project.js` (config/rounds/state), `review.js` (session, draft, report), `bake.js`, `library.js`, `server.js`.
- `player/soundset-player.js`: the in-game player (copied into the game by bake).
- Colors: `web/theme.css` only. Test: `examples/demo/` is a 2-cue project (`soundset check` / `review` there).
