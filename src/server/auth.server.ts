import { redirect } from "react-router";
import type { AppLoadContext } from "react-router";

import { agentBffFetch } from "./agent-bff.server";
import { commitSession, destroySession, getSession, type SessionData } from "./session.server";

const SAFE_REDIRECT_PATHS = [/^\/app/, /^\/auth/];

export function safeRedirectPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return SAFE_REDIRECT_PATHS.some((re) => re.test(path)) ? path : "/app";
}

/**
 * Login action — exchanges credentials via the BFF and stores tokens
 * in an HttpOnly cookie session. Browser never sees tokens.
 */
export async function loginAction(request: Request, context: AppLoadContext) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let tokens: { accessToken: string; refreshToken?: string; expiresAt?: number; userId?: string };
  try {
    tokens = await agentBffFetch(context, "/auth/login", {
      method: "POST",
      body: { email, password },
    });
  } catch {
    return { error: "Invalid credentials or authentication service unavailable." };
  }

  const session = await getSession(request, context);
  const data: SessionData = {
    userId: tokens.userId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt ?? Date.now() + 8 * 60 * 60 * 1000,
    // Rotate CSRF token on login to prevent session fixation
    csrfToken: crypto.randomUUID(),
  };
  Object.assign(session, { data });

  const headers = new Headers();
  headers.append("Set-Cookie", await commitSession(session, context));
  throw redirect(redirectTo, { headers });
}

export async function logoutAction(request: Request, context: AppLoadContext) {
  const session = await getSession(request, context);
  const headers = new Headers();
  headers.append("Set-Cookie", await destroySession(session, context));
  throw redirect("/auth/login", { headers });
}

/** Constant-time-ish CSRF check for cookie-authenticated actions. */
export function verifyCsrf(request: Request, sessionData: SessionData): boolean {
  const token = sessionData.csrfToken;
  if (!token) return false;
  const header = request.headers.get("X-CSRF-Token");
  const formToken =
    request.headers.get("Content-Type")?.includes("form")
      ? null
      : null;
  const provided = header ?? formToken;
  if (!provided) return false;
  if (provided.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
