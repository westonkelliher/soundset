# soundset

Game SFX by rounds: an agent writes 3 synth candidates per sound and you listen in the browser. **Select** one to lock it, or 👍/👎 and comment to get 3 new ones. Selected sounds are baked to `.ogg` for the game.

- `soundset review` opens the rating page. Candidates are loudness-matched, and you can hear each one next to the current sound or inside a game sequence (▶ in context). Hotkeys: `?`.
- **Finalize** sends everything, **Send N** sends what you touched, **Cancel** sends nothing. Ratings autosave.
- Agents: start at `CLAUDE.md`. Docs: `docs/` (patch format, recipes, mixing, game-audio principles, feedback→parameters).
- Engine: Web Audio in Chrome (offline render): oscillators, FM, noise, Karplus-Strong, modal resonators, CC0 samples (Kenney), filters/envelopes/drive, bus comp/reverb/delay, BS.1770 loudness normalization.

```
soundset init | status | history <cue> | check | look <cue> | review | bake | render | analyze | lib fetch|search
```
