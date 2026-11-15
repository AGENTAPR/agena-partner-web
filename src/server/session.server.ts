import { getEnv } from "./env.server";
import type { AppLoadContext } from "react-router";
import { createCookieSessionStorage, type SessionStorage } from "react-router";

// __Host- prefix requires Secure — only usable in production (HTTPS).
// Dev/test on http://localhost falls back to a plain name.
const SESSION_COOKIE_NAME = "averuna_session";
const SESSION_COOKIE_NAME_SECURE = "__Host-averuna_session";

const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function nodeEnv(): string | undefined {
  return (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
}

function isProduction(context: AppLoadContext): boolean {
  return getEnv(context)?.SESSION_SECRET !== undefined || nodeEnv() === "production";
}

function getSessionSecret(context: AppLoadContext): string {
  const env = getEnv(context);
  const secret = env?.SESSION_SECRET;
  if (!secret) {
    // Dev fallback — never used in production deployments
    if (nodeEnv() === "production") {
      throw new Error("SESSION_SECRET binding is required in production");
    }
    return "dev-only-insecure-session-secret";
  }
  return secret;
}

function getSessionStorage(context: AppLoadContext): SessionStorage {
  return createCookieSessionStorage({
    cookie: {
      name: isProduction(context) ? SESSION_COOKIE_NAME_SECURE : SESSION_COOKIE_NAME,
      httpOnly: true,
      secure: isProduction(context),
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
      secrets: [getSessionSecret(context)],
    },
  });
}

export async function getSession(request: Request, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  return storage.getSession(request.headers.get("Cookie"));
}

/**
 * Opaque session data — NEVER contains OAuth access/refresh tokens,
 * authorization codes, or token endpoints. The BFF owns token lifecycle;
 * this cookie only carries an opaque reference + CSRF token + expiry.
 */
export interface SessionData {
  /** "mock" | "live" — which auth service issued this session. */
  authMode?: "mock" | "live";
  /** Authenticated subject (mock subject id or BFF principal id). */
  subject?: string;
  /** Opaque BFF session reference (live mode only). Never a token. */
  bffSessionRef?: string;
  csrfToken?: string;
  expiresAt?: number;
}

export function isSessionExpired(data: SessionData): boolean {
  return typeof data.expiresAt === "number" && data.expiresAt <= Date.now();
}

export function hasAuthenticatedSubject(data: SessionData): boolean {
  return Boolean(data.subject) && !isSessionExpired(data);
}

export async function commitSession(session: Awaited<ReturnType<typeof getSession>>, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  return storage.commitSession(session);
}

export async function destroySession(session: Awaited<ReturnType<typeof getSession>>, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  return storage.destroySession(session);
}
