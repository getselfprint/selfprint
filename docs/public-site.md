# Public site & deployment model (§16, §17)

The site is split in two, as the spec requires:

- **Public site** — the pre-rendered static HTML in [`/site`](../site):
  `index.html` (landing), `privacy.html`, `terms.html`, plus `robots.txt`,
  `sitemap.xml`, and `llms.txt`. All content is in the HTML on first load; no
  JavaScript is required to read it. Each page has one `<h1>`, semantic
  elements, a unique `<title>` + meta description, a canonical URL, and Open
  Graph / Twitter tags. The landing carries `SoftwareApplication` JSON-LD.
- **The app** — the Vite SPA (this build's `dist/`), mounted under `/app` and
  marked `noindex`.

## How the build produces this

`npm run build` does three things:

1. `node scripts/clean.mjs` — wipes `dist/` (the SPA builds into a subdir, so a
   stale clean is needed).
2. `vite build` — the SPA is built with `base: "/app/"` into **`dist/app/`**, so
   its assets, service worker, and manifest are all scoped under `/app/` and
   leave `/` untouched.
3. `node scripts/build-site.mjs` — copies the `site/` pages + `robots.txt` /
   `sitemap.xml` / `llms.txt` into **`dist/` root**.

Result: `dist/index.html` (landing), `dist/privacy.html`, `dist/terms.html`, the
root SEO files, and `dist/app/` (the SPA).

## Serving (local + production)

`npm run serve` (`scripts/serve.mjs`) serves `dist/` at one origin with exactly
the rewrites a production static host must replicate:

| Path | Served from |
|------|-------------|
| `/` | `dist/index.html` (landing) |
| `/privacy`, `/terms` | `dist/privacy.html` / `dist/terms.html` (clean URLs) |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | `dist/` root files |
| `/app/assets/*`, `/app/sw.js`, … | `dist/app/*` (real files) |
| `/app`, `/app/*` (no file) | `dist/app/index.html` (SPA history fallback) |

Verified end-to-end: `/` serves the landing, `/privacy` + `/terms` resolve, the
SPA boots under `/app` (React renders the passphrase screen), `robots.txt`
disallows `/app`, and `/app` carries `noindex`.

On a production host, reproduce this with rewrite rules (most static hosts have a
simple config for it) and set the **Content-Security-Policy as an HTTP header**
(the policy is documented in the app's `index.html` and on the privacy page; a
strict meta CSP breaks Vite dev HMR, so it is intentionally not inlined).

> `npm run dev` serves only the app (at `/app/`); use `npm run build && npm run
> serve` to review the whole combined site.
