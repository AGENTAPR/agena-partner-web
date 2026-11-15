# Authentication Architecture — Averuna Partner Web

Status: **FE MOCK DONE** · **LIVE INTEGRATED: NOT YET** (no verified Keycloak/BFF endpoints)

## 1. Ownership model

```
Browser ──same-origin HTTPS──▶ React Router SSR (Cloudflare Worker)
                                    │ server-to-server
                                    ▼
                              Rust Agent BFF  ──OIDC──▶ Keycloak
```

- **Keycloak** is the IdP. Partner login = OIDC Authorization Code Flow + PKCE (S256).
- **Rust Agent BFF** is the intended owner of the OIDC transaction, token lifecycle,
  session validity, refresh and revocation.
- **React Router server** owns only the browser-facing cookie session and route
  protection. It must not run a second, independent auth system.
- **Browser** receives only an opaque, HttpOnly session cookie. No `keycloak-js`,
  no OAuth tokens in cookies/localStorage/sessionStorage.

## 2. Implemented contract boundary

`src/server/auth.server.ts` defines `AuthService`:

- `getSession(request, context)` → `AuthenticatedSession | null`
- `beginLogin(returnTo, request, context)` → `Response` (redirect)
- `completeCallback(request, context)` → `Response`
- `logout(request, context)` → `Response`
- `getPartnerContext(session, context)` → `PartnerContext` (the `/me` boundary)

Two adapters selected by `AUTH_MODE` env (`src/server/env.server.ts`):

| Mode | Behavior |
|---|---|
| `mock` | `MockAuthService` — synthetic identities, deterministic, no backend needed. Only allowed outside production. |
| `live` (default in production) | `LiveAuthService` — typed scaffold for the BFF OIDC contract. **Fails closed**: never falls back to mock. |

`AUTH_MODE` unset → `mock` in development, `live` in production.

## 3. Routes

| Route | Method | Purpose |
|---|---|---|
| `/auth/sign-in` | GET | Public login page (SSO CTA + dev-only mock selector) |
| `/auth/login` | GET | Begin login → BFF/OIDC authorization redirect (live) |
| `/auth/callback` | GET | OIDC callback owner boundary (live) |
| `/auth/mock-login` | POST | Mock sign-in. Rejects (404) unless `AUTH_MODE=mock`; requires same-origin POST |
| `/auth/sign-out` | POST | Logout; CSRF-protected via same-origin + session CSRF token |

`src/root.tsx` loader is the server-side auth gate: anonymous requests to app
routes get `302 → /auth/sign-in?redirectTo=<safe path>`.

## 4. Session & cookie policy

- Cookie: `averuna_session` — signed (HMAC via `SESSION_SECRET`), HttpOnly,
  `SameSite=Lax`, `Path=/`, `Max-Age=28800` (8h mock). Production adds `Secure`
  when the request URL is https.
- Contents: opaque session data only — `authMode`, `subject`, `csrfToken`,
  `expiresAt`, mock `identityId`. **No tokens, no PII claims.**
- Session fixation: a fresh session (new CSRF token + expiry) is committed on
  every successful login; logout destroys the session server-side.
- Expired sessions are rejected by `getSession` and treated as anonymous.

## 5. Safe redirects

`src/features/auth/safe-redirect.ts` — `safeRedirectPath()` accepts only
same-origin absolute paths under an allowlist of app prefixes
(`/today`, `/dashboard`, `/customers`, `/sales`, `/portfolio`, `/development`,
`/agency`, `/support`, `/resources`, `/auth`). Rejects absolute URLs,
protocol-relative `//host`, encoded bypasses (`%2f%2f`, backslashes), and
anything else → falls back to `/today`. Covered by unit + E2E tests.

## 6. CSRF

- All cookie-authenticated mutations (`/auth/mock-login`, `/auth/sign-out`)
  are POST-only and verify `Origin`/`Referer` same-origin.
- Sign-out additionally requires the session CSRF token in form data.
- SameSite=Lax is defense-in-depth, not the sole mechanism.

## 7. Authenticated context (`/me` boundary)

`src/features/auth/types.ts` + `mock-identities.ts` define `PartnerContext`:
subject, displayName, email, `scenarioId`, `lifecycle`, `roles`, `workspace`,
`canSell`, `locale`.

Mock identities cover: candidate, onboarding, learning, certification-pending,
active-eligible, active-ineligible, suspended, offboarding, agency leader.
Lifecycle and selling eligibility are separate fields — eligibility is never
inferred from lifecycle alone.

`user.tsx` renders display name, initials avatar, workspace; sign-out is a POST
form. `/today` derives its actor from the authenticated context — no
`agent-demo-001`, no `?scenario=` override in live mode.

## 8. Live-mode contract gaps (proposed, NOT verified)

The Rust BFF auth endpoints are **not yet confirmed to exist**. Proposed
operations the frontend needs:

- `GET  /auth/login` (or BFF-issued authorize URL) — begin OIDC + PKCE
- `GET  /auth/callback` — single OIDC transaction owner (BFF preferred)
- `GET  /api/v1/me` — authenticated Partner context DTO
- `POST /auth/logout` — session + Keycloak RP-initiated logout
- `POST /auth/refresh` — server-side session refresh (optional)

Until these are verified against `iaop-agent-bff`, `LiveAuthService` remains a
scaffold and live mode reports the dependency as unavailable rather than
silently degrading.

## 9. Security notes

- No credential logging anywhere; auth errors surface sanitized codes.
- `AGENT_BFF_*` bindings are server-only (never `VITE_*`); browser never sees
  the private BFF URL.
- SSR auth gate runs before any protected loader data is returned; no
  protected content is emitted for anonymous requests.
- Worker sets `Cache-Control`-safe responses; auth redirects are never cached.
- Worker hardening: `nodejs_compat` flag (required by `@emotion/server` SSR),
  security headers + CSP in `worker/cloudflare-worker.ts`.

## 10. Mock mode guide

- Enable: `AUTH_MODE=mock` (automatic in `react-router dev`).
- Sign-in page shows a dev-only identity selector; `/auth/mock-login` is
  POST + same-origin only.
- Session persists via the signed cookie across refresh; isolated per browser
  session; deterministic per identity.
- Scenario switcher on `/today` remains dev-only and stays coherent with the
  mock identity's lifecycle/eligibility.

## 11. Verification evidence

- `npx tsc -b` — PASS
- `npx vitest run` — 31 tests PASS (`src/features/auth`, `src/features/today`)
- `npx playwright test` — 24 tests PASS (`e2e/auth.spec.ts`, `e2e/today.spec.ts`)
- `npm run build` — PASS (client + SSR server bundle)
- `wrangler dev` smoke — anonymous `/today` → 302 sign-in; mock login →
  HttpOnly `averuna_session` cookie → authenticated `/today` 200.
