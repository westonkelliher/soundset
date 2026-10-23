// server.js — loopback HTTP server: static web/, /lib (sample library), /proj (project files), /api (review session).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WEB = path.join(ROOT, "web");
export const LIB = process.env.SOUNDSET_LIB || path.join(ROOT, "library");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac", ".png": "image/png", ".svg": "image/svg+xml" };

function serveFile(res, base, rel) {
  const f = path.resolve(base, "." + path.sep + decodeURIComponent(rel));
  const b = path.resolve(base);
  if (!f.startsWith(b === "/" ? b : b + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(f).pipe(res);
}

const body = (req) => new Promise((ok, bad) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });

// api: { [route]: async (reqBody, req) => json } ; presence: called with live connection count
export function startServer({ projectDir = null, api = {}, onPresence = null, port = 0 } = {}) {
  let live = 0;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const p = url.pathname;
    try {
      if (p.startsWith("/api/")) {
        // only our own page may call the api (loopback + same origin)
        const origin = req.headers.origin;
        if (origin && origin !== `http://${req.headers.host}`) { res.writeHead(403); return res.end(); }
        if (p === "/api/presence") {
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
          res.write(": hi\n\n");
          live++; onPresence?.(live);
          const ka = setInterval(() => res.write(": ka\n\n"), 15000);
          req.on("close", () => { clearInterval(ka); live--; onPresence?.(live); });
          return;
        }
        const h = api[p.slice(5)];
        if (!h) { res.writeHead(404); return res.end("no such api"); }
        const out = await h(req.method === "POST" ? await body(req) : Object.fromEntries(url.searchParams), req);
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        return res.end(JSON.stringify(out ?? {}));
      }
      if (p.startsWith("/lib/")) return serveFile(res, LIB, p.slice(5));
      if (p.startsWith("/proj/") && projectDir) return serveFile(res, projectDir, p.slice(6));
      // `soundset analyze some/file.ogg` only
      if (p.startsWith("/abs/") && process.env.SOUNDSET_ABS) return serveFile(res, "/", p.slice(5));
      if (p === "/") { res.writeHead(302, { location: "/review/" + url.search }); return res.end(); }
      return serveFile(res, WEB, p.endsWith("/") ? p.slice(1) + "index.html" : p.slice(1));
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(e.stack || e));
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({ server, port: server.address().port, close: () => server.close() })));
}
