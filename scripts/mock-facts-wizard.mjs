// Render an on-brand storyboard of the "one question at a time" Facts flow.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const b64 = (f) => readFileSync(join(root, "site", "fonts", f)).toString("base64");
const FONTS = `
@font-face{font-family:'Space Grotesk';src:url(data:font/woff2;base64,${b64("space-grotesk-500.woff2")}) format('woff2');font-weight:500}
@font-face{font-family:'Inter';src:url(data:font/woff2;base64,${b64("inter-400.woff2")}) format('woff2');font-weight:400}
@font-face{font-family:'Inter';src:url(data:font/woff2;base64,${b64("inter-500.woff2")}) format('woff2');font-weight:500}
@font-face{font-family:'IBM Plex Mono';src:url(data:font/woff2;base64,${b64("ibm-plex-mono-500.woff2")}) format('woff2');font-weight:500}`;

const dots = (n) =>
  Array.from({ length: 9 }, (_, i) =>
    `<span class="dot${i < n ? " on" : ""}"></span>`,
  ).join("");

const card = (step, caption, question, body) => `
<div class="cap mono">${caption}</div>
<div class="card">
  <div class="top"><span class="mono">Facts · ${step} of 9</span><div class="dots">${dots(step)}</div></div>
  <h2>${question}</h2>
  <div class="body">${body}</div>
  <div class="actions">
    <span class="btn ghost">← Back</span>
    <span class="spacer"></span>
    <span class="btn ghost">Skip</span>
    <span class="btn primary">Next →</span>
  </div>
</div>`;

const chips = (...items) =>
  `<div class="chips">${items
    .map((t) => `<span class="chip">${t} <span class="x">✕</span></span>`)
    .join("")}<span class="add">+ add</span></div>`;

const seg = `<div class="seg"><div class="box">1</div><div class="box">9</div><div class="box">9</div><div class="box">4</div><input class="inp" style="width:150px;margin-left:8px" placeholder="where"></div>`;

const html = `<!doctype html><meta charset="utf-8"><style>${FONTS}
:root{--ink:#1E1A15;--muted:#554B3F;--s50:#FAF7F1;--s200:#E9DFCE;--s300:#D8CAB2;--accent:#6F5433}
*{box-sizing:border-box;margin:0}
body{background:#fff;color:var(--ink);font-family:Inter,sans-serif;padding:44px 56px;width:820px}
.mono{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cap{margin:26px 0 10px;color:var(--accent)}
.cap:first-child{margin-top:0}
.card{border:1px solid var(--s300);border-radius:20px;padding:40px 44px;background:#fff}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}
.dots{display:flex;gap:7px}
.dot{width:8px;height:8px;border-radius:999px;background:var(--s300)}
.dot.on{background:var(--accent)}
h2{font-family:'Space Grotesk',sans-serif;font-weight:500;font-size:32px;letter-spacing:-.01em;line-height:1.15;margin-bottom:24px}
.inp{border:1px solid var(--s300);border-radius:12px;padding:13px 16px;font-family:Inter;font-size:17px;color:var(--ink);background:#fff}
.seg{display:flex;gap:8px;align-items:center}
.box{width:48px;height:52px;border:1px solid var(--s300);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:24px}
.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--s300);background:var(--s50);border-radius:999px;padding:8px 15px;font-size:15px}
.chip .x{color:var(--muted);font-size:12px}
.add{border:1px dashed var(--s300);border-radius:999px;padding:8px 15px;font-size:15px;color:var(--accent)}
.actions{display:flex;align-items:center;gap:12px;margin-top:34px}
.spacer{flex:1}
.btn{min-height:46px;padding:0 22px;border-radius:999px;display:inline-flex;align-items:center;font-weight:500;font-size:15px}
.primary{background:var(--ink);color:#fff}
.ghost{color:var(--muted)}
</style>
${card(1, "First question", "What should I call you?", `<input class="inp" style="width:260px" value="Alex">`)}
${card(2, "→ Next, the input fits the question", "When and where were you born?", seg)}
${card(3, "→ And lists become chips", "What languages do you speak?", chips("English", "Portuguese"))}`;

const run = async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = await b.newPage({ viewport: { width: 820, height: 900 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(root, "docs", "brand", "mock-facts-wizard.png"), fullPage: true });
  await b.close();
  console.log("mock written: docs/brand/mock-facts-wizard.png");
};
run().catch((e) => { console.error(e); process.exit(1); });
