// headless.js — drives web/headless/ in headless Chrome (the same Blink audio engine the review page uses).
import { chromium } from "playwright-core";
import { startServer } from "./server.js";

export async function withHeadless(projectDir, fn) {
  const srv = await startServer({ projectDir });
  let browser;
  try {
    try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
    catch { browser = await chromium.launch({ headless: true }); }
    const page = await browser.newPage({ viewport: { width: 924, height: 400 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${srv.port}/headless/index.html`);
    await page.waitForFunction(() => window.ssReady === true, null, { timeout: 15000 }).catch(() => {
      throw new Error("headless page failed to load: " + errors.join("\n"));
    });
    const h = {
      render: (ref, opts) => page.evaluate(([r, o]) => window.ss.render(r, o), [ref, opts]),
      async sheet(items, pngPath) {
        const out = await page.evaluate((it) => window.ss.sheet(it), items);
        if (pngPath) await page.locator("#sheet").screenshot({ path: pngPath });
        return out;
      },
    };
    return await fn(h);
  } finally {
    await browser?.close();
    srv.close();
  }
}
