import { createCookieSessionStorage, redirect, type SessionStorage } from "react-router";
import type { AppLoadContext } from "react-router";

import { getEnv } from "./env.server";

export const SESSION_COOKIE_NAME = "__averuna_session";

const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function isProduction(context: AppLoadContext): boolean {
  return getEnv(context)?.SESSION_SECRET !== undefined || process.env.NODE_ENV === "production";
}

function getSessionSecret(context: AppLoadContext): string {
  const env = getEnv(context);
  const secret = env?.SESSION_SECRET;
  if (!secret) {
    // Dev fallback — never used in production deployments
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET binding is required in production");
    }
    return "dev-only-insecure-session-secret";
  }
  return secret;
}

function getSessionStorage(context: AppLoadContext): SessionStorage {
  return createCookieSessionStorage({
    cookie: {
      name: SESSION_COOKIE_NAME,
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

export interface SessionData {
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  csrfToken?: string;
}

export async function requireSession(request: Request, context: AppLoadContext) {
  const session = await getSession(request, context);
  const data = session.data as SessionData;
  if (!data.userId || !data.accessToken || (data.expiresAt && data.expiresAt <= Date.now())) {
    throw redirect("/auth/login", 302);
  }
  return { session, data };
}

export async function commitSession(session: Awaited<ReturnType<typeof getSession>>, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  return storage.commitSession(session);
}

export async function destroySession(session: Awaited<ReturnType<typeof getSession>>, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  return storage.destroySession(session);
}
