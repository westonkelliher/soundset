// review.js — `soundset review`: serve the rating page, block until Finalize / Send / Cancel, record + print feedback.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { startServer } from "./server.js";
import { readJson, writeJson } from "./project.js";

const CLOSE_GRACE = Number(process.env.CLOSE_GRACE ?? 60);

// the launching Claude session's /color -> hue rotation (same table as ~/bin/eyeball, decisionset)
function sessionHue() {
  if (process.env.HUE) return Number(process.env.HUE);
  const id = process.env.CLAUDE_CODE_SESSION_ID;
  if (!id) return 0;
  try {
    const base = path.join(os.homedir(), ".claude", "projects");
    for (const d of fs.readdirSync(base)) {
      const f = path.join(base, d, `${id}.jsonl`);
      if (!fs.existsSync(f)) continue;
      const m = [...fs.readFileSync(f, "utf8").matchAll(/"agentColor":"([a-z]+)"/g)].at(-1)?.[1];
      return { red: 137, orange: 167, yellow: 212, green: 257, cyan: 307, blue: 0, purple: 52, pink: 102, magenta: 102 }[m] ?? 0;
    }
  } catch {}
  return 0;
}

export function buildSession(proj, a) {
  const ready = proj.cueNames.filter((c) => proj.status(c) === "ready");
  const cueInfo = (name) => {
    const c = proj.cue(name);
    return { name, category: c.category, trigger: c.trigger || "", brief: c.brief || "", loudness: proj.loudness(name) };
  };
  const contexts = proj.config.contexts || {};
  const inContexts = (name) => Object.keys(contexts).filter((k) => (contexts[k].events || []).some(([c]) => c === name));
  return {
    title: a.title || `${proj.config.name} sounds`,
    about: a.about || "Rate this round of sound candidates.",
    project: proj.config.name,
    palette: proj.config.palette || "",
    cues: ready.map((name) => {
      const round = proj.latestRound(name), hist = proj.historyOf(name);
      return {
        ...cueInfo(name), round,
        reference: proj.cue(name).reference || null,
        candidates: hist.at(-1).candidates.map(({ id, patch, note }) => ({ id, patch, note })),
        history: hist.slice(0, -1).reverse(),
        contexts: inContexts(name),
      };
    }),
    done: proj.cueNames.filter((c) => proj.status(c) === "selected").map((name) => {
      const s = proj.cueState(name).selected;
      return { ...cueInfo(name), selected: { ...s, patch: proj.patchRel(name, s.round, s.id) } };
    }),
    waiting: proj.cueNames.filter((c) => proj.status(c) === "needs-candidates"),
    contexts,
    standIns: Object.fromEntries(proj.cueNames.map((c) => [c, { ref: proj.stand_in(c), loudness: proj.loudness(c) }])),
    variantsPreview: proj.config.variants ?? 4,
  };
}

const touched = (d) => d && (d.selected || d.cueNote?.trim() || Object.values(d.votes || {}).some((v) => v) || Object.values(d.comments || {}).some((c) => c?.trim()));

