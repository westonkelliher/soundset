// review.js — the rating page: 3 candidates per cue; select (lock) or 👍/👎 + comment (iterate).
import { renderAny, toAudioBuffer } from "../engine/browser.js";
import { drawWave } from "../sheet/draw.js";

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k);
  return el;
};

const hue = new URLSearchParams(location.search).get("hue");
if (hue) document.documentElement.style.setProperty("--hue-shift", hue);

let S;                 // session from the server
let draft = { cues: {}, reopen: {} };
let focus = 0;         // focused card index
const target = {};     // cue -> last played candidate id
let actx, master;
let playing = null;    // {nodes, tile, stopAt, raf}
const renders = new Map(); // key -> Promise<{result, buffer}>

// ---------- state ----------
const dcue = (name) => (draft.cues[name] ??= { votes: {}, comments: {}, cueNote: "", selected: null });
const touched = (name) => {
  const d = draft.cues[name];
  return !!d && !!(d.selected || d.cueNote.trim() || Object.values(d.votes).some((v) => v) || Object.values(d.comments).some((c) => c.trim()));
};
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft }) }), 300);
  refreshChrome();
}

// ---------- audio ----------
function ensureCtx() {
  if (!actx) {
    actx = new AudioContext({ latencyHint: "interactive" });
    master = actx.createGain();
    master.gain.value = Number($("#volume").value);
    master.connect(actx.destination);
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function render(key, ref, loudness, seed = 0) {
  const k = `${key}|${seed}`;
  if (!renders.has(k)) {
    renders.set(k, renderAny(ref, { loudness, seed, sampleRate: 48000 }).then((r) => ({ result: r, buffer: toAudioBuffer(ensureCtxLazy(), r) })));
  }
  return renders.get(k);
}
// buffers can be built before a user gesture via an offline context
let lazyCtx;
const ensureCtxLazy = () => actx || (lazyCtx ??= new OfflineAudioContext(2, 1, 48000));

function stop() {
  if (!playing) return;
  for (const n of playing.nodes) try { n.stop(); } catch {}
  cancelAnimationFrame(playing.raf);
  playing.tile?.classList.remove("playing");
  playing.btn?.classList.remove("playing");
  if (playing.line) playing.line.style.opacity = 0;
  playing = null;
}

function startBuffers(list, { tile, btn, line, msMax } = {}) {
  ensureCtx();
  stop();
  const t0 = actx.currentTime + 0.03, nodes = [];
  let end = 0;
  for (const { buffer, at = 0 } of list) {
    const s = actx.createBufferSource();
    s.buffer = buffer;
    s.connect(master);
    s.start(t0 + at / 1000);
    nodes.push(s);
    end = Math.max(end, at / 1000 + buffer.duration);
  }
  playing = { nodes, tile, btn, line };
  btn?.classList.add("playing");
  const tick = () => {
    const t = actx.currentTime - t0;
    if (line && msMax) { line.style.opacity = t >= 0 ? 0.9 : 0; line.style.left = `${Math.min(100, (t * 1000 / msMax) * 100)}%`; }
    if (t > end) return stop();
    playing.raf = requestAnimationFrame(tick);
  };
  playing.raf = requestAnimationFrame(tick);
}

const vary = () => $("#vary").checked;
const seedFor = () => (vary() ? 1 + Math.floor(Math.random() * Math.max(1, S.variantsPreview - 1)) : 0);

async function playCand(ci, id) {
  const cue = S.cues[ci], c = cue.candidates.find((x) => x.id === id);
  if (!c) return;
  setFocus(ci, false);
  target[cue.name] = id;
  markTarget(ci);
  const tile = $(`#t-${cue.name}-${id}`);
  try {
    const r = await render(c.patch, c.patch, cue.loudness, seedFor());
    startBuffers([{ buffer: r.buffer }], { tile, btn: $(".play-btn", tile), line: $(".head-line", tile), msMax: tile._msMax });
  } catch (e) { toast(`${cue.name} ${id}: ${e.message}`); }
}

async function playRef(ref, loudness, btn) {
  if (!ref) return toast("no reference sound for this cue");
  try {
    const r = await render(ref, ref, loudness, 0);
    startBuffers([{ buffer: r.buffer }], { btn });
  } catch (e) { toast(e.message); }
}

async function playContext(ci, ctxName, id) {
  const cue = S.cues[ci], cx = S.contexts[ctxName];
  id ??= target[cue.name] ?? cue.candidates[0].id;
  const btn = $(`#ctx-${cue.name}`);
  try {
    const list = [], seen = {};
    for (const [name, at] of cx.events) {
      // repeats of a cue get different variations, like the game's round-robin (identical copies would comb-filter)
      const nth = (seen[name] = (seen[name] ?? -1) + 1);
      let ref, loud;
      if (name === cue.name) { ref = cue.candidates.find((x) => x.id === id).patch; loud = cue.loudness; }
      else { const si = S.standIns[name]; if (!si?.ref) continue; ref = si.ref; loud = si.loudness; }
      const r = await render(ref, ref, loud, name === cue.name ? (nth ? 1 + ((nth - 1) % Math.max(1, S.variantsPreview - 1)) : seedFor()) : nth);
      list.push({ buffer: r.buffer, at });
    }
    startBuffers(list, { btn });
    toast(`${cx.label || ctxName}: ${cue.name} = ${id}`, 1200);
  } catch (e) { toast(e.message); }
}

// ---------- UI ----------
let toastT;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms);
}

