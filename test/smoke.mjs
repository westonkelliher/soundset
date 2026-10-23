// smoke.mjs — end-to-end check: analysis math, every example renders, and the demo project's full loop
// (check → look → review partial/cancel → reopen → bake → in-game player). Run: npm test
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { analyze } from "../web/engine/analysis.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "soundset");
let fails = 0;
const ok = (cond, what) => { console.log(`${cond ? "✓" : "✗"} ${what}`); if (!cond) fails++; };
const run = (args, cwd) => execFileSync(BIN, args, { cwd, encoding: "utf8", env: { ...process.env, NO_BROWSER: "1" } });

// 1. analysis: pitch + loudness on synthetic tones
const sr = 48000;
const tone = (f, kind = "sine") => Float32Array.from({ length: sr * 0.3 }, (_, i) => {
  const ph = (i * f / sr) % 1;
  return (kind === "square" ? (ph < 0.5 ? 1 : -1) : Math.sin(2 * Math.PI * ph)) * Math.exp(-i / sr / 0.2) * 0.5;
});
for (const [f, k, name] of [[440, "sine", "A4"], [988, "square", "B5"], [55, "sine", "A1"]]) {
  const m = analyze([tone(f, k)], sr);
  ok(m.pitch?.note?.name === name, `pitch ${k} ${f} Hz -> ${m.pitch?.note?.name}`);
}
const full = Float32Array.from({ length: sr }, (_, i) => Math.sin(2 * Math.PI * 997 * i / sr));
ok(Math.abs(analyze([full], sr).lufsI - -3.0) < 0.3, "1 kHz full-scale sine ≈ -3 LUFS");

// 2. examples render
const ex = fs.readdirSync(path.join(ROOT, "examples")).filter((f) => f.endsWith(".json")).map((f) => path.join("examples", f));
const out = run(["analyze", ...ex, "--png", path.join(os.tmpdir(), "soundset-smoke.png")], ROOT);
ok(!out.includes("ERROR"), `${ex.length} examples render`);
const wav = path.join(os.tmpdir(), "soundset-smoke.wav");
ok(/^-30LUFS/m.test(run(["render", "examples/ui_tick.json", "-o", wav, "--loudness", "-30"], ROOT)), "cli: negative flag values (--loudness -30)");

// init scaffolds without clobbering an existing .gitignore
const fresh = fs.mkdtempSync(path.join(os.tmpdir(), "soundset-init-"));
fs.writeFileSync(path.join(fresh, ".gitignore"), "node_modules\n");
ok(run(["init"], fresh).includes("next:") && fs.readFileSync(path.join(fresh, ".gitignore"), "utf8") === "node_modules\n.soundset/\n", "init: scaffold + keeps .gitignore");
ok(run(["check"], fresh).includes("nothing to check") && run(["status"], fresh).includes("next: write candidates for example"), "fresh project: check/status say what's next");
fs.rmSync(fresh, { recursive: true, force: true });

// 3. demo project loop, on a copy
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "soundset-smoke-"));
fs.cpSync(path.join(ROOT, "examples", "demo"), tmp, { recursive: true });
ok(run(["check"], tmp).split("\n").filter((l) => /^[✓⚠] patches/.test(l)).length === 6, "demo: check renders 6 candidates");
ok(run(["look", "hit"], tmp).includes("sheet:"), "demo: look writes a sheet");
ok(run(["status"], tmp).includes("next: `soundset review` (2 cue(s)"), "status: next step is review");

async function reviewWith(drive) {
  const p = spawn(BIN, ["review", "--title", "smoke", "--about", "test"], { cwd: tmp, env: { ...process.env, NO_BROWSER: "1" } });
  let stdout = "", url = null;
  p.stdout.on("data", (d) => (stdout += d));
  await new Promise((res) => p.stderr.on("data", (d) => { const m = /http:\S+/.exec(String(d)); if (m) { url = m[0]; res(); } }));
  const b = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await b.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.waitForSelector(".cand canvas");
  await page.waitForTimeout(800);
  await drive(page);
  await new Promise((res) => p.on("exit", res));
  await b.close();
  ok(!errors.length, `review page: no page errors ${errors.join("; ")}`);
  return stdout;
}

