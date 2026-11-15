import { liveCredentials, liveLogin } from "./helpers";

import { expect, test } from "@playwright/test";

const creds = liveCredentials();

test.describe("Authentication — live Keycloak SSO", () => {
  test("anonymous user is redirected from /today to sign-in", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("deep link destination is preserved through login", async ({ page }) => {
    await page.goto("/portfolio/policies");
    await expect(page).toHaveURL(/redirectTo=/);
    const url = new URL(page.url());
    expect(url.searchParams.get("redirectTo")).toContain("/portfolio/policies");
  });

  test("SSO button initiates the real Keycloak transaction", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByRole("link", { name: /continue with sso/i }).click();
    // Real Keycloak authorize endpoint — PKCE/state owned by the BFF.
    await page.waitForURL(/openid-connect\/auth/, { timeout: 30_000 });
    const url = new URL(page.url());
    expect(url.searchParams.get("client_id")).toBe("iaop-agent-bff");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toContain("/auth/callback");
    await expect(page.locator("#username")).toBeVisible();
  });

  test("real login returns to today with authenticated identity", async ({ page }) => {
    test.skip(!creds, "E2E_KC_USERNAME/E2E_KC_PASSWORD not set");
    await liveLogin(page, creds!, "/today");
    await expect(page).toHaveURL(/\/today/);
    // Header shows the real Keycloak display name — not a demo value.
    await expect(page.getByText("Demo Agent One").first()).toBeVisible({ timeout: 20_000 });
  });

  test("session survives refresh", async ({ page }) => {
    test.skip(!creds, "E2E_KC_USERNAME/E2E_KC_PASSWORD not set");
    await liveLogin(page, creds!);
    await page.reload();
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByText("Demo Agent One").first()).toBeVisible({ timeout: 20_000 });
  });

  test("unlinked account gets honest unaffiliated state, not fabricated KPIs", async ({ page }) => {
    const unlinked = {
      username: process.env.E2E_KC_UNLINKED_USER ?? "",
      password: process.env.E2E_KC_UNLINKED_PASSWORD ?? "",
    };
    test.skip(!unlinked.username || !unlinked.password, "E2E_KC_UNLINKED_* not set");
    await liveLogin(page, unlinked, "/today");
    await page.goto("/today");
    // Account with no linked agent record → unaffiliated notice, never KPIs.
    await expect(page.getByText(/not linked to an agent profile|belum tertaut ke profil agen/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("logout terminates the BFF session", async ({ page }) => {
    test.skip(!creds, "E2E_KC_USERNAME/E2E_KC_PASSWORD not set");
    await liveLogin(page, creds!);
    await page.goto("/today");
    // Open user menu and submit the real logout form.
    await page
      .getByRole("button", { name: /Demo Agent One/ })
      .first()
      .click();
    await page.getByRole("button", { name: /sign out|keluar/i }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 20_000 });
    // Protected content is gone — cookie cleared upstream.
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("no OAuth tokens in web storage or JS-readable cookies", async ({ page }) => {
    test.skip(!creds, "E2E_KC_USERNAME/E2E_KC_PASSWORD not set");
    await liveLogin(page, creds!);
    await page.goto("/today");
    const storage = await page.evaluate(() => ({
      local: JSON.stringify({ ...localStorage }),
      session: JSON.stringify({ ...sessionStorage }),
      cookies: document.cookie,
    }));
    for (const blob of [storage.local, storage.session, storage.cookies]) {
      expect(blob).not.toMatch(/access_token|refresh_token|id_token|code_verifier|code_challenge/i);
    }
    // The session cookie itself must be HttpOnly — invisible to document.cookie.
    expect(storage.cookies).not.toContain("iaop_session");
  });

  test("invalid callback fails safely", async ({ page }) => {
    await page.goto("/auth/callback?code=forged&state=forged");
    // BFF rejects the transaction — never establishes a session.
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("anonymous protected API request is rejected upstream", async ({ page }) => {
    const res = await page.request.get("/api/v1/me", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