function autosize(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }

function candTile(ci, cue, c) {
  const d = dcue(cue.name);
  const tile = h("div", { class: "cand", id: `t-${cue.name}-${c.id}` });
  const canvas = h("canvas");
  const wave = h("div", { class: "wavebox", title: "Play (click)", onclick: () => playCand(ci, c.id) }, canvas, h("div", { class: "head-line" }), h("div", { class: "status" }, "rendering…"));
  const ta = h("textarea", { rows: 1, placeholder: "comment (optional)…", oninput: (e) => { d.comments[c.id] = e.target.value; autosize(e.target); save(); updateCard(ci); } });
  ta.value = d.comments[c.id] || "";
  const vote = (v, cls, label, tip) => h("button", { class: `vote ${cls}`, title: tip, onclick: () => { d.votes[c.id] = d.votes[c.id] === v ? 0 : v; target[cue.name] = c.id; save(); updateCard(ci); } }, label);
  tile.append(
    h("div", { class: "top" },
      h("span", { class: "letter" }, c.id),
      h("button", { class: "play-btn", title: `Play ${c.id} (${cue.candidates.indexOf(c) + 1})`, onclick: () => playCand(ci, c.id) }, "▶"),
      wave),
    h("div", { class: "dur" }, ""),
    h("div", { class: "note" }, c.note || ""),
    h("div", { class: "actions" },
      vote(1, "upv", "👍", "Like it: build on this (=)"),
      vote(-1, "downv", "👎", "Don't like it: move away from this (-)"),
      h("button", { class: "select-btn", title: "Use this one: lock the cue, no more iterating (s)", onclick: () => { d.selected = d.selected === c.id ? null : c.id; target[cue.name] = c.id; save(); updateCard(ci); } }, "Select")),
    ta);
  return tile;
}

