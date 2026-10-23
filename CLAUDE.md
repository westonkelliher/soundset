# CLAUDE.md — soundset

Human-in-the-loop game SFX design. You write synth patches (JSON) and check them by numbers and pictures. The human (usually Weston) hears 3 loudness-matched candidates per cue on a review page and either **Selects** one (done) or gives 👍/👎 and comments (another round). Selected patches are **baked** to `.ogg` files plus an in-game player.

## Who does what
- **Human**: confirms the cue list and taste once, then only listens and rates (a round takes them 5–20 min). Never ask them to edit JSON, read patches or run commands.
- **You**: everything else: setup, candidates, checks, launching review, reading feedback, baking, wiring sounds into the game.
- Talk to the human in 1–2 lines per step: what's ready, what they do, what you'll do next. No metrics, no patch details.

## You cannot hear. Work like it.
Your ears are `soundset check` (numbers), `soundset look <cue>` (spectrogram + envelope PNG: **Read it**) and the docs. Before designing, read:
1. `docs/patch-format.md`: the exact JSON (always).
2. `docs/recipes.md`: synthesis recipes per sound type.
3. `docs/mixing.md`: loudness, analyzer targets by archetype (§12), pre-review checklist (§13).
4. `docs/game-audio.md`: what each sound is *for*: priority, palette, variation, repetition.
5. `docs/feedback.md`: turning 👍/👎 and comments into the next 3 (required for rounds ≥2).

## 1. Set up a project (once, with the human)
Make it inside the game repo (e.g. `<game>/sfx/`): `soundset init`, then fill `soundset.json` ([format](docs/project-format.md)). Infer and propose; ask only about taste and priorities, all questions in one message.
- **Cues**: find every sound event in the game code. Per cue write `trigger` (when it plays, how often, what plays with it) and `brief` (job, material, size, length, must-not; template: docs/game-audio.md §14).
- **Palette**: one paragraph: materials, key/scale and register, shared room, cartoon vs real. Derive it from the game's look; ask the human to confirm.
- **Reference**: point each cue at the game's current sound (audio file, or its old synth recipe converted to a patch) so "▶ current" works.
- **Loudness**: calibrate category `loudness` to the game's existing mix (`soundset analyze` its current sounds and music). Generic targets can be far too loud for a quiet game. `maxMs` follows how often a category plays.
- **Contexts**: 3–8 real game moments where cues overlap (two hits at once, throw then land), with timings from the code.
- Then tell the human "N cues set up; round 1 in ~15 min" and start round 1.

## 2. Run a round (you are the orchestrator)
1. `soundset status` lists what each cue needs and the next step.
2. Write 3 candidates per cue that needs them: `patches/<cue>/r<N>A|B|C.json` (N = last round + 1). For more than ~4 cues, use subagents (§3).
   - Round 1: three clearly different **directions** (synthetic / sample-led / hybrid, or dark-heavy / bright-snappy / tonal).
   - Later: docs/feedback.md. Exploit what was liked, keep ~1 explore, vary ≤2 axes each, never revisit a rejected region, shuffle slots.
   - **The 3 must always sound meaningfully different**, even when converging, unless the human asks for near-copies. Converging = 3 distinct takes on the favorite (different transient material, half/double length, an octave, a layer added/removed), never 3 tweaks of its tail. Changes ≤3 dB or ≤20% are inaudible in an A/B.
   - `note`: one plain-words line the human reads ("wood knock + soft felt thump, short"). No jargon, no self-praise.
   - `{"rand":…}` only for small natural variation (the baked round-robin), never to explore.
   - Keep `notes/<cue>.md`: beliefs per axis, rejected regions, what A/B/C each test.
3. `soundset check`: fix every ✗ and ⚠ (unknown keys are typos; near-identical pairs; limiter >3 dB = spiky transient; over the category max length).
4. `soundset look <cue>` and Read the PNG: vs docs/mixing.md §12, vs each other, vs the reference.
5. `soundset review --title "<round N: cues>" --about "<what changed, for the human coming back later>"`, **in the background** (it blocks until the human finishes). Tell the human "Round N is open in Chrome (M cues)". Don't poll or re-ask in chat; its stdout is the feedback.
6. Act on the output, then go to 1:
   - `SELECTED` done (maybe from an earlier round). `ITERATE` new round from the votes and comments. `REOPENED` new round from the note.
   - `UNTOUCHED` still awaiting review; it reappears next time unchanged. `CANCELLED` nothing recorded, ratings kept as a draft; ask when to resume.
   - Comments are short and literal: "these all sound like X" means all 3 next ones must leave X; "C from the old round is best" means start from that patch.

## 3. Subagents
Split the cues into groups of 3–6 by family (UI/economy, combat, magic/stingers) and launch one subagent per group in parallel. Prompt templates: [docs/agent-prompts.md](docs/agent-prompts.md). When all are back, you run `soundset check` on everything, skim the `look` sheets for cross-cue cohesion, and launch one review.
- Include: this file's path, the project path, the group's cues, each cue's feedback verbatim plus your one-line reading of it, shared constraints (key, room reverb), and the report length.
- Forbid: `review`, `bake`, editing `state.json` or earlier rounds, touching other groups' cues, editing the tool (report bugs instead).
- Never ask for "small polish" or near-copies of a favorite: that produced three identical-sounding candidates in a real project.

## 4. Bake and mix
- `soundset bake` after any review that selected cues (re-running is safe). Then wire the game: load `<out>/soundset-player.js`, `sfx.play(cue)`, fall back to the old sound when it returns false.
- Mix pass: ask the human to play the game and say what's too loud or quiet. Change only `loudness` (category or cue) in `soundset.json` and bake again. Level is never a reason for a new round.
- A selected sound that wears thin in game: `soundset reopen <cue> --note "<why>"` (or the human clicks it in the review sidebar).

## Rules
- Never edit `state.json` or reviewed patch files: rounds are history. New ideas go in the next round.
- Loudness is normalized per cue, so don't chase level with `gain`. Balance layers, shape envelopes, and set the mix only in `soundset.json`.
- Frequent cues (clicks, deals, hits) must be short, soft-edged, and fine on the 200th repetition.
- Put the identity in 200 Hz–5 kHz (laptop speakers). Sub alone is inaudible there, so add harmonics (`drive`) or a body layer.
- Keep every tonal element in the palette's key/scale, so stacked sounds don't clash.
- Samples: `soundset lib search <words>` (Kenney CC0 packs). Pitch, trim and layer them, and pair them with synthesis for character.

## Code map (for changing the tool itself)
- `web/engine/`: shared browser engine: `render.js` (patch → OfflineAudioContext → normalize/limit/trim), `gen.js` (noise, Karplus-Strong, modal, reverb IR), `env.js`, `resolve.js` (rand/pick per seed), `analysis.js` (BS.1770 loudness, metrics, FFT), `wav.js`, `browser.js` (sample loading).
- `web/review/`: the review page (vanilla JS). `web/headless/` + `src/headless.js`: the same engine in headless Chrome for check/look/render/bake. `web/sheet/draw.js`: waveform + spectrogram drawing.
- `src/`: `cli.js`, `project.js` (config/rounds/state), `review.js` (session, draft, report), `bake.js`, `library.js`, `server.js`.
- `player/soundset-player.js`: the in-game player (copied into the game by bake).
- Colors: `web/theme.css` only. `soundset doctor` checks setup. After changing the tool, run `npm test` (test/smoke.mjs): engine, CLI, review flows, bake and player end to end on a copy of `examples/demo/`.
