// Screenshot the public landing (and prose) from the site/ folder.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = join(process.cwd(), "site");
const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    if (p === "/privacy") p = "/privacy.html";
    if (p === "/terms") p = "/terms.html";
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

const run = async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const base = `http://localhost:${port}`;
  const b = await chromium.launch({ channel: "chrome", headless: true });

  const wide = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await wide.goto(`${base}/`, { waitUntil: "networkidle" });
  await wide.screenshot({ path: "docs/brand/shot-landing-wide.png" });

  const narrow = await b.newPage({ viewport: { width: 390, height: 844 } });
  await narrow.goto(`${base}/`, { waitUntil: "networkidle" });
  await narrow.screenshot({ path: "docs/brand/shot-landing-narrow.png", fullPage: true });

  const prose = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await prose.goto(`${base}/privacy`, { waitUntil: "networkidle" });
  await prose.screenshot({ path: "docs/brand/shot-landing-prose.png" });

  await b.close();
  server.close();
  console.log("shots written: landing-wide, landing-narrow, landing-prose");
};
run().catch((e) => { console.error(e); process.exit(1); });
