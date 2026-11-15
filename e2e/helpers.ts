import type { Page } from "@playwright/test";

/**
 * Establish a mock authenticated session through the real RR action.
 * Shares the browser context cookie jar, so subsequent page.goto()
 * requests are authenticated.
 */
export async function mockLogin(page: Page, identity = "agent-eligible", returnTo = "/today"): Promise<void> {
  const response = await page.request.post("/auth/mock-login", {
    form: { identity, returnTo },
    maxRedirects: 0,
  });
  if (response.status() !== 302) {
    throw new Error(`mock-login failed: ${response.status()}`);
  }
}
