# Averuna Frontend Reference Standard

Established by Agent Today (F-02, issue #5). Apply to every new Partner screen.

## 1. Feature structure

```
src/features/<feature>/
  models.ts            # typed contract models + error envelope
  scenarios.ts         # experience scenarios + lifecycle mapping
  service.ts           # TodayExperienceService interface + Mock/Live adapters
  view-model.ts        # UI state mapping + selectors (no business logic)
  <feature>.test.ts    # vitest unit tests
  components/          # feature components only
```

Route pages stay thin: `src/pages/app/<area>/page.tsx` renders the feature component.

## 2. Contract boundary

- Models mirror `AGENA_FRONTEND_API_CONTRACT_V1` envelope (`{ data, meta }`).
- `agentLifecycle` (normalized) and `eligibility` (selling) are ALWAYS separate fields.
- Contract lifecycle strings map via `mapLifecycle()` — never conflate journey phases with lifecycle.
- Live adapter reports `DEPENDENCY_UNAVAILABLE` until BFF ships; never fabricate data.
- Adapter selection is env-controlled (`VITE_TODAY_MODE=live`); mock is dev default.

## 3. Mock strategy

- `MockTodayExperienceService`: deterministic store keyed `actor|scenario|variant`.
- Browser: `localStorage` (`averuna-today-mock:`) → survives refresh, last-write-wins per key.
- SSR/tests: module Map fallback → per-runtime only.
- Variants: normal, empty, partial, validation-error, version-conflict, forbidden, dependency-unavailable, unknown-outcome.
- Unknown-outcome ops are durable PENDING receipts resolved via bounded polling; mutation applies only on CONFIRMED.
- `expectedVersion` optimistic concurrency on every mutation.

## 4. UX components

- Gogo cards/Stepper/List/Chip/Alert/Skeleton/Dialog + NextureIcons only.
- Visual hierarchy: critical blockers → single next action → journey → tasks → agenda → activity → insights (active+eligible only).
- Contextual actions run inside Today dialogs — never dead links to unfinished shells.
- Dev-only scenario switcher via `?scenario=&variant=` — never in prod bundle path.

## 5. Error handling

States: INITIAL, LOADING(skeleton), EMPTY, READY, PARTIAL, VALIDATION_ERROR, PERMISSION_DENIED, DEPENDENCY_UNAVAILABLE, VERSION_CONFLICT, SUCCESS, UNKNOWN_OUTCOME. Alerts are dismissible; aria-live announces outcomes. No fake success — pending ops show processing until confirmed.

## 6. Quality gates

`npm run typecheck` · `npm run lint` · `npm run build` · `npx vitest run` · E2E/a11y per MOCK_EXPERIENCE_GUIDE.

## 7. Definition of Done

**FE MOCK DONE**: full frontend journey, mock transitions, SSR/browser tests, visual+a11y checks, no backend dependency, merged.
**LIVE INTEGRATED**: live adapter wired, real BFF contract validated, auth verified, integration+security tests pass. Never a prerequisite for FE MOCK DONE.