export function record(proj, session, draft, mode) {
  const now = new Date().toISOString();
  const lines = [], next = [];
  let n = 0;
  for (const c of session.cues) {
    const d = draft?.cues?.[c.name];
    if (!touched(d)) { lines.push(`UNTOUCHED ${c.name} (r${c.round} still awaiting review)`); continue; }
    n++;
    const s = proj.cueState(c.name);
    const votes = Object.fromEntries(Object.entries(d.votes || {}).filter(([, v]) => v));
    const comments = Object.fromEntries(Object.entries(d.comments || {}).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    s.rounds[c.round] = { reviewedAt: now, votes, comments, cueNote: d.cueNote?.trim() || "", ...(d.selected ? { selected: d.selected } : {}) };
    const fb = [...c.candidates.filter((x) => votes[x.id] || comments[x.id]).map((x) => `${x.id}${votes[x.id] > 0 ? " 👍" : votes[x.id] < 0 ? " 👎" : ""}${comments[x.id] ? ` "${comments[x.id]}"` : ""}`),
      ...(d.cueNote?.trim() ? [`cue note: "${d.cueNote.trim()}"`] : [])].join(" | ") || "no ratings";
    if (d.selected) {
      // "B" = this round's B; "r1C" = an earlier round's candidate
      const m = /^r(\d+)([A-Z])$/.exec(d.selected);
      const round = m ? Number(m[1]) : c.round, id = m ? m[2] : d.selected;
      s.selected = { round, id, at: now };
      lines.push(`SELECTED  ${c.name} r${round}${id}${m ? " (from an earlier round)" : ""}${fb === "no ratings" ? "" : `   (${fb})`}`);
    } else {
      lines.push(`ITERATE   ${c.name} r${c.round}: ${fb}`);
      next.push(c.name);
    }
  }
  for (const [name, note] of Object.entries(draft?.reopen || {})) {
    const s = proj.cueState(name);
    if (!s.selected) continue;
    s.reopened = [...(s.reopened || []), { ...s.selected, at: now, note }];
    lines.push(`REOPENED  ${name} (was r${s.selected.round}${s.selected.id})${note ? `: "${note}"` : ""}`);
    s.selected = null;
    next.push(name);
  }
  proj.save();
  const head = `soundset review: ${mode === "final" ? "FINAL" : "PARTIAL"} — ${n} of ${session.cues.length} cue(s) reviewed`;
  const tail = [];
  if (next.length) tail.push(`Next: write round N+1 (3 candidates each) for: ${next.join(", ")}.`, "  Follow CLAUDE.md §2: `soundset history <cue>`, docs/feedback.md, then check / look / review.");
  const waiting = session.waiting.filter((w) => !next.includes(w));
  if (waiting.length) tail.push(`Also still waiting for candidates: ${waiting.join(", ")}.`);
  const sel = proj.cueNames.filter((c) => proj.status(c) === "selected");
  if (sel.length) tail.push(`${sel.length} cue(s) selected — \`soundset bake\` writes them to the game.`);
  return [head, ...lines, "", ...tail].join("\n");
}

export async function review(proj, a) {
  const session = buildSession(proj, a);
  if (!session.cues.length && !session.done.length) {
    console.log(`nothing to review: no cue has unreviewed candidates (waiting for candidates: ${session.waiting.join(", ") || "none"})`);
    return;
  }
  const draftPath = proj.p(".soundset", "draft.json");
  let finished = null, lastSeen = Date.now(), everConnected = false, live = 0;
  const done = new Promise((ok) => (finished = ok));
  const srv = await startServer({
    projectDir: proj.dir,
    onPresence: (n) => { live = n; if (n) everConnected = true; lastSeen = Date.now(); },
    api: {
      session: () => ({ ...session, draft: readJson(draftPath, null) }),
      draft: (b) => { writeJson(draftPath, b.draft); return { ok: true }; },
      finish: (b) => { setTimeout(() => finished(b), 50); return { ok: true }; },
    },
  });
  const url = `http://127.0.0.1:${srv.port}/review/?hue=${sessionHue()}`;
  console.error(`soundset review: ${session.cues.length} cue(s) at ${url}`);
  if (!process.env.NO_BROWSER) spawn("google-chrome", [url], { stdio: "ignore", detached: true }).unref();
  const timer = setInterval(() => {
    if (everConnected && live === 0 && Date.now() - lastSeen > CLOSE_GRACE * 1000) finished({ mode: "closed" });
  }, 1000);
  const res = await done;
  clearInterval(timer);
  srv.close();
  srv.server.closeAllConnections(); // the page's presence stream would otherwise keep the process alive
  if (res.mode === "cancel" || res.mode === "closed") {
    if (res.draft) writeJson(draftPath, res.draft);
    console.log(`soundset review: ${res.mode === "closed" ? "CANCELLED (page closed)" : "CANCELLED"} — nothing recorded; ratings so far are kept as a draft for the next review.`);
    return;
  }
  writeJson(draftPath, res.draft);
  console.log(record(proj, session, res.draft, res.mode));
  fs.rmSync(draftPath, { force: true });
}