function historyBlock(ci, cue) {
  if (!cue.history.length) return null;
  return h("details", { class: "history" },
    h("summary", {}, `previous rounds (${cue.history.length})`),
    ...cue.history.map((r) => h("div", { class: "hround" },
      h("div", {}, `round ${r.round}`, r.cueNote ? h("span", { class: "comment" }, ` — cue note: “${r.cueNote}”`) : null),
      ...r.candidates.map((c) => {
        const btn = h("button", { class: "small-btn", title: "Play", onclick: () => playRef(c.patch, cue.loudness, btn) }, `▶ ${c.id}`);
        const key = `r${r.round}${c.id}`, d = dcue(cue.name);
        const sel = h("button", { class: "small-btn hsel", "data-key": key, title: "Use this earlier candidate: lock the cue", onclick: () => { d.selected = d.selected === key ? null : key; save(); updateCard(ci); } }, "Select");
        return h("div", { class: "hrow" }, btn, sel,
          h("span", {}, c.vote > 0 ? "👍" : c.vote < 0 ? "👎" : "·"),
          c.comment ? h("span", { class: "comment" }, `“${c.comment}”`) : null,
          h("span", { class: "note", title: c.note }, c.note));
      }))));
}

function card(ci, cue) {
  const d = dcue(cue.name);
  const refBtn = h("button", { class: "small-btn", title: "Play the current (old) sound (0)", onclick: () => playRef(cue.reference, cue.loudness, refBtn) }, "▶ current");
  let ctxEl = null;
  if (cue.contexts.length) {
    const sel = h("select", { class: "small-btn", title: "Which game sequence to hear it in" }, ...cue.contexts.map((k) => h("option", { value: k }, S.contexts[k].label || k)));
    const b = h("button", { class: "small-btn", id: `ctx-${cue.name}`, title: "Play the target candidate inside this game sequence (x)", onclick: () => playContext(ci, sel.value) }, "▶ in context");
    ctxEl = h("span", {}, b, " ", cue.contexts.length > 1 ? sel : null);
    b._sel = sel;
  }
  const note = h("textarea", { class: "cuenote", rows: 1, placeholder: "note on this cue overall (optional) — e.g. “all too long”, “wrong direction, think coins not bells”", oninput: (e) => { d.cueNote = e.target.value; autosize(e.target); save(); updateCard(ci); } });
  note.value = d.cueNote;
  const el = h("section", { class: "card", id: `card-${cue.name}`, onmousedown: () => setFocus(ci, false) },
    h("div", { class: "head" },
      h("span", { class: "name" }, cue.name),
      h("span", { class: "meta" }, `${cue.category} · round ${cue.round} · matched to ${cue.loudness} LUFS`),
      h("span", { class: "spacer" }),
      cue.reference ? refBtn : null, ctxEl),
    h("div", { class: "desc" }, h("b", {}, "plays: "), cue.trigger, cue.brief ? h("span", {}, h("br"), h("b", {}, "brief: "), cue.brief) : null),
    h("div", { class: "cands" }, ...cue.candidates.map((c) => candTile(ci, cue, c))),
    note,
    historyBlock(ci, cue));
  return el;
}

function updateCard(ci) {
  const cue = S.cues[ci], d = dcue(cue.name), el = $(`#card-${cue.name}`);
  el.classList.toggle("is-selected", !!d.selected);
  for (const c of cue.candidates) {
    const t = $(`#t-${cue.name}-${c.id}`);
    t.classList.toggle("up", d.votes[c.id] === 1);
    t.classList.toggle("down", d.votes[c.id] === -1);
    t.classList.toggle("chosen", d.selected === c.id);
    $(".vote.upv", t).classList.toggle("on", d.votes[c.id] === 1);
    $(".vote.downv", t).classList.toggle("on", d.votes[c.id] === -1);
    const sb = $(".select-btn", t);
    sb.classList.toggle("on", d.selected === c.id);
    sb.textContent = d.selected === c.id ? "Selected ✓" : "Select";
  }
  el.querySelectorAll(".hsel").forEach((b) => { const on = d.selected === b.dataset.key; b.classList.toggle("on", on); b.textContent = on ? "Selected ✓" : "Select"; });
  if (d.selected && /^r\d/.test(d.selected)) el.querySelector(".history").open = true;
  refreshSide();
}

function markTarget(ci) {
  const cue = S.cues[ci];
  for (const c of cue.candidates) $(`#t-${cue.name}-${c.id}`).classList.toggle("target", target[cue.name] === c.id);
}

