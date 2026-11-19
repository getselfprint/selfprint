// Render a static, on-brand mockup of the proposed interactive Facts card.
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

const html = `<!doctype html><meta charset="utf-8"><style>${FONTS}
:root{--ink:#1E1A15;--muted:#554B3F;--s50:#FAF7F1;--s100:#F4EEE3;--s200:#E9DFCE;--s300:#D8CAB2;--accent:#6F5433}
*{box-sizing:border-box;margin:0}
body{background:#fff;color:var(--ink);font-family:Inter,sans-serif;padding:48px 56px;width:860px}
.mono{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
h1{font-family:'Space Grotesk',sans-serif;font-weight:500;font-size:40px;letter-spacing:-.02em;margin:10px 0 10px}
.lede{color:var(--muted);font-size:15px;max-width:60ch;margin-bottom:28px}
label{display:block}
.lbl{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.inp{border:1px solid var(--s300);border-radius:10px;padding:11px 14px;font-family:Inter;font-size:16px;color:var(--ink);background:#fff}
.row{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end;margin-bottom:22px}
.field{display:flex;flex-direction:column}
.seg{display:flex;gap:8px}
.box{width:46px;height:48px;border:1px solid var(--s300);border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:22px}
.box.empty{color:#bbae97}
.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--s300);background:var(--s50);border-radius:999px;padding:7px 14px;font-size:14px}
.chip .x{color:var(--muted);font-size:12px}
.add{display:inline-flex;align-items:center;gap:6px;border:1px dashed var(--s300);background:#fff;border-radius:999px;padding:7px 14px;font-size:14px;color:var(--accent)}
.sep{border:0;border-top:1px solid var(--s200);margin:28px 0 22px}
.more .mono{color:var(--accent)}
textarea.inp{width:100%;resize:none;height:64px}
.actions{display:flex;gap:12px;margin-top:30px}
.btn{min-height:48px;padding:0 24px;border-radius:999px;display:inline-flex;align-items:center;font-weight:500;font-size:15px}
.primary{background:var(--ink);color:#fff}
.ghost{color:var(--muted)}
</style>
<div class="mono">FIG. 01 · FACTS</div>
<h1>The basics</h1>
<div class="lede">A few stable facts, as much or as little as you like. No AI touches this; it stays on your device. Every field is optional.</div>

<div class="row">
  <div class="field"><span class="lbl">Name</span><input class="inp" style="width:200px" value="Alex"></div>
  <div class="field"><span class="lbl">Born</span>
    <div class="seg"><div class="box">1</div><div class="box">9</div><div class="box">9</div><div class="box">4</div>
      <input class="inp" style="width:150px;margin-left:8px" placeholder="where"></div>
  </div>
  <div class="field"><span class="lbl">Height</span><input class="inp" style="width:120px" placeholder="178 cm"></div>
</div>

<div style="margin-bottom:22px"><div class="lbl">Languages</div>
  <div class="chips"><span class="chip">English <span class="x">✕</span></span><span class="chip">Portuguese <span class="x">✕</span></span><span class="add">+ add</span></div>
</div>

<div style="margin-bottom:22px"><div class="lbl">Places you've lived</div>
  <div class="chips"><span class="chip">Lisbon <span class="x">✕</span></span><span class="chip">Berlin <span class="x">✕</span></span><span class="add">+ add</span></div>
</div>

<div class="row">
  <div class="field"><span class="lbl">Work / role</span><input class="inp" style="width:260px" value="Software engineer"></div>
  <div class="field"><span class="lbl">Household</span><input class="inp" style="width:300px" placeholder="partner, kids, pets"></div>
</div>

<hr class="sep">
<div class="more"><div class="mono">+ Add more about yourself &nbsp; (optional)</div>
  <div style="margin-top:16px"><div class="lbl">A typical day</div><textarea class="inp" placeholder="your usual rhythm"></textarea></div>
  <div style="margin-top:16px"><div class="lbl">Tastes</div>
    <div class="chips"><span class="chip">coffee <span class="x">✕</span></span><span class="chip">horror films <span class="x">✕</span></span><span class="add">+ add</span></div>
  </div>
</div>

<div class="actions"><span class="btn primary">Save and continue</span><span class="btn ghost">Skip for now</span></div>`;

const run = async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = await b.newPage({ viewport: { width: 860, height: 900 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(root, "docs", "brand", "mock-facts.png"), fullPage: true });
  await b.close();
  console.log("mock written: docs/brand/mock-facts.png");
};
run().catch((e) => { console.error(e); process.exit(1); });
