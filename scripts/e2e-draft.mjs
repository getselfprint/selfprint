// Verify the interview resumes after navigating away mid-session.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4380";
const PASS = "draft-test-9";
const answerPH = "Answer in your own words. A real example beats a general rule.";
const claimPH = "When a friend needs me, I drop my own plans.";
const PARTIAL = "This is my half-written answer and I walked away before finishing";

const A = [
  "A few years ago I stayed late and quietly rewrote a colleague's broken function before a launch. I told no one.",
  "When my sibling lost their job I drove four hours and just sat with them. I didn't try to fix it, I stayed.",
];
const C = [
  "When the team is at risk, I quietly fix it and don't ask for credit.",
  "When someone I love is hurting, I show up and stay.",
];

const run = async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  const clickEnabled = async (name) => {
    await page.waitForFunction(
      (n) =>
        [...document.querySelectorAll("button")].some(
          (x) => x.textContent.trim() === n && !x.disabled,
        ),
      name,
    );
    await page.getByRole("button", { name, exact: true }).click();
  };

  await page.goto(`${BASE}/studio`);
  await page.getByText("Create your passphrase").waitFor();
  await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
  await page.getByLabel("Confirm passphrase").fill(PASS);
  await page.getByRole("button", { name: "Create and continue" }).click();
  await page.getByText("Start with the basics").waitFor();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByText("Choose how the interview runs").waitFor();
  await page.getByRole("button", { name: "Use this" }).first().click();
  await page.getByRole("link", { name: /(Start|Continue) interview/i }).click();
  await page.getByText("Field notes").waitFor();

  // Answer two full questions (answer -> write claim).
  for (let i = 0; i < 2; i++) {
    await page.getByPlaceholder(answerPH).fill(A[i]);
    await clickEnabled("Submit");
    await page.getByPlaceholder(claimPH).fill(C[i]);
    await clickEnabled("Add claim and continue");
    await page.waitForTimeout(200);
  }

  // Type a partial answer for Q3 and let it autosave (do NOT submit).
  await page.getByPlaceholder(answerPH).fill(PARTIAL);
  await page.getByText("Saved automatically", { exact: false }).waitFor();
  const counterBefore = await page
    .getByText(/Question \d of 8/)
    .textContent();

  // Navigate away, then back.
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await page.getByText("NEXT UP").waitFor();
  await page.getByRole("link", { name: "Interview", exact: true }).click();
  await page.getByText("Field notes").waitFor();
  await page.waitForTimeout(400);

  const restored = await page.getByPlaceholder(answerPH).inputValue();
  const counterAfter = await page.getByText(/Question \d of 8/).textContent();
  const notes = await page
    .locator("aside")
    .last()
    .locator("p")
    .allTextContents();
  const fieldNoteCount = notes.filter((t) =>
    /quietly fix|show up and stay/.test(t),
  ).length;

  console.log("counter before:", counterBefore?.trim());
  console.log("counter after: ", counterAfter?.trim());
  console.log("draft restored:", JSON.stringify(restored));
  console.log("field notes restored:", fieldNoteCount);
  const ok =
    restored === PARTIAL &&
    counterAfter?.includes("3 of 8") &&
    fieldNoteCount === 2;
  console.log(ok ? "PASS" : "FAIL");
  await b.close();
  process.exit(ok ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