function navDot(name) {
  if (draft.cues[name]?.selected) return "selected";
  return touched(name) ? "iterate" : "";
}

function refreshSide() {
  const side = $("#side");
  side.innerHTML = "";
  side.append(h("h3", {}, `This round (${S.cues.length})`));
  S.cues.forEach((cue, ci) => side.append(h("button", { class: `navitem${ci === focus ? " focus" : ""}`, onclick: () => setFocus(ci, true) }, h("span", { class: `dot ${navDot(cue.name)}` }), cue.name)));
  if (S.done.length) {
    side.append(h("h3", {}, `Selected earlier (${S.done.length})`));
    for (const dn of S.done) {
      const re = draft.reopen[dn.name] != null;
      const pb = h("span", { class: "play", title: "Play the selected sound", onclick: (e) => { e.stopPropagation(); playRef(dn.selected.patch, dn.loudness); } }, "▶");
      side.append(h("button", {
        class: "navitem", title: re ? "Will be reopened (click to undo)" : "Click to reopen this cue for more rounds",
        onclick: () => {
          if (re) delete draft.reopen[dn.name];
          else { const why = prompt(`Reopen ${dn.name}? Optional note on what to change:`, ""); if (why == null) return; draft.reopen[dn.name] = why; }
          save(); refreshSide();
        },
      }, h("span", { class: `dot ${re ? "reopen" : "selected"}` }), dn.name + (re ? " (reopen)" : ""), pb));
    }
  }
  if (S.waiting.length) {
    side.append(h("h3", {}, `Waiting for candidates (${S.waiting.length})`));
    for (const w of S.waiting) side.append(h("div", { class: "navitem waiting" }, h("span", { class: "dot" }), w));
  }
}

function refreshChrome() {
  const n = S.cues.filter((c) => touched(c.name)).length + Object.keys(draft.reopen).length;
  const sel = S.cues.filter((c) => draft.cues[c.name]?.selected).length;
  $("#progress").textContent = `${S.cues.filter((c) => touched(c.name)).length}/${S.cues.length} reviewed · ${sel} selected`;
  const all = S.cues.every((c) => touched(c.name));
  $("#final").disabled = !all;
  $("#partial").disabled = !n || all;
  $("#partial").textContent = `Send ${n || ""}`.trim();
  $("#partial").title = `Send only the ${n} touched cue(s); untouched ones stay for next time`;
}

function setFocus(ci, scroll) {
  if (ci < 0 || ci >= S.cues.length) return;
  const prev = $(".card.focus");
  prev?.classList.remove("focus");
  focus = ci;
  const el = $(`#card-${S.cues[ci].name}`);
  el.classList.add("focus");
  if (scroll) el.scrollIntoView({ behavior: "smooth", block: "start" });
  refreshSide();
}

// render the waveforms (seed 0) for one card; tiles share a time scale
async function drawCard(ci) {
  const cue = S.cues[ci];
  const rs = await Promise.all(cue.candidates.map((c) => render(c.patch, c.patch, cue.loudness, 0).catch((e) => ({ error: e }))));
  const msMax = Math.max(100, ...rs.filter((r) => !r.error).map((r) => r.buffer.duration * 1000));
  cue.candidates.forEach((c, i) => {
    const tile = $(`#t-${cue.name}-${c.id}`), st = $(".status", tile), r = rs[i];
    tile._msMax = msMax;
    if (r.error) { st.className = "status err"; st.textContent = "render failed: " + r.error.message; return; }
    st.remove();
    const box = $(".wavebox", tile);
    drawWave($("canvas", tile), r.result.channels, r.result.sampleRate, { w: box.clientWidth, h: 56, msMax });
    $(".dur", tile).textContent = `${Math.round(r.buffer.duration * 1000)} ms`;
  });
}

