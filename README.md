# soundset

Game sound effects designed by an AI agent and chosen by your ears. Each round, the agent writes 3 synth candidates per sound. You listen in the browser and either **Select** one (done) or 👍/👎 and comment (3 new ones next round). Selected sounds are baked to `.ogg` files with a tiny in-game player.

![review page](docs/review.png)

## Why it works
- **Agents can't hear, so they get eyes.** `soundset look` renders a spectrogram, an envelope and metrics (loudness, attack, decay, band energy, centroid, pitch) that the agent reads, and `docs/` is a compiled reference: synthesis recipes per sound type, mixing and loudness targets, game-audio design principles, and a table that turns comments ("too clicky", "more subtle") into parameter moves.
- **Fair listening.** Every candidate is loudness-matched (BS.1770), because the louder one otherwise wins. You can also play the old sound ("▶ current") or the candidate inside a game moment ("▶ in context").
- **A real synth.** Web Audio rendered offline in Chrome: oscillators with unison, FM, noise colors, Karplus-Strong plucks, modal resonators (wood, glass, bells, coins), CC0 samples, filter/pitch/amp envelopes, drive, a bus compressor, reverb and delay. What you hear in review is bit-for-bit what gets baked.

![what the agent sees](docs/look.png)

## Use it
Needs Node ≥20, Google Chrome and ffmpeg.
```sh
git clone https://github.com/westonkelliher/soundset && cd soundset && npm install
ln -s "$PWD/bin/soundset" ~/.local/bin/soundset   # or anywhere on PATH
soundset doctor && soundset lib fetch            # check setup; download CC0 Kenney packs (~600 samples)
mkdir my-game-sfx && cd my-game-sfx && soundset init
```
Describe your cues in `soundset.json` ([format](docs/project-format.md)), then point your coding agent at [`CLAUDE.md`](CLAUDE.md). It runs the loop: write candidates → `check` → `look` → `review` (you rate) → repeat → `bake`. In your game: `const sfx = await createPlayer({base: "sfx/"}); sfx.play("impact")`.

`soundset help` lists every command. On the review page, `?` lists hotkeys (1/2/3 play, `=`/`-` rate, `s` select, `j`/`k` move between cues). Try it on the bundled demo: `cd examples/demo && soundset review`.

## Status
It's in use (an auto-battler deckbuilder's 18 sounds, rounds 1–3). Not yet done:
- no live "tweak a knob" audition page; all changes go through rounds
- peaks are sample peaks, not true-peak; the pitch readout is approximate on glides and chords
- bakes `.ogg` only (older Safari needs another format)
- `npm test` runs an end-to-end smoke test (engine, CLI, review flows, bake, player)

## License
Sounds you make are entirely yours. The code is MIT with an attribution requirement: credit "soundset by Weston Kelliher". See [LICENSE](LICENSE).
