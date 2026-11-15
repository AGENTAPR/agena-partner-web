# Authentication Architecture — Averuna Partner Web

Status: **LIVE INTEGRATED (dev environment)** — verified against the real
Keycloak `iaop-dev` realm and Rust Agent BFF on InstaBox.
Mock authentication has been removed; auth is always live.

## 1. Ownership model

```
Browser ──same-origin HTTPS──▶ Partner SSR (React Router / Cloudflare Worker)
                                    │ reverse proxy (server-to-server)
                                    ▼
                              Rust Agent BFF ──OIDC AuthCode+PKCE──▶ Keycloak
```

- **Keycloak** (`iaop-dev` realm) is the IdP. Client `iaop-agent-bff`,
  Authorization Code Flow + PKCE S256.
- **Rust Agent BFF** owns the complete OIDC transaction: `/auth/login`,
  `/auth/callback` (state/nonce/PKCE validation, code redemption), session
  store, refresh, revocation, logout.
- **Partner SSR** is a *same-origin reverse proxy* for auth + API traffic.
  It owns no session lifecycle and never sees OAuth tokens.
- **Browser** holds only the BFF's host-only `__Host-iaop_session` cookie
  (HttpOnly, Secure, SameSite=Lax), bound to the frontend origin by the proxy.

## 2. Same-origin strategy (implemented)

The BFF session cookie is host-only, so the entire auth chain must stay on
the browser-facing origin:

1. `GET /auth/sign-in` → **Continue with SSO** (plain `href`, full-document
   navigation — client-side routing cannot follow the cross-origin 303).
2. `GET /auth/login?return_to=<path>` → proxied to BFF. The proxy pins
   `redirect_uri = <request-origin>/auth/callback` (must be registered in
   Keycloak client `iaop-agent-bff` **and** BFF `OIDC_REDIRECT_URI_ALLOWLIST`).
   BFF 303 → Keycloak authorize; login-binding cookie set for this origin.
3. Keycloak authenticates (MFA etc. handled by Keycloak).
4. `GET /auth/callback?code&state` → proxied to BFF, which validates
   state/nonce/PKCE, redeems the code, creates the session, sets
   `__Host-iaop_session`, and 303s to the sanitized `return_to` path
   (relative → resolves on this origin).
5. `GET /api/v1/me` (proxied, cookie forwarded) → `PartnerContext` → header,
   user menu, Today actor.

Registered callback URIs today: BFF origin, developer-portal proxy,
`http://localhost:3001/auth/callback` (dev frontend). Any new frontend
origin must be added to **both** the Keycloak client and the BFF allowlist.

## 3. Routes

| Route | Owner | Purpose |
|---|---|---|
| `/auth/sign-in` | Frontend page | SSO CTA + safe error/expired states |
| `/auth/login` | BFF proxy | Begin OIDC (redirect_uri pinned) |
| `/auth/callback` | BFF proxy | OIDC callback — BFF is sole transaction owner |
| `/auth/session` | BFF proxy | Session info incl. `csrf_token` |
| `/auth/me` | BFF proxy | BFF principal alias |
| `/auth/logout` | BFF proxy | Session destroy (x-csrf-token required) |
| `/api/v1/*` | BFF proxy | All BFF API traffic, cookie-forwarded |
| `/auth/sign-out` | Frontend action | Fetches CSRF token → BFF logout → redirect |

`src/routes/bff-proxy.tsx` implements the proxy: forwards method, path+query,
Cookie/Content-Type/CSRF/idempotency headers and body; `redirect:"manual"`
passes 3xx through; all upstream `Set-Cookie` headers are re-emitted.

## 4. Session & security

- Session = BFF `__Host-iaop_session` only. No tokens, PII, or session ids in
  our own cookies, localStorage, or sessionStorage (E2E-verified).
- Route protection: `src/root.tsx` loader → `authGate()` → cookie presence +
  live `GET /api/v1/me`. Anonymous → `302 /auth/sign-in?redirectTo=<safe>`.
- Safe redirects: `safe-redirect.ts` allowlist; BFF additionally sanitizes
  `return_to` server-side (`OIDC_ALLOWED_RETURN_PATHS`).