let rep = await reviewWith(async (pg) => {
  await pg.keyboard.press("2");
  await pg.keyboard.press("=");
  await pg.click("#t-hit-B textarea"); await pg.keyboard.type("shorter tail"); await pg.keyboard.press("Escape");
  await pg.click("#partial");
});
ok(/PARTIAL/.test(rep) && /ITERATE\s+hit r1: B 👍 "shorter tail"/.test(rep) && /UNTOUCHED coin/.test(rep), "review: partial send records hit, leaves coin");
ok(run(["status"], tmp).includes("needs-candidates"), "status: hit needs round 2");

rep = await reviewWith(async (pg) => { await pg.click("#t-coin-A .select-btn"); await pg.click("#cancel"); });
ok(/CANCELLED/.test(rep) && fs.existsSync(path.join(tmp, ".soundset", "draft.json")), "review: cancel records nothing, keeps draft");

// round 2 for hit (copies of r1), then select an earlier round's candidate from the history list
for (const id of "ABC") fs.copyFileSync(path.join(tmp, "patches/hit", `r1${id}.json`), path.join(tmp, "patches/hit", `r2${id}.json`));
rep = await reviewWith(async (pg) => {
  ok(await pg.$eval("#t-coin-A .select-btn", (e) => e.classList.contains("on")), "review: draft restored after cancel");
  await pg.click("#card-hit details.history summary");
  await pg.click('#card-hit .hsel[data-key="r1B"]');
  await pg.click("#final");
});
ok(/FINAL/.test(rep) && /SELECTED\s+coin r1A/.test(rep), "review: finalize selects coin A");
ok(/SELECTED\s+hit r1B \(from an earlier round\)/.test(rep), "review: select a candidate from an earlier round");

const bake = run(["bake"], tmp);
const files = fs.readdirSync(path.join(tmp, "out"));
ok(files.includes("manifest.json") && files.includes("soundset-player.js") && files.filter((f) => f.endsWith(".ogg")).length >= 1, `bake: ${files.length} files`);
ok(bake.includes("hit") && bake.includes("r1B"), "bake: earlier-round selection baked");
ok(run(["status"], tmp).includes("all selected and baked"), "status: nothing left after bake");
ok(run(["reopen", "coin", "--note", "smoke"], tmp).includes("reopened") && run(["status"], tmp).includes("coin               needs-candidates"), "reopen: coin back to needs-candidates");

// `soundset demo` serves a throwaway copy; cancel it over the API
{
  const p = spawn(BIN, ["demo"], { env: { ...process.env, NO_BROWSER: "1" } });
  let stdout = "", err = "";
  p.stdout.on("data", (d) => (stdout += d));
  const url = await new Promise((res) => p.stderr.on("data", (d) => { err += d; const m = /http:\S+/.exec(err); if (m) res(m[0]); }));
  await fetch(new URL("/api/finish", url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "cancel" }) });
  await new Promise((res) => p.on("exit", res));
  ok(/CANCELLED/.test(stdout) && /soundset-demo-/.test(err), "demo: review on a temp copy");
}

// 4. the in-game player plays the baked files
fs.writeFileSync(path.join(tmp, "out", "t.html"), `<script type="module">import {createPlayer} from "./soundset-player.js";
const p = await createPlayer({base: "./"}); document.title = JSON.stringify([p.has("coin"), p.play("coin"), p.play("nope")]);</script>`);
const srv = spawn("python3", ["-m", "http.server", "8977", "--bind", "127.0.0.1"], { cwd: path.join(tmp, "out"), stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] }).catch(() => chromium.launch({ headless: true }));
const pg = await b.newPage();
await pg.goto("http://127.0.0.1:8977/t.html");
await pg.waitForFunction(() => document.title.startsWith("["), null, { timeout: 5000 }).catch(() => {});
ok((await pg.title()) === "[true,true,false]", `player: ${await pg.title()}`);
await b.close(); srv.kill();

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
