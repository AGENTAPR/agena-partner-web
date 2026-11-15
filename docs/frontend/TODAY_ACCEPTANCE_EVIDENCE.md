# Agent Today — Acceptance Evidence

Issue: #5 · PR: (this branch) · Base: development @1a7de42

## Executed gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` (tsc -b) | PASS |
| Lint | `npx eslint src/features/today` | PASS (warnings auto-fixed) |
| Build | `npm run build` | PASS client+server |
| Unit | `npx vitest run src/features/today` | 16/16 PASS |

## Coverage

- 8 experience scenarios: candidate, onboarding, learning, certification-pending, active-eligible, active-ineligible, suspended, offboarding
- Lifecycle normalization: `mapLifecycle()` separates `agentLifecycle` from `journeyPhase`; eligibility independent (`agentLifecycle==='ACTIVE'` + `eligibility`)
- Next best action: `selectNextBestAction()` recomputes from live task/agenda/blocker state (blocker → overdue → priority → journey → agenda → clear)
- Mock: localStorage persistence, actor isolation, version conflicts, durable PENDING ops resolved on poll, all variants
- UI: skeleton loading, dismissible alerts, PARTIAL/VERSION_CONFLICT/EMPTY states, contextual action Dialog per scenario, aria-live announcements
- i18n: en+id for all scenario + panel + state strings

## Known limitations

- E2E/visual-regression/a11y automated gates not yet wired (no Playwright/axe deps) — manual verification pending
- Mock is frontend-only; LIVE INTEGRATED requires real BFF contract
- Scenario switcher is dev-only (`import.meta.env.DEV`)
