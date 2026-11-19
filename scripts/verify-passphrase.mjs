// Verify the opt-in passphrase model: first run has NO passphrase prompt;
// adding one in Settings locks on reload; removing/stay-unlocked relaxes it.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const PASS = "opt-in-pass";

const run = async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 820 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const fail = (m) => {
    throw new Error("FAIL: " + m);
  };

  // --- First run: straight into Facts, NO passphrase prompt ---
  await page.goto(`${BASE}/app/`);
  await page.getByText("Start with the basics").waitFor();
  if (await page.getByText("Create your passphrase").count())
    fail("first run still forces a passphrase");
  console.log("PASS: first run goes straight in, no passphrase");

  // Skip facts, pick a mode.
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByText("Choose how the interview runs").waitFor();
  await page.getByRole("button", { name: "Use this" }).first().click();
  await page.getByText("Profile map").waitFor();

  // --- Reload stays unlocked (device mode, no passphrase) ---
  await page.reload();
  await page.getByText("Profile map").waitFor();
  if (await page.getByText("Unlock Selfprint").count())
    fail("device-mode vault asked to unlock on reload");
  console.log("PASS: no-passphrase vault stays open across reload");

  // Header should NOT show a Lock control yet.
  if (await page.getByRole("button", { name: "Lock", exact: true }).count())
    fail("Lock control shown without a passphrase");

  // --- Add a passphrase in Settings ---
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByText("Passphrase protection").waitFor();
  await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
  await page.getByLabel("Confirm passphrase").fill(PASS);
  await page.getByRole("button", { name: "Add a passphrase" }).click();
  await page.getByText("Protected", { exact: false }).waitFor();
  // Now a Lock control appears.
  await page.getByRole("button", { name: "Lock", exact: true }).first().waitFor();
  console.log("PASS: added passphrase, Lock control appears");

  // --- Reload now locks ---
  await page.reload();
  await page.getByText("Unlock Selfprint").waitFor();
  console.log("PASS: after adding a passphrase, reload requires it");

  // --- Unlock (we reloaded on /settings, so we land back there) ---
  await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.getByRole("link", { name: "Interview", exact: true }).waitFor();
  if (await page.getByText("Unlock Selfprint").count()) fail("unlock failed");
  console.log("PASS: unlock works");

  // --- Turn off auto-lock -> stays unlocked on reload ---
  await page.getByText("Ask for my passphrase every time").waitFor();
  await page.getByText("Ask for my passphrase every time").click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByRole("link", { name: "Interview", exact: true }).waitFor();
  if (await page.getByText("Unlock Selfprint").count())
    fail("stay-unlocked off did not persist the session");
  console.log("PASS: stay-unlocked keeps it open with a passphrase set");

  // --- Remove passphrase -> back to device mode ---
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByText("Remove passphrase").click();
  await page.getByRole("button", { name: "Remove - leave it open" }).click();
  await page.getByText("Selfprint is open on this device", { exact: false }).waitFor();
  console.log("PASS: removed passphrase, back to open mode");

  console.log("\nALL CHECKS PASSED");
  await b.close();
};
run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
