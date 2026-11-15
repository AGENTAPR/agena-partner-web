# Mock Experience Guide

## Adding a scenario

1. Add fixture to `scenarios.ts` `TODAY_SCENARIOS` (or feature equivalent) with lifecycle, eligibility, hero, blockers, journey, tasks, agenda, activity, permissions, optional `actionPanel`.
2. Map contract lifecycle via `mapLifecycle()` — keep `agentLifecycle`/`eligibility` separate.
3. Give every task `expectedVersion`, `priority`, `completable`, optional `actionTo`.
4. Add i18n keys (en+id) for every label.
5. Cover in `*.test.ts`: scenario renders, NBA selection, transitions, variants.

## State ownership & persistence

| Context | Store | Survives refresh | Survives restart | Multi-tab |
|---|---|---|---|---|
| Browser | localStorage `averuna-today-mock:` | yes | yes | last-write-wins |
| SSR/tests | module Map | no | no | per-runtime |

Isolation key: `actorId|scenarioId|variant`. Reset via `service.reset(context)` or scenario switcher Reset.

## Operation lifecycle

`updateTask` → receipt `{operationId,status}` → PENDING ops polled via `getOperation` (bounded, cleanup on unmount/context change) → CONFIRMED applies mutation at boundary → REJECTED/REQUIRES_REVIEW surfaced honestly. Non-idempotent actions are never auto-retried.

## Variant matrix

normal · empty · partial · loading(UI-only) · validation-error · version-conflict · forbidden · dependency-unavailable · unknown-outcome
