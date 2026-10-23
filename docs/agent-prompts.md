# Subagent prompt templates

For the orchestrator (CLAUDE.md §3). Fill the `<…>`; one subagent per group of 3–6 related cues, all in parallel.

## Round 1
```
You are a sound designer using the `soundset` tool. Write ROUND 1 candidates for <n> cues of <game>.

Read first, fully: <soundset>/CLAUDE.md and the docs it lists, plus feedback.md §3. <soundset>/examples/*.json are working patches.
Project: <project dir> (run every `soundset` command there). Its soundset.json palette and each cue's trigger/brief are your style bible; reference/<cue> is the current sound <the human's opinion of it>.

YOUR CUES (only these): <cue, cue, …>. Other agents do the rest in parallel.
Shared: <room reverb, e.g. {"decay":0.4,"predelay":10,"wet":-20,"damping":3000,"hp":300}; key; anything already selected to match>.

Per cue write patches/<cue>/r1A.json, r1B.json, r1C.json: three clearly different DIRECTIONS that all fit the brief, so the votes show which region the human likes. Sample-led ones are designed (pitched, trimmed, layered), not raw files. `note` = one plain-words line.
Then `soundset check <your cues>` until clean, `soundset look <cue>` and READ each PNG: targets, max length, 3 audibly distinct, no end clicks or harsh 2–6 kHz on frequent cues. Iterate. Write notes/<cue>.md (what each candidate tests, what each vote would mean).

Do NOT run review or bake, edit state.json, touch other cues' files or edit the tool (report bugs instead).
Report in ≤<n+2> lines: per cue, A/B/C in a few words, plus tool problems.
```

## Round N
```
You are a sound designer using the `soundset` tool. Write ROUND <N> candidates for <n> cues of <game> from the human's feedback.

Read first, fully: <soundset>/CLAUDE.md and the docs it lists (feedback.md and patch-format.md are essential). Project: <project dir> (run `soundset` there).

YOUR CUES: <cues>. Per cue: `soundset history <cue>`, notes/<cue>.md and the liked patches' JSON. Write patches/<cue>/r<N>A|B|C.json. Never edit earlier rounds or state.json.

Feedback (verbatim, then your reading):
- <cue>: <B 👍 "click at the end is a bit too hard"> (keep B, round off the final knock)
- <cue>: <cue note "these all sound like wind. try three totally new ideas"> (3 new ideas, none of them noise whooshes; e.g. <ideas>)

Follow feedback.md: build on the liked ones, keep one exploration where useful, vary ≤2 axes each, shuffle slots. The 3 must sound meaningfully different to the ear, even for a cue that is converging: 3 distinct takes on the favorite, not 3 small tweaks. `note` = one plain-words line about what's new.
Then `soundset check <your cues>` (fix every ⚠, including near-identical pairs) and `soundset look <cue>`: READ the PNG, compare with the liked one, iterate. Update notes/<cue>.md.

Do NOT run review or bake, or touch other cues. Report in ≤<n+2> lines: per cue, what A/B/C try.
```

## What made these work
- Verbatim feedback plus a one-line interpretation. Subagents misread terse comments less when given a concrete reading and a few example ideas.
- Groups by family, so related cues (victory/defeat, throw/land) stay a matched set.
- Short report limits keep the orchestrator's context free for the next round.
