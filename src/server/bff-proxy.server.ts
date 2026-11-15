import { getBffConfig } from "./env.server";
import type { AppLoadContext } from "react-router";

/**
 * Same-origin reverse proxy to the Rust Agent BFF.
 *
 * The browser only ever talks to this origin. Auth endpoints
 * (/auth/login, /auth/callback, /auth/session, /auth/me, /auth/logout) and
 * API endpoints (/api/v1/*) are forwarded verbatim — the BFF owns the OIDC
 * transaction, session cookie (__Host-iaop_session) and token lifecycle.
 * Set-Cookie headers from upstream pass through untouched so the host-only
 * session cookie binds to THIS origin.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const FORWARD_REQUEST_HEADERS = [
  "cookie",
  "content-type",
  "accept",
  "accept-language",
  "x-csrf-token",
  "idempotency-key",
  "x-request-id",
];

export function buildBffUrl(requestUrl: string, baseUrl: string): URL {
  const incoming = new URL(requestUrl);
  const target = new URL(`${baseUrl}${incoming.pathname}${incoming.search}`);
  if (incoming.pathname === "/auth/login") {
    // Pin the OIDC redirect_uri to this origin's callback so the whole
    // transaction (binding cookie → Keycloak → callback → session cookie)
    // stays on the browser-facing origin. Must be registered in Keycloak
    // and the BFF OIDC_REDIRECT_URI_ALLOWLIST.
    target.searchParams.set("redirect_uri", `${incoming.origin}/auth/callback`);
  }
  return target;
}

export async function proxyBffRequest(request: Request, context: AppLoadContext): Promise<Response> {
  const { baseUrl, timeoutMs } = getBffConfig(context);
  const target = buildBffUrl(request.url, baseUrl);

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      // Pass 3xx (Keycloak redirect, post-login redirect) through untouched.
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return Response.json(
      { error: { code: "DOWNSTREAM_UNAVAILABLE", message: "Authentication service unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") {
      responseHeaders.append(key, value);
    }
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
