import { liveCredentials, liveLogin } from "./helpers";

import { expect, test } from "@playwright/test";

const SHOTS = "e2e/screenshots";
const creds = liveCredentials();

test.beforeEach(async ({ page }) => {
  test.skip(!creds, "E2E_KC_USERNAME/E2E_KC_PASSWORD not set — live auth required");
  await liveLogin(page, creds!);
});

const scenarios = [
  "candidate",
  "onboarding",
  "learning",
  "certification-pending",
  "active-eligible",
  "active-ineligible",
  "suspended",
  "offboarding",
] as const;

test.describe("Agent Today — scenario screenshots", () => {
  for (const scenario of scenarios) {
    test(`${scenario} desktop`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/today?scenario=${scenario}`);
      await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
      await page.screenshot({ path: `${SHOTS}/today-${scenario}-desktop.png`, fullPage: true });
    });
  }

  test("active-eligible mobile 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/today?scenario=active-eligible");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    await page.screenshot({ path: `${SHOTS}/today-active-eligible-mobile.png`, fullPage: true });
  });

  test("candidate mobile 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/today?scenario=candidate");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    await page.screenshot({ path: `${SHOTS}/today-candidate-mobile-320.png`, fullPage: true });
  });

  test("active-eligible dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/today?scenario=active-eligible");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    await page.screenshot({ path: `${SHOTS}/today-active-eligible-dark.png`, fullPage: true });
  });
});

test.describe("Agent Today — interactions", () => {
  test("complete a task updates the view", async ({ page }) => {
    await page.goto("/today?scenario=active-eligible");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    const before = await page.locator("text=Mark done").count();
    expect(before).toBeGreaterThan(0);
    await page.locator("button", { hasText: "Mark done" }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/today-task-completed.png`, fullPage: true });
  });

  test("forbidden variant shows permission error", async ({ page }) => {
    await page.goto("/today?scenario=active-eligible&variant=forbidden");
    await expect(page.locator("text=access to this workspace")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: `${SHOTS}/today-forbidden.png`, fullPage: true });
  });

  test("empty variant shows empty state", async ({ page }) => {
    await page.goto("/today?scenario=active-eligible&variant=empty");
    await expect(page.locator("text=Nothing needs your attention")).toBeVisible({ timeout: 15_000 });
  });

  test("scenario switcher changes content", async ({ page }) => {
    await page.goto("/today?scenario=candidate");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    await page.goto("/today?scenario=suspended");
    await page.waitForSelector("text=Respond to compliance case", { timeout: 15_000 });
    await page.screenshot({ path: `${SHOTS}/today-suspended-after-switch.png`, fullPage: true });
  });
});
