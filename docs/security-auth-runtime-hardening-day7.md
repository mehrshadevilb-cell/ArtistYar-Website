# Day 7 — Security, Auth & Runtime Hardening

## Baseline

| Area | Behavior | Risk | Classification |
|------|----------|------|----------------|
| Headers | nosniff, XFO, Referrer, Permissions | Missing CSP/HSTS | FIXED (source) |
| Cookies | httpOnly, secure in prod, SameSite=lax, HMAC | Low | STATICALLY VERIFIED |
| Education GET lessonId | user_id filter only | Authz asymmetry vs PUT | FIXED |
| Music rateMap | process-local | UX only | DOCUMENTED |
| Process secret | header-only | OK | STATICALLY VERIFIED |
| Admin `?key=` | still accepted on some telegram admin routes | Ops tooling | RETAINED (prefer header) |
| Live HSTS/CSP | not yet measured post-deploy | Deploy lag | NOT VERIFIED live |

## Headers

Added in `next.config.ts`:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Content-Security-Policy with known script/style/img/connect sources
- `unsafe-inline` retained for theme boot, JSON-LD, GA init (no nonce pipeline yet)
- No `unsafe-eval`

## Education progress

GET `?lessonId=` now:
1. loads lesson → course_id
2. `verifyCourseAccess`
3. returns only the session user’s progress
4. returns generic `storage_unavailable` on DB errors

## Rate limiting

Music `rateMap` is process-local UX throttle (not distributed abuse control).

## Tests

`npm run test:security-runtime`
