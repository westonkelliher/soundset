# Project format (`soundset.json`)

A project is a directory containing `soundset.json`; `soundset init` scaffolds one. Every command finds it from the current directory upward (or via `--dir`).

| key | meaning |
|---|---|
| `name` | shown in the review title |
| `out` | where `bake` writes `<cue>.<n>.ogg`, `manifest.json`, `soundset-player.js` (relative to the project) |
| `variants` | baked variations per cue (seeds 0…N−1; 0 is exactly what was reviewed). Cue-level override: `variants` |
| `sampleRate`, `ceiling` | render rate (48000), peak ceiling dBFS (−1) |
| `oggQuality` | vorbis quality for bake (default 6) |
| `palette` | the style bible: materials, key/scale, shared room, cartoon vs real. Shown to Weston under ⓘ; agents design to it |
| `categories.<cat>` | `loudness` (momentary-max LUFS: **this is the in-game mix**), `maxMs` (check warns above it), `play` (in-game jitter: `pitch` ±cents, `gain` ±dB, `voices` max simultaneous, `cooldown` ms between triggers) |
| `cues.<cue>` | `category`, `trigger` (when it plays), `brief` (what it should be), `reference` (the current sound: a patch `.json` or an audio file, project-relative; plays as "▶ current"). Optional `loudness`, `maxMs`, `play`, `variants` overrides |
| `contexts.<name>` | `{label, events: [[cue, ms], …]}`: a game moment for "▶ in context". The reviewed cue plays its candidate; other cues play their selected patch or reference; repeats of a cue play different variations |

Files next to it:
- `patches/<cue>/r<N><A|B|C>.json`: candidates (rounds are immutable once reviewed).
- `notes/<cue>.md`: the agent's hypothesis log.
- `state.json`: selections and feedback per round (written by `review`, `reopen`; don't edit).
- `.soundset/`: scratch (look/analyze PNGs, review draft); gitignored.

In the game: load `<out>/soundset-player.js`, then `const sfx = await createPlayer({base: "<out>/"}); sfx.play("impact")`. It returns false for cues that aren't baked, so the game can fall back to old sounds.
