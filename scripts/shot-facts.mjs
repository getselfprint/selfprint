// Screenshot the new two-step Facts card in first-run.
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const PASS = "shot-test-7";

const run = async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = await b.newPage({ viewport: { width: 760, height: 1000 } });
  page.setDefaultTimeout(15000);
  await page.goto(`${BASE}/app/`);
  await page.getByText("Create your passphrase").waitFor();
  await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
  await page.getByLabel("Confirm passphrase").fill(PASS);
  await page.getByRole("button", { name: "Create and continue" }).click();

  // Step 1 — essentials.
  await page.getByText("Essentials").waitFor();
  await page.getByPlaceholder("What you go by").fill("Alex");
  const yr = "1994".split("");
  const boxes = page.getByLabel(/Year digit/);
  for (let i = 0; i < 4; i++) await boxes.nth(i).fill(yr[i]);
  await page.getByPlaceholder("where").fill("Lisbon");
  await page.getByPlaceholder("English, Spanish…").fill("English");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("add another").fill("Portuguese");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("What you do").fill("Software engineer");
  await page.waitForTimeout(150);
  await page.screenshot({ path: "docs/brand/shot-facts-1.png", fullPage: true });

  // Step 2 — a bit more.
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("A bit more").waitFor();
  await page.getByPlaceholder("178 cm").fill("178 cm");
  await page.getByPlaceholder("partner, kids, pets").fill("partner, one cat");
  await page.getByPlaceholder("Cities or countries").fill("Berlin");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("Your usual rhythm").fill("Early start, gym, deep work until lunch.");
  await page.getByPlaceholder("Things you love and can't stand").fill("coffee");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await page.screenshot({ path: "docs/brand/shot-facts-2.png", fullPage: true });

  await b.close();
  console.log("shots written");
};
run().catch((e) => { console.error(e); process.exit(1); });
