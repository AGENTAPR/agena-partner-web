import { getBffConfig } from "./env.server";
import type { AppLoadContext } from "react-router";

import { safeRedirectPath } from "@/features/auth/safe-redirect";
import type { AuthState, PartnerContext } from "@/features/auth/types";

export { safeRedirectPath };

/**
 * Live authentication — the Rust Agent BFF is the sole auth/session owner.
 *
 * Browser ──same-origin──▶ Partner SSR ──proxy──▶ Agent BFF ──OIDC──▶ Keycloak
 *
 * The browser only holds the BFF's host-only `__Host-iaop_session` cookie.
 * This server never sees, stores, or forwards OAuth tokens — it only
 * proxies auth/API traffic and reads the safe `/api/v1/me` profile.
 */

export const BFF_SESSION_COOKIE = "__Host-iaop_session";

/* ------------------------------------------------------------------ */
/* Low-level BFF calls (server-to-server, cookie-forwarding)           */
/* ------------------------------------------------------------------ */

interface BffRawResult {
  status: number;
  json: unknown;
  setCookies: string[];
}

async function bffFetchRaw(
  context: AppLoadContext,
  path: string,
  init: { method?: string; cookieHeader?: string | null; headers?: Record<string, string> } = {},
): Promise<BffRawResult> {
  const { baseUrl, timeoutMs } = getBffConfig(context);
  const headers = new Headers({ Accept: "application/json" });
  if (init.cookieHeader) headers.set("Cookie", init.cookieHeader);
  for (const [k, v] of Object.entries(init.headers ?? {})) headers.set(k, v);

  const upstream = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await upstream.text();
  let json: unknown = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }
  return { status: upstream.status, json, setCookies: upstream.headers.getSetCookie() };
}

/* ------------------------------------------------------------------ */
/* Session detection                                                   */
/* ------------------------------------------------------------------ */

export function hasBffSessionCookie(request: Request): boolean {
  const cookie = request.headers.get("Cookie") ?? "";
  return cookie.split(";").some((part) => part.trim().startsWith(`${BFF_SESSION_COOKIE}=`));
}

/* ------------------------------------------------------------------ */
/* GET /api/v1/me → PartnerContext                                     */
/* ------------------------------------------------------------------ */

interface MeData {
  subject?: string;
  displayName?: string | null;
  agentId?: string | null;
  agentCode?: string | null;
  lifecycleStatus?: string | null;
  activeWorkspace?: string | null;
  permissions?: unknown;
  locale?: string;
  timezone?: string;
  sessionExpiresAt?: string;
  partial?: boolean;
  unavailableSections?: unknown;
}

const LIFECYCLE_TO_SCENARIO: Record<string, string> = {
  CANDIDATE: "candidate",
  ONBOARDING: "onboarding",
  LEARNING: "learning",
  CERTIFICATION_PENDING: "certification-pending",
  ACTIVE: "active-eligible",
  SUSPENDED: "suspended",
  OFFBOARDING: "offboarding",
};

