// library.js — CC0 sample library: fetch Kenney audio packs, index by tags, search.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { LIB } from "./server.js";

// all CC0 (https://kenney.nl/support): the zip URL carries a hash, so it is scraped from each asset page
const KENNEY = ["impact-sounds", "interface-sounds", "ui-audio", "rpg-audio", "casino-audio", "digital-audio", "sci-fi-sounds", "music-jingles"];
const AUDIO = /\.(ogg|wav|mp3|flac)$/i;
const indexPath = () => path.join(LIB, "index.json");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() || (e.isSymbolicLink() && fs.statSync(f).isDirectory())) walk(f, out);
    else if (AUDIO.test(e.name) && !/^preview\./i.test(e.name)) out.push(f);
  }
  return out;
}

// "impactMetal_heavy_003.ogg" -> ["impact", "metal", "heavy"]
const words = (s) => s.replace(/\.[a-z0-9]+$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^A-Za-z]+/).map((w) => w.toLowerCase()).filter((w) => w.length > 1);

function durations(files) {
  const out = {};
  for (const f of files) {
    try { out[f] = Math.round(Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim()) * 1000); }
    catch { out[f] = null; }
  }
  return out;
}

function reindex() {
  const files = walk(LIB);
  const prev = fs.existsSync(indexPath()) ? Object.fromEntries(JSON.parse(fs.readFileSync(indexPath(), "utf8")).map((e) => [e.src, e])) : {};
  const todo = files.filter((f) => !prev["lib:" + path.relative(LIB, f)]);
  const dur = durations(todo);
  const index = files.map((f) => {
    const rel = path.relative(LIB, f), src = "lib:" + rel;
    if (prev[src]) return prev[src];
    const pack = rel.split(path.sep)[0];
    return { src, pack, tags: [...new Set([...words(path.basename(f)), ...rel.split(path.sep).slice(0, -1).flatMap(words)])].filter((w) => !["kenney", "audio", "ogg", "wav"].includes(w)), ms: dur[f] };
  });
  fs.writeFileSync(indexPath(), JSON.stringify(index));
  return index;
}

export async function lib(a) {
  const sub = a._[0];
  fs.mkdirSync(LIB, { recursive: true });
  if (sub === "fetch") {
    for (const name of KENNEY) {
      const dir = path.join(LIB, `kenney_${name}`);
      if (fs.existsSync(dir)) { console.log(`have  ${name}`); continue; }
      const page = await (await fetch(`https://kenney.nl/assets/${name}`)).text();
      const url = page.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"]+\.zip/)?.[0];
      if (!url) { console.log(`skip  ${name} (no download link found)`); continue; }
      const zip = path.join(LIB, `${name}.zip`);
      fs.writeFileSync(zip, Buffer.from(await (await fetch(url)).arrayBuffer()));
      fs.mkdirSync(dir);
      execFileSync("unzip", ["-q", "-o", zip, "-d", dir]);
      fs.rmSync(zip);
      console.log(`got   ${name}`);
    }
    const idx = reindex();
    console.log(`${idx.length} samples indexed in ${indexPath()}`);
    return;
  }
  if (sub === "add") {
    const src = path.resolve(a._[1]), name = a.name || path.basename(src);
    const link = path.join(LIB, name);
    if (!fs.existsSync(link)) fs.symlinkSync(src, link);
    console.log(`${reindex().filter((e) => e.pack === name).length} samples indexed from ${src} as lib:${name}/...`);
    return;
  }
  if (sub === "search" || sub === "list") {
    if (!fs.existsSync(indexPath())) throw new Error("library is empty: run `soundset lib fetch`");
    const idx = JSON.parse(fs.readFileSync(indexPath(), "utf8"));
    const q = a._.slice(1).map((w) => w.toLowerCase());
    const hits = idx.filter((e) => q.every((w) => e.tags.some((t) => t.startsWith(w)) || e.src.toLowerCase().includes(w)));
    // collapse numbered variations (_000.._004) into one line
    const groups = new Map();
    for (const e of hits) {
      const key = e.src.replace(/[_-]?\d+(\.[a-z0-9]+)$/i, "*$1");
      const g = groups.get(key) || { key, n: 0, ms: [], first: e.src };
      g.n++; if (e.ms) g.ms.push(e.ms);
      groups.set(key, g);
    }
    const list = [...groups.values()];
    for (const g of list.slice(0, Number(a.limit ?? 60))) console.log(`${g.first}${g.n > 1 ? `   (+${g.n - 1} variations: ${g.key})` : ""}   ${g.ms.length ? Math.min(...g.ms) + (g.ms.length > 1 ? "-" + Math.max(...g.ms) : "") + "ms" : ""}`);
    console.log(`\n${hits.length} samples in ${list.length} groups${list.length > Number(a.limit ?? 60) ? ` (showing ${a.limit ?? 60}; --limit N)` : ""}. Use as {"type":"sample","src":"<path>"}; preview with \`soundset analyze\`.`);
    return;
  }
  throw new Error("usage: soundset lib fetch | search <words...> | add <dir> [--name N]");
}
