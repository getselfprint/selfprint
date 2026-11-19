// Local static server for the combined build: the public site at "/" and the
// SPA under "/app". Mirrors what a static host (or rewrite rules) should do in
// production. See docs/public-site.md. Dev uses `vite` instead.
//
//   node scripts/serve.mjs [port]
//
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const PORT = Number(process.argv[2] ?? 4318);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

// Clean-URL rewrites for the public pages.
const CLEAN = {
  "/": "/index.html",
  "/privacy": "/privacy.html",
  "/privacy/": "/privacy.html",
  "/terms": "/terms.html",
  "/terms/": "/terms.html",
};

function resolve(urlPath) {
  if (CLEAN[urlPath]) return join(dist, CLEAN[urlPath]);

  const candidate = join(dist, urlPath);
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  // SPA history fallback: anything under /app with no matching file.
  if (urlPath === "/app" || urlPath.startsWith("/app/")) {
    return join(dist, "app", "index.html");
  }
  return null;
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const file = resolve(urlPath);
  if (!file || !existsSync(file)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving dist/ (site at / , app at /app) on http://localhost:${PORT}`);
});