- CSRF: `/auth/sign-out` is POST + same-origin Origin/Referer check; BFF
  logout additionally requires `x-csrf-token` matching the session.
- Cookie flags: HttpOnly, Secure, SameSite=Lax, Path=/, host-only (`__Host-`).
- `Cache-Control: no-store` on proxied responses; Worker adds security
  headers + CSP (`worker/cloudflare-worker.ts`).
- SSR auth gate runs before any protected render; proxied paths bypass the
  document gate (BFF enforces auth upstream → 401).

## 5. Partner context (`/api/v1/me`)

Live DTO (envelope `{data:{...}}`): `subject`, `displayName`, `agentId`,
`agentCode`, `lifecycleStatus`, `activeWorkspace`, `permissions[]`, `locale`,
`timezone`, `sessionExpiresAt`, `partial`, `unavailableSections`.

Mapping (`mapMeResponse` in `src/server/auth.server.ts`):
- `lifecycleStatus: null` + `agentId: null` → `lifecycle="UNLINKED"`,
  `scenarioId="unaffiliated"` → Today renders an honest "account not linked"
  notice — never fabricated journey/KPIs.
- `canSell` is granted only by explicit sell-scoped permission strings —
  never inferred from lifecycle or account existence.
- Header shows real `displayName` + initials avatar + `agentCode`/workspace.

## 6. Environment

| Var | Where | Purpose |
|---|---|---|
| `AGENT_BFF_BASE_URL` | `.env` (dev) / wrangler `vars` | BFF origin for proxy + server calls |
| `AGENT_BFF_TIMEOUT_MS` | same | upstream timeout (default 10000) |
| `AGENT_BFF_INTERNAL_TOKEN` | secret (optional) | M2M token only if BFF contract requires |
| `E2E_KC_USERNAME` / `E2E_KC_PASSWORD` | Playwright env | real Keycloak demo account |
| `E2E_KC_UNLINKED_USER` / `E2E_KC_UNLINKED_PASSWORD` | Playwright env | unlinked-account test user |

## 7. Live integration evidence (2026-11-15)

Infra changes applied on `iaop-keycloak-dev`:
- Keycloak client `iaop-agent-bff`: added `http://localhost:3001/auth/callback`
  to Valid Redirect URIs (PKCE S256 already enforced).
- BFF `.env`/compose: `PARTNER_WEB_CALLBACK=http://localhost:3001/auth/callback`
  added to `OIDC_REDIRECT_URI_ALLOWLIST`; `agent-bff` recreated.
- Test user `e2e.unlinked` created (realm role `IAOP_AGENT`, no agent record).

Verified:
- `GET /auth/login` → 303 Keycloak authorize (code, S256, state, nonce,
  localhost redirect_uri).
- Full browser login `demo.agent.1` → callback → `__Host-iaop_session` →
  `/api/v1/me` → "Demo Agent One" in header → `/today`.
- Refresh keeps session; logout destroys BFF session + clears cookie;
  `/today` after logout → sign-in. Back/forward cannot restore content.
- Unlinked `e2e.unlinked` → unaffiliated notice (no fabricated data).
- No tokens in localStorage/sessionStorage/document.cookie; session cookie
  is HttpOnly (invisible to JS).
- Anonymous `/api/v1/me` → 401; forged callback → no session.
- Playwright: 25/25 PASS against live Keycloak+BFF (`react-router dev`).
- `wrangler dev` SSR smoke: anon gate 302, `/api/v1/me` 401, `/auth/login`
  303→Keycloak (unregistered origins safely fall back to BFF default
  redirect_uri — allowlist enforced).

## 8. Remaining gaps / notes

- `webOrigins: ["+"]` on client `iaop-agent-bff` remains permissive — separate
  CORS-hardening item; browser never calls Keycloak token endpoints directly
  so impact is limited, but should be tightened per
  `IAOP_DEV_KEYCLOAK_CORS_HARDENING.md`.
- Production deployment needs its own registered `redirect_uri` in Keycloak +
  BFF allowlist before go-live.
- BFF `/api/v1/me` `permissions` scopes drive `canSell`; confirm exact scope
  names with backend when selling features ship.
