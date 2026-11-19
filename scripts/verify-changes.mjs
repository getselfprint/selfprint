// Verify: no-AI mode removed, stay-unlocked default, export name prefill,
// auto-lock toggle. Fresh headless context = clean IndexedDB (first run).
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const PASS = "verify-pass-1";

const run = async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 820 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const fail = (m) => {
    throw new Error("FAIL: " + m);
  };

  // --- First run: passphrase ---
  await page.goto(`${BASE}/app/`);
  await page.getByText("Create your passphrase").waitFor();
  await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
  await page.getByLabel("Confirm passphrase").fill(PASS);
  await page.getByRole("button", { name: "Create and continue" }).click();

  // --- Facts: set a name so Export can prefill it ---
  await page.getByText("Essentials").waitFor();
  await page.getByPlaceholder("What you go by").fill("Jordan Lee");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("A bit more").waitFor();
  await page.getByRole("button", { name: "Save and finish" }).click();

  // --- Choose how: no "Guided, no AI", letters A-D ---
  await page.getByText("Choose how the interview runs").waitFor();
  if (await page.getByText("Guided, no AI").count())
    fail('"Guided, no AI" still present');
  for (const t of [
    "Use the AI chat you already have",
    "Run a model in this browser",
    "Paste an Anthropic API key",
    "Local or custom model server",
  ]) {
    if (!(await page.getByText(t, { exact: false }).count()))
      fail("missing mode: " + t);
  }
  const bodyText = await page.locator("main, body").first().innerText();
  if (/\bF\b/.test(bodyText) && !/\bD\b/.test(bodyText))
    fail("letters look wrong (D missing)");
  console.log("PASS: guided removed, modes A-D present");

  // Pick copy-paste (first card, no setup needed).
  await page.getByRole("button", { name: "Use this" }).first().click();

  // --- Lands in the app (Map) ---
  await page.getByText("Profile map").waitFor();

  // --- Reload stays unlocked (default) ---
  await page.reload();
  await page.getByText("Profile map").waitFor({ timeout: 8000 }).catch(() => {});
  if (await page.getByText("Unlock Selfprint").count())
    fail("reload re-locked by default (should stay unlocked)");
  console.log("PASS: stays unlocked across reload by default");

  // --- Export name prefilled from Facts ---
  await page.getByRole("link", { name: "Export", exact: true }).click();
  await page.getByText("Live preview", { exact: false }).waitFor();
  const nameVal = await page
    .getByPlaceholder("Used in the file heading")
    .inputValue();
  if (nameVal !== "Jordan Lee")
    fail(`export name not prefilled (got "${nameVal}")`);
  console.log("PASS: export name prefilled from Facts");

  // --- Turn on auto-lock, reload -> should lock ---
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByText("Ask for my passphrase every time").waitFor();
  await page.getByText("Ask for my passphrase every time").click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByText("Unlock Selfprint").waitFor({ timeout: 8000 });
  console.log("PASS: auto-lock on -> reload requires passphrase");

  console.log("\nALL CHECKS PASSED");
  await b.close();
};
run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