export function scenarioIdForLifecycle(lifecycle: string | null): string | null {
  if (!lifecycle) return null;
  if (lifecycle === "ACTIVE") return "active-eligible";
  return LIFECYCLE_TO_SCENARIO[lifecycle] ?? null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Runtime-validated mapping of the live BFF `GET /api/v1/me` contract. */
export function mapMeResponse(payload: unknown): PartnerContext | null {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as { data?: MeData };
  const me = envelope.data;
  if (!me || typeof me !== "object") return null;
  if (typeof me.subject !== "string" || !me.subject) return null;

  const lifecycle = typeof me.lifecycleStatus === "string" ? me.lifecycleStatus : null;
  const permissions = asStringArray(me.permissions);
  return {
    subject: me.subject,
    displayName: me.displayName ?? me.subject,
    agentId: me.agentId ?? undefined,
    agentCode: me.agentCode ?? undefined,
    lifecycle: lifecycle ?? "UNLINKED",
    scenarioId: scenarioIdForLifecycle(lifecycle) ?? "unaffiliated",
    roles: permissions,
    workspace: me.activeWorkspace ?? "unknown",
    // Selling eligibility is never inferred from lifecycle or account
    // existence — only an explicit permission scope may grant it.
    canSell: permissions.some((p) => /sell|proposal|quote/i.test(p)),
    locale: me.locale,
    timezone: me.timezone,
    sessionExpiresAt: me.sessionExpiresAt,
    partial: me.partial === true,
  };
}

export type PartnerResult =
  | { status: "ok"; partner: PartnerContext }
  | { status: "anonymous" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export async function getPartnerContext(request: Request, context: AppLoadContext): Promise<PartnerResult> {
  if (!hasBffSessionCookie(request)) return { status: "anonymous" };
  let result: BffRawResult;
  try {
    result = await bffFetchRaw(context, "/api/v1/me", {
      cookieHeader: request.headers.get("Cookie"),
    });
  } catch {
    return { status: "unavailable" };
  }
  if (result.status === 401) return { status: "anonymous" };
  if (result.status === 403) return { status: "forbidden" };
  if (result.status !== 200) return { status: "unavailable" };
  const partner = mapMeResponse(result.json);
  return partner ? { status: "ok", partner } : { status: "unavailable" };
}

/* ------------------------------------------------------------------ */
/* Auth gate                                                           */
/* ------------------------------------------------------------------ */

export const PUBLIC_PATH_PREFIXES = ["/auth/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export interface AuthGateResult {
  authenticated: boolean;
  partner: PartnerContext | null;
  partnerError: "UNAVAILABLE" | "FORBIDDEN" | null;
}

/**
 * Server-side auth gate for the root loader.
 * Private routes: anonymous → redirect handled by caller; authenticated →
 * partner context from live BFF /api/v1/me.
 */
export async function authGate(request: Request, context: AppLoadContext): Promise<AuthGateResult> {
  const result = await getPartnerContext(request, context);
  switch (result.status) {
    case "ok":
      return { authenticated: true, partner: result.partner, partnerError: null };
    case "forbidden":
      return { authenticated: true, partner: null, partnerError: "FORBIDDEN" };
    case "unavailable":
      return { authenticated: hasBffSessionCookie(request), partner: null, partnerError: "UNAVAILABLE" };
    default:
      return { authenticated: false, partner: null, partnerError: null };
  }
}

/* ------------------------------------------------------------------ */
/* Logout — real BFF session invalidation                              */
/* ------------------------------------------------------------------ */

/** Same-origin check for state-changing POST actions (CSRF defense). */
export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      return new URL(origin).host === new URL(request.url).host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).host === new URL(request.url).host;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * POST /auth/sign-out action support.
 * Fetches the session's CSRF token from the BFF, then calls the real
 * BFF logout (session destroy + cookie clear). BFF Set-Cookie headers
 * are propagated so the browser drops __Host-iaop_session.
 */
export async function performLogout(
  request: Request,
  context: AppLoadContext,
): Promise<{ location: string; headers: Headers }> {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const cookieHeader = request.headers.get("Cookie");

  if (cookieHeader && hasBffSessionCookie(request)) {
    try {
      const sessionInfo = await bffFetchRaw(context, "/auth/session", { cookieHeader });
      const csrf =
        sessionInfo.status === 200 ? ((sessionInfo.json as { csrf_token?: string } | undefined)?.csrf_token ?? "") : "";
      const logout = await bffFetchRaw(context, "/auth/logout", {
        method: "POST",
        cookieHeader,
        headers: csrf ? { "x-csrf-token": csrf } : {},
      });
      for (const cookie of logout.setCookies) headers.append("set-cookie", cookie);
    } catch {
      /* upstream unreachable — still send the user to sign-in */
    }
  }

  return { location: "/auth/sign-in?logged_out=1", headers };
}

export type { AuthState };
