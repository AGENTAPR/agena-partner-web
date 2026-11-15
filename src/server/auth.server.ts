import { agentBffFetch } from "./agent-bff.server";
import { getBffConfig, getEnv } from "./env.server";
import { ApiError } from "./errors.server";
import {
  commitSession,
  destroySession,
  getSession,
  hasAuthenticatedSubject,
  isSessionExpired,
  type SessionData,
} from "./session.server";
import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";

import { getMockIdentity, partnerFromMockSubject } from "@/features/auth/mock-identities";
import { safeRedirectPath } from "@/features/auth/safe-redirect";
import type { AuthMode, PartnerContext } from "@/features/auth/types";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function nodeEnv(): string | undefined {
  return (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
}

function isProduction(context: AppLoadContext): boolean {
  return getEnv(context)?.SESSION_SECRET !== undefined || nodeEnv() === "production";
}

/**
 * Explicit auth mode selection.
 * AUTH_MODE=mock|live wins; unset → live in production (fail-closed),
 * mock in development/test so the frontend works without Keycloak/BFF.
 */
export function getAuthMode(context: AppLoadContext): AuthMode {
  const explicit = getEnv(context)?.AUTH_MODE;
  if (explicit === "mock" || explicit === "live") return explicit;
  return isProduction(context) ? "live" : "mock";
}

export { safeRedirectPath };

/* ------------------------------------------------------------------ */
/* Session reading                                                     */
/* ------------------------------------------------------------------ */

export async function readAuthSession(request: Request, context: AppLoadContext) {
  const session = await getSession(request, context);
  const data = session.data as SessionData;
  if (!hasAuthenticatedSubject(data)) return null;
  // A session issued under a different auth mode is not valid here.
  if ((data.authMode ?? "mock") !== getAuthMode(context)) return null;
  return { session, data };
}

/* ------------------------------------------------------------------ */
/* Partner context                                                     */
/* ------------------------------------------------------------------ */

const LIFECYCLE_TO_SCENARIO: Record<string, string> = {
  CANDIDATE: "candidate",
  ONBOARDING: "onboarding",
  LEARNING: "learning",
  CERTIFICATION_PENDING: "certification-pending",
  ACTIVE: "active-eligible",
  SUSPENDED: "suspended",
  OFFBOARDING: "offboarding",
};

/** Map a BFF lifecycle + eligibility onto a Today scenario id. */
export function scenarioIdForLifecycle(lifecycle: string, eligible: boolean): string {
  if (lifecycle === "ACTIVE") return eligible ? "active-eligible" : "active-ineligible";
  return LIFECYCLE_TO_SCENARIO[lifecycle] ?? "candidate";
}

interface MeDto {
  sub?: string;
  subject?: string;
  userId?: string;
  name?: string;
  displayName?: string;
  email?: string;
  locale?: string;
  roles?: unknown;
  workspace?: unknown;
  canSell?: boolean;
  lifecycle?: string;
  eligible?: boolean;
  agent?: { lifecycle?: string; sellingEligible?: boolean; code?: string } | null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Runtime-validated mapping of the proposed GET /api/v1/me DTO. */
export function mapMeDto(dto: unknown): PartnerContext | null {
  if (!dto || typeof dto !== "object") return null;
  const me = dto as MeDto;
  const subject = me.sub ?? me.subject ?? me.userId;
  if (typeof subject !== "string" || !subject) return null;
  const lifecycle = me.lifecycle ?? me.agent?.lifecycle ?? "CANDIDATE";
  const eligible = me.eligible ?? me.agent?.sellingEligible ?? me.canSell ?? false;
  const roles = asStringArray(me.roles);
  return {
    subject,
    displayName: me.displayName ?? me.name ?? subject,
    email: typeof me.email === "string" ? me.email : undefined,
    scenarioId: scenarioIdForLifecycle(lifecycle, Boolean(eligible)),
    lifecycle,
    roles,
    workspace: typeof me.workspace === "string" ? me.workspace : "partner",
    canSell: Boolean(eligible) && !roles.includes("AGENCY_LEADER"),
    locale: typeof me.locale === "string" ? me.locale : undefined,
  };
}

async function fetchLivePartner(data: SessionData, context: AppLoadContext): Promise<PartnerContext | null> {
  if (!data.bffSessionRef) return null;
  // PROPOSED CONTRACT: GET {BFF}/api/v1/me authenticated by the opaque
  // session reference. The BFF remains the session/token owner.
  const dto = await agentBffFetch<unknown>(context, "/api/v1/me", {
    headers: { "X-Partner-Session": data.bffSessionRef },
  });
  return mapMeDto(dto);
}

export async function getPartnerContext(data: SessionData, context: AppLoadContext): Promise<PartnerContext | null> {
  if (getAuthMode(context) === "mock") {
    return data.subject ? partnerFromMockSubject(data.subject) : null;
  }
  return fetchLivePartner(data, context);
}

/* ------------------------------------------------------------------ */
/* Mock login                                                          */
/* ------------------------------------------------------------------ */

export async function mockLogin(
  identityId: string,
  returnTo: string,
  request: Request,
  context: AppLoadContext,
): Promise<Response> {
  const identity = getMockIdentity(identityId);
  const destination = safeRedirectPath(returnTo);
  if (!identity) {
    return redirect(`/auth/sign-in?error=invalid-identity&redirectTo=${encodeURIComponent(destination)}`);
  }
  const session = await getSession(request, context);
  const data: SessionData = {
    authMode: "mock",
    subject: identity.subject,
    csrfToken: crypto.randomUUID(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  for (const [k, v] of Object.entries(data)) session.set(k, v);
  const headers = new Headers();
  headers.append("Set-Cookie", await commitSession(session, context));
  return redirect(destination, { headers });
}

/* ------------------------------------------------------------------ */
/* Live (OIDC via Agent BFF) — proposed contract, honest scaffold      */
/* ------------------------------------------------------------------ */

/**
 * PROPOSED CONTRACT — the Rust Agent BFF owns the full OIDC transaction:
 *   GET  {BFF}/auth/login?return_to=<path>   → 302 to Keycloak authorize
 *   GET  {BFF}/auth/callback                 → code exchange, session issue
 *   POST {BFF}/auth/logout                   → session + SLO revocation
 *   GET  {BFF}/api/v1/me                     → authenticated partner context
 * The frontend only stores the opaque bffSessionRef in its signed cookie.
 */
export function liveLoginUrl(returnTo: string, context: AppLoadContext): string {
  const { baseUrl } = getBffConfig(context);
  return `${baseUrl}/auth/login?return_to=${encodeURIComponent(safeRedirectPath(returnTo))}`;
}

export async function liveCallback(request: Request, context: AppLoadContext): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirect("/auth/sign-in?error=callback-invalid");
  }
  try {
    // PROPOSED: BFF redeems the code, validates state/PKCE/nonce, and
    // returns an opaque session reference — never tokens to the browser.
    const result = await agentBffFetch<{
      bffSessionRef?: string;
      subject?: string;
      expiresAt?: number;
    }>(context, "/auth/callback", {
      method: "POST",
      body: { code, state },
    });
    if (!result?.bffSessionRef || !result.subject) {
      return redirect("/auth/sign-in?error=callback-invalid");
    }
    const session = await getSession(request, context);
    const data: SessionData = {
      authMode: "live",
      subject: result.subject,
      bffSessionRef: result.bffSessionRef,
      csrfToken: crypto.randomUUID(),
      expiresAt: result.expiresAt ?? Date.now() + SESSION_TTL_MS,
    };
    for (const [k, v] of Object.entries(data)) session.set(k, v);
    const headers = new Headers();
    headers.append("Set-Cookie", await commitSession(session, context));
    return redirect(safeRedirectPath(url.searchParams.get("return_to")), { headers });
  } catch (error) {
    const unavailable = error instanceof ApiError;
    return redirect(`/auth/sign-in?error=${unavailable ? "dependency-unavailable" : "callback-invalid"}`);
  }
}

/* ------------------------------------------------------------------ */
/* Logout                                                              */
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
  // No Origin/Referer (e.g. some same-origin form posts strip them) —
  // SameSite=Lax cookie already blocks cross-site POST credentialing.
  return true;
}

export async function logout(
  request: Request,
  context: AppLoadContext,
): Promise<{ location: string; headers: Headers }> {
  const mode = getAuthMode(context);
  const current = await readAuthSession(request, context);

  if (mode === "live" && current?.data.bffSessionRef) {
    // Best-effort BFF/Keycloak session revocation — never block logout UX,
    // but never pretend local cookie deletion revoked the upstream session.
    try {
      await agentBffFetch(context, "/auth/logout", {
        method: "POST",
        headers: { "X-Partner-Session": current.data.bffSessionRef },
      });
    } catch {
      /* upstream revocation is best-effort; cookie is still destroyed */
    }
  }

  const headers = new Headers();
  if (current) {
    headers.append("Set-Cookie", await destroySession(current.session, context));
  } else {
    const session = await getSession(request, context);
    headers.append("Set-Cookie", await destroySession(session, context));
  }
  return { location: "/auth/sign-in?logged_out=1", headers };
}

/* ------------------------------------------------------------------ */
/* Route gate                                                          */
/* ------------------------------------------------------------------ */

export const PUBLIC_PATH_PREFIXES = ["/auth/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export interface AuthGateResult {
  session: SessionData | null;
  partner: PartnerContext | null;
  /** Non-null when partner context could not be loaded (live dependency down). */
  partnerError: "UNAVAILABLE" | "FORBIDDEN" | null;
}

/**
 * Server-side auth gate for the root loader.
 * Returns session+partner for private routes; throws redirect for
 * anonymous users on private paths.
 */
export async function authGate(request: Request, context: AppLoadContext): Promise<AuthGateResult> {
  const current = await readAuthSession(request, context);
  if (!current) {
    return { session: null, partner: null, partnerError: null };
  }
  try {
    const partner = await getPartnerContext(current.data, context);
    if (!partner) {
      return { session: current.data, partner: null, partnerError: "FORBIDDEN" };
    }
    return { session: current.data, partner, partnerError: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        session: current.data,
        partner: null,
        partnerError: error.status === 403 ? "FORBIDDEN" : "UNAVAILABLE",
      };
    }
    throw error;
  }
}

export { isSessionExpired };
