#!/usr/bin/env node
// cli.js — soundset command line. `soundset help` for usage.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Project, initProject, readJson } from "./project.js";
import { withHeadless } from "./headless.js";
import { review } from "./review.js";
import { bake } from "./bake.js";
import { lib } from "./library.js";
import { LIB } from "./server.js";

const HELP = `soundset — human-in-the-loop game SFX design (agents: read CLAUDE.md + docs/ first)

setup:
  doctor                          check Chrome, ffmpeg, the sample library

project (run inside a dir with soundset.json, or pass --dir; format: docs/project-format.md):
  init [dir]                      scaffold soundset.json, patches/, notes/
  status                          every cue: status, round, last feedback (what to do next)
  history <cue>                   all rounds of a cue: notes, votes, comments, selection
  look <cue> [--round N]          render a round's candidates + reference -> metrics + comparison PNG (Read it)
  check [cue...]                  render every unreviewed candidate; flag errors/warnings/out-of-range metrics
  review [--title T] [--about A]  open the rating page in Chrome; BLOCKS until Weston finalizes; prints feedback
  reopen <cue> [--note text]      un-select a cue so it gets new rounds
  bake [cue...]                   render selected cues x variants -> <out>/*.ogg + manifest.json

any patch:
  render <patch.json> [-o out.wav] [--seed N] [--loudness L]
  analyze <patch.json|audio> ... [--png out.png] [--loudness L]   metrics (+ sheet PNG)

sample library (CC0):
  lib fetch                       download + index the Kenney audio packs into library/
  lib search <words...>           find samples by tag/name (use as "src": "lib:<path>")
  lib add <dir> [--name N]        index your own folder of sounds (symlinked into library/)
`;

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { const k = a.slice(2); o[k] = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : true; }
    else if (a === "-o") o.o = argv[++i];
    else o._.push(a);
  }
  return o;
}

const scratch = (proj, ...p) => { const d = path.join(proj?.dir ?? process.cwd(), ".soundset", ...p.slice(0, -1)); fs.mkdirSync(d, { recursive: true }); return path.join(d, p.at(-1)); };
const pad = (s, n) => String(s).padEnd(n);

function fmtMetrics(m) {
  const n = (q) => `${q.inharmonic ? "~" : ""}${q.note.name}${q.note.cents >= 0 ? "+" : ""}${q.note.cents}c`;
  const p = (m.pitch ? n(m.pitch) : "-") + (m.pitchEnd ? "→" + n(m.pitchEnd) : "");
  const b = m.bands;
  return `${m.lufsM}LUFS dur ${m.durMs}ms atk ${m.attackMs}ms t20 ${m.t20Ms}ms crest ${m.crestDb}dB centroid ${m.centroidHz}Hz pitch ${p} flat ${m.flatness} | sub ${b.sub} low ${b.low} lmid ${b.lowmid} mid ${b.mid} hmid ${b.highmid} high ${b.high} %`;
}

function feedbackLine(c) {
  return [...c.candidates.filter((x) => x.vote || x.comment).map((x) => `${x.id}${x.vote > 0 ? " 👍" : x.vote < 0 ? " 👎" : ""}${x.comment ? ` "${x.comment}"` : ""}`),
    ...(c.cueNote ? [`cue note: "${c.cueNote}"`] : [])].join(" | ") || "no ratings";
}

function issues(proj, cue, m, info) {
  const out = [...(info.warnings || [])];
  const maxMs = proj?.cue(cue).maxMs ?? proj?.category(cue).maxMs;
  if (maxMs && m.durMs > maxMs) out.push(`duration ${m.durMs}ms > max ${maxMs}ms (to -60 dB; shorten decays/reverb)`);
  const target = proj?.loudness(cue);
  if (target != null && m.lufsM < target - 1) out.push(`loudness ${m.lufsM} LUFS-M < target ${target}: the peak limiter capped it (too peaky; compress or soften the transient)`);
  if (m.clipped > 0) out.push(`${m.clipped} clipped samples`);
  if (m.startClick) out.push("starts on a non-zero sample (click)");
  if (Math.abs(m.dc) > 0.01) out.push(`DC offset ${m.dc}`);
  if (m.bands.sub > 25) out.push(`sub band ${m.bands.sub}% (inaudible on laptops; move energy up)`);
  if (m.bands.highmid + m.bands.high > 55) out.push(`highmid+high ${(m.bands.highmid + m.bands.high).toFixed(1)}% (risk: harsh/fatiguing)`);
  return out;
}

