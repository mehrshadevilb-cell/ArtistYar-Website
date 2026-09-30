# ArtistYar Day 4 — Testing Foundation

## Selected stack

**Node.js built-in test runner** (`node:test` + `node:assert`) and existing **static contract scripts**.

Why:
- No Jest/Vitest/Playwright in the repo; adding them would require dependency installs that have been unreliable (registry 502).
- Day 1–3 suites are already Node scripts; extending that pattern keeps CI deterministic and secret-free.
- Critical invariants (auth crypto, authz order, billing contracts) can be asserted without a browser.

Not used (intentionally): Playwright/Cypress, Vitest/Jest.

## Commands

```bash
npm run test:security
npm run test:music-billing
npm run test:schema-inventory
npm run test:critical-paths
npm run test
```

Optional / known flaky:
```bash
npm run test:telegram-plugins
```

## Categories

| Class | What | Requires DB? | Requires secrets? |
|-------|------|--------------|-------------------|
| Pure unit | Session HMAC, credit estimation | No | No (disposable secrets) |
| Static contract | Route source order, header transport | No | No |
| Security / billing / schema regression | Day 1–3 scripts | No | No |
| Live integration | RPC SET ROLE, HTTP sessions | Yes | Yes | **Not mandatory CI** |

## Education progress note

`GET ?lessonId=` returns **own** progress filtered by session `user_id` without `verifyCourseAccess`.  
`PUT` requires `verifyCourseAccess(courseId)`.  
Not cross-user access. Course-enrollment gating on lesson-level reads is deferred defense-in-depth.

## CI

`production-verify.yml` runs security, music-billing, schema-inventory, critical-paths before build.

## Limitations

- No HTTP route-handler integration without Next request mocks.
- No live ownership tests against production DB.
- typecheck/lint/build may be blocked by registry failures in some environments.
- Telegram plugin sync test may fail on pre-existing caption export naming.
