// Full guided-mode e2e walkthrough with screenshots. Run against the local
// preview server. Uses the system Chrome (channel: "chrome").
//
//   node scripts/e2e.mjs
//
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:4317";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "e2e");
mkdirSync(OUT, { recursive: true });

const PASS = "launch-weekend-42";

const ANSWERS = [
  "A few years ago I stayed late and quietly rewrote a colleague's broken function the night before a launch. I told no one and the release went fine.",
  "When my sibling was struggling after a job loss, I drove four hours and just sat with them for a weekend. I didn't try to fix it, I stayed.",
  "I once chose to turn down a promotion because it meant moving away from my ageing parents. I told my boss the honest reason.",
  "In my twenties I walked away from a friendship that had become one-sided. I wrote a long honest message and then kept my distance.",
  "I built a small tool for my team over a holiday because the manual process was wasting everyone's time. Nobody asked me to; I just made it.",
  "When a stranger's card was declined at a shop and they were flustered, I quietly paid for their groceries and left before they could thank me.",
  "I was terrified to speak at my grandfather's funeral, but I stood up and did it anyway because I knew I'd regret staying silent.",
  "I kept a promise to help a friend move even though I'd had an awful week and badly wanted to cancel. I showed up and carried boxes all day.",
];

const CLAIMS = [
  "When the team is at risk, I quietly fix the problem myself and don't ask for credit.",
  "When someone I love is hurting, I show up and stay rather than trying to fix it.",
  "When work and family collide, I protect family and I'm honest about why.",
  "I end relationships that have become one-sided, but I do it honestly rather than ghosting.",
  "I build things to remove friction for others, without being asked.",
  "I help strangers in small concrete ways and slip away before being thanked.",
  "I push through fear when I know I'd regret the silence.",
  "Once I promise something, I keep it even when it costs me.",
];

async function shot(page, name) {
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot:", name);
}

async function setRange(page, index, value) {
  await page
    .getByRole("slider")
    .nth(index)
    .evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
}

const run = async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);

  // 01 - Create passphrase
  await page.goto(`${BASE}/app`);
  await page.getByText("Create your passphrase").waitFor();
  await shot(page, "01-create-passphrase");
  await page.getByLabel("Passphrase", { exact: true }).fill(PASS);
  await page.getByLabel("Confirm passphrase").fill(PASS);
  await page.getByRole("button", { name: "Create and continue" }).click();

  // 02 - Facts (first-run)
  await page.getByText("Start with the basics").waitFor();
  await shot(page, "02-facts-empty");
  await page.getByLabel("Name").fill("Alex");
  await page.getByLabel("Languages").fill("English, Portuguese");
  await page.getByLabel("Work / role").fill("Software engineer");
  await page.getByLabel("Household").fill("Partner and a rescue dog");
  await shot(page, "03-facts-filled");
  await page.getByRole("button", { name: "Save and continue" }).click();

  // 04 - Choose how
  await page.getByText("Choose how the interview runs").waitFor();
  await shot(page, "04-choose-how");
  await page.getByRole("button", { name: "Use this" }).first().click(); // Guided

  // 05 - Map (fresh)
  await page.getByText("NEXT UP").waitFor();
  await shot(page, "05-map-fresh");
  await page
    .getByRole("link", { name: /(Start|Continue) interview/i })
    .click();

  // 06.. - Interview loop (guided)
  await page.getByText("Field notes").waitFor();
  await shot(page, "06-interview-q1");

  const answerPH =
    "Answer in your own words. A real example beats a general rule.";
  const claimPH = "When a friend needs me, I drop my own plans.";

  async function clickWhenEnabled(name) {
    await page.waitForFunction((n) => {
      const b = [...document.querySelectorAll("button")].find(
        (x) => x.textContent.trim() === n,
      );
      return b && !b.disabled;
    }, name);
    await page.getByRole("button", { name, exact: true }).click();
  }

  let i = 0;
  for (let step = 0; step < 25; step++) {
    if (await page.getByText("Session complete").isVisible().catch(() => false)) {
      break;
    }
    const ans = page.getByPlaceholder(answerPH);
    const claim = page.getByPlaceholder(claimPH);

    if (await ans.isVisible().catch(() => false)) {
      await ans.fill(ANSWERS[i % ANSWERS.length]);
      await clickWhenEnabled("Submit");
    } else if (await claim.isVisible().catch(() => false)) {
      await claim.fill(CLAIMS[i % CLAIMS.length]);
      if (i === 1) await shot(page, "07-write-claim");
      await clickWhenEnabled("Add claim and continue");
      i++;
      if (i === 3) {
        await page.waitForTimeout(250);
        await shot(page, "08-field-notes");
      }
    } else {
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(150);
  }
  await shot(page, "09-session-done");

  // Profile
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByText("Profile", { exact: true }).first().waitFor();
  await page.waitForTimeout(300);
  await shot(page, "10-profile-stories");
  await page.getByRole("button", { name: /Facts/ }).first().click();
  await page.waitForTimeout(200);
  await shot(page, "11-profile-facts");

  // Export
  await page.getByRole("link", { name: "Export", exact: true }).click();
  await page.getByText("Live preview").waitFor();
  await page.waitForTimeout(200);
  await shot(page, "12-export-persona");
  await page.getByRole("button", { name: /Full profile folder/ }).click();
  await page.waitForTimeout(200);
  await shot(page, "13-export-folder");

  // Mirror
  await page.getByRole("link", { name: "Mirror", exact: true }).click();
  await page.getByText("See your blind spots").waitFor();
  await shot(page, "14-mirror-overview");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  await page.getByText("How you see yourself").waitFor();
  await setRange(page, 0, 75);
  await setRange(page, 2, 30);
  await shot(page, "15-mirror-self");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Invite someone" }).click();
  await page.getByText("Answering about them").waitFor();
  await page.getByLabel("Your relationship to them").fill("friend");
  await setRange(page, 0, 40);
  await setRange(page, 2, 70);
  await page
    .getByLabel("What do they get wrong about themselves?")
    .fill("They think they avoid conflict, but they push back more than they realize.");
  await shot(page, "16-mirror-respondent");
  await page.getByRole("button", { name: "Seal answers" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();
  await page.getByText("LARGEST GAP", { exact: false }).waitFor();
  await page.waitForTimeout(200);
  await shot(page, "17-mirror-revealed");

  // Test (guided -> unavailable)
  await page.getByRole("link", { name: "Test", exact: true }).click();
  await page.getByText("Test mode needs a live model").waitFor();
  await shot(page, "18-test-unavailable");

  // Settings
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByText("Network activity").waitFor();
  await page.waitForTimeout(200);
  await shot(page, "19-settings");

  await browser.close();
  console.log("done");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
