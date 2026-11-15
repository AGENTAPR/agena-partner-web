import type { Page } from "@playwright/test";

export interface LiveCredentials {
  username: string;
  password: string;
}

export function liveCredentials(): LiveCredentials | null {
  const username = process.env.E2E_KC_USERNAME;
  const password = process.env.E2E_KC_PASSWORD;
  return username && password ? { username, password } : null;
}

/**
 * Real OIDC login through the live Keycloak + Agent BFF:
 *   /auth/sign-in → Continue with SSO → /auth/login (proxied)
 *   → Keycloak authorize → credential form → /auth/callback (proxied)
 *   → BFF session cookie → safe return destination.
 * Requires E2E_KC_USERNAME / E2E_KC_PASSWORD env vars.
 */
export async function liveLogin(page: Page, creds: LiveCredentials, returnTo = "/today"): Promise<void> {
  await page.goto(`/auth/sign-in?redirectTo=${encodeURIComponent(returnTo)}`);
  await page.getByRole("link", { name: /continue with sso/i }).click();
  // Either the Keycloak login form appears, or an existing Keycloak SSO
  // session short-circuits straight back to the app.
  await page.waitForURL(/openid-connect\/auth|\/today|\/auth\/sign-in/, { timeout: 30_000 });
  if (page.url().includes("openid-connect")) {
    await page.waitForSelector("#username", { timeout: 30_000 });
    await page.locator("#username").fill(creds.username);
    await page.locator("#password").fill(creds.password);
    await page.locator("#kc-login").click();
  }
  // BFF callback → session cookie → redirect back to the app origin.
  await page.waitForURL(/\/today|\/dashboard|\/auth\/sign-in/, { timeout: 30_000 });
}
