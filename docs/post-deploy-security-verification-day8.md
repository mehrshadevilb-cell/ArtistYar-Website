# Day 8 — Post-Deploy Security Verification & Residual Hardening

## Deployed commit vs main

| Item | Value | Classification |
|------|-------|----------------|
| Live CSP/HSTS (2026-09-30 curl) | **Absent** | LIVE VERIFIED (deploy lag) |
| HTTP→HTTPS | 301 to https://artistyaar.ir/ | LIVE VERIFIED |
| Health live | 200 | LIVE VERIFIED |
| Health ready | ready:true | LIVE VERIFIED |

Production still lacked CSP/HSTS while main contained Day 7 next.config changes.

## Telegram admin query-key

All telegram plugin admin routes: **header-only** via `src/lib/telegram-admin-auth.ts`.

## Music rate limiting

Retain process-local rateMap as UX throttle. Durable controls: auth + credits + idempotency.

## Education auth

GET lessonId requires verifyCourseAccess (Day 7). Live IDOR matrix: NOT VERIFIED — no safe test identity.

## Tests

`npm run test:security-day8`