async function lookItems(proj, cue, round) {
  const c = proj.cue(cue), items = [];
  const opts = proj.renderOpts(cue);
  if (c.reference) items.push({ title: `${cue} — reference (current sound)`, ref: c.reference, opts });
  const s = proj.cueState(cue);
  if (s.selected && s.selected.round !== round) items.push({ title: `${cue} — SELECTED r${s.selected.round}${s.selected.id}`, ref: proj.patchRel(cue, s.selected.round, s.selected.id), opts });
  for (const id of proj.rounds(cue)[round] || []) {
    const pt = proj.patch(cue, round, id);
    items.push({ title: `${cue} r${round}${id}`, note: pt.note, ref: proj.patchRel(cue, round, id), opts });
  }
  return items;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = args(rest);
  const P = () => new Project(a.dir ?? process.cwd());

  switch (cmd) {
    case undefined: case "help": case "-h": case "--help": return console.log(HELP);

    case "doctor": {
      const has = (cmd, args = ["-version"]) => { try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; } };
      const major = Number(process.versions.node.split(".")[0]);
      const rows = [
        [major >= 20, `node ${process.versions.node}`, "need >= 20"],
        [has("google-chrome", ["--version"]) || has("chromium", ["--version"]), "Chrome (renders + review page)", "install Google Chrome; `npx playwright install chromium` also works headless"],
        [has("ffmpeg"), "ffmpeg (bake to .ogg)", "apt install ffmpeg"],
        [has("ffprobe"), "ffprobe (library durations)", "comes with ffmpeg"],
        [has("unzip", ["-v"]), "unzip (lib fetch)", "apt install unzip"],
      ];
      const idx = path.join(LIB, "index.json");
      const n = fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, "utf8")).length : 0;
      rows.push([n > 0, `sample library: ${n} samples`, "run `soundset lib fetch`"]);
      try { await withHeadless(null, (h) => h.render({ layers: [{ type: "osc", freq: 440, env: { d: 50 } }] }, {})); rows.push([true, "headless render", ""]); }
      catch (e) { rows.push([false, "headless render", e.message.split("\n")[0]]); }
      for (const [ok, what, fix] of rows) console.log(`${ok ? "✓" : "✗"} ${what}${ok ? "" : `  -> ${fix}`}`);
      if (rows.some((r) => !r[0])) process.exitCode = 1;
      return;
    }

    case "init": { console.log("wrote", initProject(a._[0] ?? ".")); return; }

    case "status": {
      const proj = P();
      console.log(`${proj.config.name}: ${proj.dir}`);
      const counts = {};
      for (const cue of proj.cueNames) {
        const st = proj.status(cue), r = proj.latestRound(cue), h = proj.historyOf(cue), last = h.at(-1);
        counts[st] = (counts[st] || 0) + 1;
        const sel = proj.cueState(cue).selected;
        let info = st === "selected" ? `r${sel.round}${sel.id}` : st === "ready" ? `r${r} awaiting review (${proj.rounds(cue)[r].length} candidates)` : r ? `write r${r + 1} — last: ${feedbackLine(last)}` : "write r1";
        console.log(`${pad(cue, 18)} ${pad(st, 17)} ${info}`);
      }
      console.log("\n" + Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", "));
      return;
    }

    case "history": {
      const proj = P(), cue = a._[0];
      const c = proj.cue(cue);
      console.log(`# ${cue} [${c.category}] loudness ${proj.loudness(cue)} LUFS-M\ntrigger: ${c.trigger}\nbrief: ${c.brief}`);
      if (fs.existsSync(proj.p("notes", `${cue}.md`))) console.log(`notes: notes/${cue}.md`);
      for (const r of proj.historyOf(cue)) {
        console.log(`\n## round ${r.round} ${r.reviewedAt ? `(reviewed ${r.reviewedAt})` : "(not reviewed yet)"}${r.selected ? ` — SELECTED ${r.selected}` : ""}`);
        for (const x of r.candidates) console.log(`  ${x.id} ${x.vote > 0 ? "👍" : x.vote < 0 ? "👎" : "  "} ${x.patch}\n     note: ${x.note}${x.comment ? `\n     weston: "${x.comment}"` : ""}`);
        if (r.cueNote) console.log(`  cue note: "${r.cueNote}"`);
      }
      return;
    }

    case "look": {
      const proj = P(), cue = a._[0];
      const round = Number(a.round ?? proj.latestRound(cue));
      if (!round) throw new Error(`${cue} has no rounds yet`);
      const items = await lookItems(proj, cue, round);
      const png = scratch(proj, "look", `${cue}-r${round}.png`);
      const res = await withHeadless(proj.dir, (h) => h.sheet(items, png));
      for (const r of res) console.log(`${r.title}\n  ${r.error ? "ERROR " + r.error : fmtMetrics(r.metrics)}${(r.info?.warnings || []).map((w) => "\n  ⚠ " + w).join("")}`);
      console.log(`\nsheet: ${png}`);
      return;
    }

    case "check": {
      const proj = P();
      const cues = a._.length ? a._ : proj.cueNames.filter((c) => proj.status(c) === "ready");
      let bad = 0;
      await withHeadless(proj.dir, async (h) => {
        for (const cue of cues) {
          const round = proj.latestRound(cue);
          for (const id of proj.rounds(cue)[round] || []) {
            const rel = proj.patchRel(cue, round, id);
            try {
              const r = await h.render(rel, proj.renderOpts(cue));
              const is = issues(proj, cue, r.metrics, r.info);
              console.log(`${is.length ? "⚠" : "✓"} ${pad(rel, 30)} ${fmtMetrics(r.metrics)}${is.map((x) => "\n    ⚠ " + x).join("")}`);
            } catch (e) { bad++; console.log(`✗ ${pad(rel, 30)} ${e.message}`); }
          }
          const n = (proj.rounds(cue)[round] || []).length;
          if (n !== 3) console.log(`⚠ ${cue} r${round} has ${n} candidates (the review expects 3)`);
        }
      });
      if (bad) { console.log(`\n${bad} patch(es) failed to render`); process.exitCode = 1; }
      return;
    }

    case "render": {
      const f = a._[0], patch = readJson(path.resolve(f));
      const out = a.o ?? f.replace(/\.json$/, "") + (a.seed ? `.s${a.seed}` : "") + ".wav";
      let proj = null; try { proj = P(); } catch {}
      const r = await withHeadless(proj?.dir, (h) => h.render(patch, { seed: Number(a.seed ?? 0), loudness: a.loudness != null ? Number(a.loudness) : -18 }));
      fs.writeFileSync(out, Buffer.from(r.wav, "base64"));
      console.log(`${out}\n${fmtMetrics(r.metrics)}${r.info.warnings.map((w) => "\n⚠ " + w).join("")}`);
      return;
    }

    case "analyze": {
      let proj = null; try { proj = P(); } catch {}
      const items = a._.map((f) => {
        const abs = path.resolve(f);
        const ref = f.endsWith(".json") ? readJson(abs) : "/abs" + abs;
        return { title: f, note: ref.note, ref, opts: { loudness: a.loudness != null ? Number(a.loudness) : f.endsWith(".json") ? -18 : null } };
      });
      if (items.some((i) => typeof i.ref === "string")) process.env.SOUNDSET_ABS = "1";
      const png = a.png ?? scratch(proj, "analyze", "sheet.png");
      const res = await withHeadless(proj?.dir, (h) => h.sheet(items, png));
      for (const r of res) console.log(`${r.title}\n  ${r.error ? "ERROR " + r.error : fmtMetrics(r.metrics)}`);
      console.log(`\nsheet: ${png}`);
      return;
    }

    case "review": return review(P(), a);

    case "reopen": {
      const proj = P(), cue = a._[0];
      proj.cue(cue);
      const s = proj.cueState(cue);
      if (!s.selected) throw new Error(`${cue} is not selected`);
      s.reopened = [...(s.reopened || []), { ...s.selected, at: new Date().toISOString(), note: a.note || "" }];
      s.selected = null;
      // the selected round counts as reviewed, so the next `status` asks for a new round
      proj.save();
      console.log(`${cue} reopened; write round ${proj.latestRound(cue) + 1}`);
      return;
    }

    case "bake": return bake(P(), a);
    case "lib": return lib(a);
    default: console.error(`unknown command: ${cmd}\n\n${HELP}`); process.exitCode = 2;
  }
}

main().catch((e) => { console.error("soundset: " + (e.message || e)); process.exitCode = 1; });
