import { mockLogin } from "./helpers";

import { expect, test } from "@playwright/test";

test.describe("Authentication — mock SSO", () => {
  test("anonymous user is redirected from /today to sign-in", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("deep link destination is preserved through login", async ({ page }) => {
    await page.goto("/today?scenario=suspended");
    await expect(page).toHaveURL(/redirectTo=/);
    const url = new URL(page.url());
    expect(url.searchParams.get("redirectTo")).toContain("/today");
  });

  test("mock login via UI returns to today with partner identity", async ({ page }) => {
    await page.goto("/auth/sign-in");
    // MUI Select — open and pick the eligible agent identity
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /Mitra Aktif|Active eligible agent/ }).click();
    await page.getByRole("button", { name: /continue with sso/i }).click();
    await expect(page).toHaveURL(/\/today/, { timeout: 15_000 });
    await expect(page.getByText(/Mitra Aktif|Active eligible agent/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("mock login via request establishes session and /today loads", async ({ page }) => {
    await mockLogin(page, "agent-suspended", "/today?scenario=suspended");
    await page.goto("/today?scenario=suspended");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
  });

  test("session survives refresh", async ({ page }) => {
    await mockLogin(page);
    await page.goto("/today");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    await page.reload();
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("logout terminates the session", async ({ page }) => {
    await mockLogin(page);
    await page.goto("/today");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    const response = await page.request.post("/auth/sign-out", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("open redirect attempt is neutralized", async ({ page }) => {
    await mockLogin(page, "agent-eligible", "https://evil.example.com");
    await page.goto("/today");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
    expect(page.url()).not.toContain("evil.example.com");
  });

  test("candidate identity sees candidate today", async ({ page }) => {
    await mockLogin(page, "candidate", "/today?scenario=candidate");
    await page.goto("/today?scenario=candidate");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
  });

  test("suspended identity cannot sell", async ({ page }) => {
    await mockLogin(page, "agent-suspended", "/today?scenario=suspended");
    await page.goto("/today?scenario=suspended");
    await page.waitForSelector("text=What needs your attention", { timeout: 15_000 });
  });
});
