// Screenshot the public site and confirm the SPA boots under /app.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:4323";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "e2e");

const run = async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);

  await page.goto(`${BASE}/`);
  await page.getByText("An AI that answers the way you would").waitFor();
  await page.screenshot({ path: join(OUT, "20-site-landing.png"), fullPage: true });

  await page.goto(`${BASE}/privacy`);
  await page.getByText("Where your data lives").waitFor();
  await page.screenshot({ path: join(OUT, "21-site-privacy.png"), fullPage: true });

  await page.goto(`${BASE}/terms`);
  await page.getByText("No warranty, use at your own risk").waitFor();
  await page.screenshot({ path: join(OUT, "23-site-terms.png"), fullPage: true });

  // The real proof: the SPA JS executes under /app and renders the first screen.
  await page.goto(`${BASE}/app`);
  await page.getByText("Create your passphrase").waitFor();
  await page.screenshot({ path: join(OUT, "22-app-boots-at-app.png"), fullPage: true });

  await browser.close();
  console.log("site screenshots done");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
