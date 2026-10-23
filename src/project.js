// project.js — a soundset project dir: soundset.json (config), patches/<cue>/r<N><ID>.json, state.json (tool-managed).
import fs from "node:fs";
import path from "node:path";

export const PATCH_RE = /^r(\d+)([A-Z])\.json$/;

export function findProject(dir = process.cwd()) {
  let d = path.resolve(dir);
  for (;;) {
    if (fs.existsSync(path.join(d, "soundset.json"))) return d;
    const up = path.dirname(d);
    if (up === d) throw new Error(`no soundset.json in ${dir} or its parents (run \`soundset init\`)`);
    d = up;
  }
}

const readJson = (f, dflt) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : dflt);
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + "\n"); };

export class Project {
  constructor(dir) {
    this.dir = findProject(dir);
    this.config = readJson(path.join(this.dir, "soundset.json"));
    this.statePath = path.join(this.dir, "state.json");
    this.state = readJson(this.statePath, { cues: {} });
  }
  save() { writeJson(this.statePath, this.state); }
  p(...a) { return path.join(this.dir, ...a); }
  get cueNames() { return Object.keys(this.config.cues || {}); }
  cue(name) {
    const c = this.config.cues?.[name];
    if (!c) throw new Error(`unknown cue "${name}" (cues: ${this.cueNames.join(", ")})`);
    return c;
  }
  cueState(name) { return (this.state.cues[name] ??= { selected: null, rounds: {} }); }

  category(name) {
    const c = this.cue(name);
    return { ...(this.config.categories?.[c.category] || {}), name: c.category };
  }
  loudness(name) { return this.cue(name).loudness ?? this.category(name).loudness ?? -18; }
  playOpts(name) { return { pitch: 25, gain: 1, voices: 4, cooldown: 30, ...(this.category(name).play || {}), ...(this.cue(name).play || {}) }; }
  renderOpts(name) { return { loudness: this.loudness(name), sampleRate: this.config.sampleRate ?? 48000, ceiling: this.config.ceiling ?? -1 }; }

  // {round: [ids]} from the filesystem
  rounds(name) {
    const dir = this.p("patches", name), out = {};
    if (!fs.existsSync(dir)) return out;
    for (const f of fs.readdirSync(dir).sort()) {
      const m = PATCH_RE.exec(f);
      if (m) (out[m[1]] ??= []).push(m[2]);
    }
    return out;
  }
  latestRound(name) {
    const r = Object.keys(this.rounds(name)).map(Number);
    return r.length ? Math.max(...r) : 0;
  }
  patchRel(name, round, id) { return `patches/${name}/r${round}${id}.json`; }
  patch(name, round, id) { return readJson(this.p(this.patchRel(name, round, id))); }

  // selected | ready (unreviewed candidates waiting) | needs-candidates
  status(name) {
    const s = this.cueState(name);
    if (s.selected) return "selected";
    const r = this.latestRound(name);
    if (!r) return "needs-candidates";
    return s.rounds[r]?.reviewedAt ? "needs-candidates" : "ready";
  }

  historyOf(name) {
    const s = this.cueState(name), all = this.rounds(name);
    return Object.keys(all).map(Number).sort((a, b) => a - b).map((round) => {
      const fb = s.rounds[round] || {};
      return {
        round, reviewedAt: fb.reviewedAt || null, cueNote: fb.cueNote || "",
        selected: s.selected && s.selected.round === round ? s.selected.id : null,
        candidates: all[round].map((id) => {
          const pt = this.patch(name, round, id);
          return { id, patch: this.patchRel(name, round, id), note: pt.note || "", vote: fb.votes?.[id] ?? 0, comment: fb.comments?.[id] || "" };
        }),
      };
    });
  }

  // what plays for a cue outside its own card (contexts): selected patch, else reference
  stand_in(name) {
    const s = this.cueState(name);
    if (s.selected) return this.patchRel(name, s.selected.round, s.selected.id);
    return this.cue(name).reference || null;
  }
}

export function initProject(dir) {
  const f = path.join(dir, "soundset.json");
  if (fs.existsSync(f)) throw new Error(`${f} already exists`);
  writeJson(f, {
    name: path.basename(path.resolve(dir)),
    out: "out",
    variants: 4,
    sampleRate: 48000,
    ceiling: -1,
    palette: "describe the game's sonic identity here: materials, tuning/key, how cartoony vs realistic, shared space (reverb)",
    categories: {
      ui: { loudness: -30, maxMs: 150, play: { pitch: 30, gain: 1, voices: 2, cooldown: 40 } },
      feedback: { loudness: -24, maxMs: 400, play: { pitch: 25, gain: 1, voices: 3, cooldown: 30 } },
      combat: { loudness: -20, maxMs: 600, play: { pitch: 40, gain: 1.5, voices: 4, cooldown: 25 } },
      impact: { loudness: -17, maxMs: 700, play: { pitch: 50, gain: 1.5, voices: 4, cooldown: 25 } },
      stinger: { loudness: -19, maxMs: 3000, play: { pitch: 0, gain: 0, voices: 1, cooldown: 500 } },
    },
    cues: {
      example: { category: "ui", trigger: "when it plays in the game, how often, what plays with it", brief: "job, emotion, material, size, length, must-not, references (docs/game-audio.md §14)", reference: null },
    },
    contexts: {},
  });
  for (const d of ["patches", "notes"]) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const gi = path.join(dir, ".gitignore"), old = fs.existsSync(gi) ? fs.readFileSync(gi, "utf8") : "";
  if (!/^\.soundset\/?$/m.test(old)) fs.writeFileSync(gi, old + (old && !old.endsWith("\n") ? "\n" : "") + ".soundset/\n");
  return f;
}

export { readJson, writeJson };
