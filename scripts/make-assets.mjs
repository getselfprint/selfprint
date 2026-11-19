// Generate brand + SEO assets (logo, favicons, PWA icons, og image) by
// rasterizing on-brand HTML/SVG with the system Chrome (no native image libs,
// which keeps it working where native .node addons are blocked). The favicon
// .ico is assembled in pure JS from PNG frames.
//
//   node scripts/make-assets.mjs
//
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => join(root, ...s);
mkdirSync(p("docs", "brand"), { recursive: true });

const INK = "#1E1A15";
const UMBER = "#6F5433";
const SAND = "#FAF7F1";
const DOT = "#E9DFCE";
const MUTED = "#554B3F";

const b64 = (f) => readFileSync(f).toString("base64");
const grotesk = b64(p("site", "fonts", "space-grotesk-500.woff2"));
const mono = b64(p("site", "fonts", "ibm-plex-mono-500.woff2"));
const FONTS = `
@font-face{font-family:'Space Grotesk';src:url(data:font/woff2;base64,${grotesk}) format('woff2');font-weight:500}
@font-face{font-family:'IBM Plex Mono';src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:500}`;

/** The Selfprint mark: concentric rings with a filled core. */
function mark(strokeW = 1.5) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${UMBER}" stroke-width="${strokeW}" width="100%" height="100%">
    <circle cx="12" cy="12" r="10.5"/><circle cx="12" cy="12" r="6.5"/>
    <circle cx="12" cy="12" r="2.5" fill="${UMBER}" stroke="none"/></svg>`;
}

function iconHtml(size, { bg, pad, strokeW }) {
  return `<!doctype html><meta charset="utf-8"><style>*{margin:0}
  .box{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${bg ? `background:${bg};` : ""}}
  .m{width:${100 - pad * 2}%;height:${100 - pad * 2}%}</style>
  <div class="box"><div class="m">${mark(strokeW)}</div></div>`;
}

function ogHtml() {
  return `<!doctype html><meta charset="utf-8"><style>${FONTS}
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:${SAND};
    background-image:radial-gradient(${DOT} 1.5px,transparent 1.5px);background-size:34px 34px;
    font-family:'Space Grotesk',sans-serif;color:${INK}}
  .pad{padding:88px;height:100%;display:flex;flex-direction:column;justify-content:center}
  .row{display:flex;align-items:center;gap:22px}
  .mark{width:66px;height:66px}
  .brand{font-size:42px;font-weight:500}
  h1{font-size:78px;line-height:1.04;letter-spacing:-0.02em;margin:40px 0 30px;max-width:15ch}
  .url{font-family:'IBM Plex Mono',monospace;font-size:25px;color:${MUTED};letter-spacing:0.04em}</style>
  <div class="pad">
    <div class="row"><div class="mark">${mark(1.5)}</div><div class="brand">Selfprint</div></div>
    <h1>An AI that answers the way you would.</h1>
    <div class="url">selfprint.org</div>
  </div>`;
}

function logoHtml() {
  return `<!doctype html><meta charset="utf-8"><style>${FONTS}
  *{margin:0}body{width:440px;height:112px}
  .row{width:440px;height:112px;display:flex;align-items:center;gap:20px;padding:0 8px}
  .mark{width:72px;height:72px;flex:0 0 auto}
  .word{font-family:'Space Grotesk',sans-serif;font-weight:500;font-size:64px;color:${INK};letter-spacing:-0.01em}</style>
  <div class="row"><div class="mark">${mark(1.4)}</div><div class="word">Selfprint</div></div>`;
}

/** Assemble an .ico from PNG frames (ICO supports embedded PNG). */
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const entries = Buffer.alloc(16 * frames.length);
  let offset = 6 + 16 * frames.length;
  const datas = [];
  frames.forEach((f, i) => {
    const e = entries.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(f.size >= 256 ? 0 : f.size, 0);
    e.writeUInt8(f.size >= 256 ? 0 : f.size, 1);
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(f.buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += f.buf.length;
    datas.push(f.buf);
  });
  return Buffer.concat([header, entries, ...datas]);
}

const run = async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();

  async function png(html, w, h, transparent) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html, { waitUntil: "networkidle" });
    return page.screenshot({
      clip: { x: 0, y: 0, width: w, height: h },
      omitBackground: !!transparent,
    });
  }

  // App / PWA icons (solid sand fill, generous safe zone for maskable)
  const icon512 = await png(iconHtml(512, { bg: SAND, pad: 20, strokeW: 1.3 }), 512, 512, false);
  const icon192 = await png(iconHtml(192, { bg: SAND, pad: 20, strokeW: 1.4 }), 192, 192, false);
  const apple = await png(iconHtml(180, { bg: SAND, pad: 16, strokeW: 1.4 }), 180, 180, false);
  writeFileSync(p("public", "icon-512.png"), icon512);
  writeFileSync(p("public", "icon-192.png"), icon192);
  writeFileSync(p("public", "apple-touch-icon.png"), apple);
  writeFileSync(p("site", "apple-touch-icon.png"), apple);

  // Favicon frames (transparent, bolder stroke so it reads at 16px)
  const frames = [];
  for (const size of [16, 32, 48]) {
    const buf = await png(iconHtml(size, { bg: null, pad: 8, strokeW: 1.8 }), size, size, true);
    frames.push({ size, buf });
  }
  const ico = buildIco(frames);
  writeFileSync(p("site", "favicon.ico"), ico);
  writeFileSync(p("public", "favicon.ico"), ico);

  // Social share image
  const og = await png(ogHtml(), 1200, 630, false);
  writeFileSync(p("site", "og.png"), og);

  // Brand logo (mark + wordmark)
  const logo = await png(logoHtml(), 440, 112, true);
  writeFileSync(p("docs", "brand", "logo.png"), logo);

  await browser.close();

  // Scalable SVGs (no rasterization needed)
  const circles = `<circle cx="12" cy="12" r="10.5"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.5" fill="${UMBER}" stroke="none"/>`;
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${UMBER}" stroke-width="1.6">${circles}</svg>\n`;
  writeFileSync(p("site", "favicon.svg"), faviconSvg);
  writeFileSync(p("public", "favicon.svg"), faviconSvg);

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 112" width="440" height="112"><defs><style>@font-face{font-family:'Space Grotesk';src:url(data:font/woff2;base64,${grotesk}) format('woff2');font-weight:500}</style></defs><g transform="translate(8,20) scale(3)" fill="none" stroke="${UMBER}" stroke-width="1.4">${circles}</g><text x="100" y="74" font-family="Space Grotesk, system-ui, sans-serif" font-weight="500" font-size="64" fill="${INK}">Selfprint</text></svg>\n`;
  writeFileSync(p("docs", "brand", "logo.svg"), logoSvg);
  console.log("assets written: icon-192/512, apple-touch, favicon.ico, og.png, logo.png");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