async function finish(mode) {
  clearTimeout(saveT);
  await fetch("/api/finish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, draft }) });
  $("#done-msg").textContent = mode === "cancel" ? "Cancelled — nothing sent (your ratings are kept for next time)." : "Sent. The next round is on its way.";
  $("#done-overlay").hidden = false;
}

// ---------- keys ----------
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "range") {
    if (e.key === "Escape") e.target.blur();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const cue = S.cues[focus];
  if (!$("#help").hidden && (e.key === "Escape" || e.key === "?")) { $("#help").hidden = true; return; }
  const tid = cue && (target[cue.name] ?? null);
  const d = cue && dcue(cue.name);
  const needTarget = () => { if (!tid) toast("play a candidate first (1/2/3)"); return !!tid; };
  switch (e.key) {
    case "j": case "ArrowDown": setFocus(focus + 1, true); break;
    case "k": case "ArrowUp": setFocus(focus - 1, true); break;
    case "1": case "2": case "3": { const c = cue?.candidates[Number(e.key) - 1]; if (c) playCand(focus, c.id); break; }
    case " ": if (tid) playCand(focus, tid); else if (cue) playCand(focus, cue.candidates[0].id); break;
    case "0": if (cue) playRef(cue.reference, cue.loudness); break;
    case "x": if (cue?.contexts.length) playContext(focus, $(`#ctx-${cue.name}`)._sel.value); else toast("no game sequence for this cue"); break;
    case "=": case "+": if (needTarget()) { d.votes[tid] = d.votes[tid] === 1 ? 0 : 1; save(); updateCard(focus); } break;
    case "-": if (needTarget()) { d.votes[tid] = d.votes[tid] === -1 ? 0 : -1; save(); updateCard(focus); } break;
    case "s": if (needTarget()) { d.selected = d.selected === tid ? null : tid; save(); updateCard(focus); } break;
    case "c": if (needTarget()) { $(`#t-${cue.name}-${tid} textarea`).focus(); } break;
    case "n": if (cue) $(`#card-${cue.name} .cuenote`).focus(); break;
    case "v": $("#vary").checked = !$("#vary").checked; toast(`vary ${vary() ? "on: each play is a random variation" : "off"}`, 1400); break;
    case "?": $("#help").hidden = !$("#help").hidden; break;
    default: return;
  }
  e.preventDefault();
});

// ---------- boot ----------
async function boot() {
  S = await (await fetch("/api/session")).json();
  if (S.draft) draft = { cues: {}, reopen: {}, ...S.draft };
  document.title = S.title;
  $("#title").textContent = S.title;
  $("#about").textContent = S.about + (S.palette ? `\n\nSonic palette: ${S.palette}` : "");
  $("#about").style.whiteSpace = "pre-wrap";
  $("#about-btn").onclick = () => ($("#about").hidden = !$("#about").hidden);
  $("#help-btn").onclick = () => ($("#help").hidden = false);
  $("#help-close").onclick = () => ($("#help").hidden = true);
  $("#volume").oninput = (e) => master && (master.gain.value = Number(e.target.value));
  $("#cancel").onclick = () => confirm("Cancel this review? Nothing is sent; your ratings stay saved as a draft.") && finish("cancel");
  $("#partial").onclick = () => finish("partial");
  $("#final").onclick = () => finish("final");
  const cards = $("#cards");
  if (!S.cues.length) cards.append(h("div", { class: "empty" }, "No new candidates this time. Selected sounds are in the sidebar (click to reopen)."));
  S.cues.forEach((cue, ci) => { cards.append(card(ci, cue)); updateCard(ci); });
  document.querySelectorAll("textarea").forEach(autosize);
  refreshChrome();
  if (S.cues.length) setFocus(0, false);
  // presence: the CLI cancels if this page stays closed
  new EventSource("/api/presence");
  // render cards top-down, the rest lazily
  for (let ci = 0; ci < S.cues.length; ci++) await drawCard(ci);
}
boot().catch((e) => { document.body.prepend(h("pre", { class: "empty" }, "failed to load: " + e.stack)); });
