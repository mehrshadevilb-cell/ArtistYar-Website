# ArtistYar Day 5 — Production Reliability

## Runtime topology

| Component | Type | Notes |
|-----------|------|-------|
| artistyar-website | Render web (Node) | `node .next/standalone/server.js` |
| artistyar-telegram-plugin-processor | Render cron `*/2 * * * *` | Hits `/api/telegram/plugins/process` |
| artistyar-hitnevis-daily-trainer | Render cron daily | Optional training |
| Inline processor | `src/instrumentation.ts` | 2-minute interval fallback when secret set |

Multiple web instances may run; Telegram work is coordinated by DB claim RPCs (`claim_telegram_plugin_item` / `claim_telegram_plugin_pair`).

## Health semantics

| Endpoint | Purpose | HTTP | Body |
|----------|---------|------|------|
| `/api/health/live` | Liveness (process up) | 200 | `{ "status": "ok" }` |
| `/api/health/ready` | Readiness for traffic | 200 (503 hard fail) | `{ status, ready }` — RahYar down → `degraded`, still ready |
| `/api/health` | Public summary | 200 | Coarse checks; **no backend URLs/secrets** |

RahYar is an **optional integration**. Unavailability does not remove the site from rotation.

## Render

`healthCheckPath: /api/health/live` — process liveness only so dependency blips do not kill instances.

## Background workers

- **Owner:** `instrumentation.ts` (single in-process timer).
- **Disabled:** `ARTISTYAR_DISABLE_INLINE_TELEGRAM_PROCESSOR=1` (prefer cron-only).
- **Shutdown:** SIGTERM/SIGINT clear interval and skip new runs.
- **Errors:** logged with `correlationId`; iteration failures do not stop the interval.
- **Duplicates across instances:** safe via claim RPCs.
- **CRITICAL:** `src/lib/telegram-plugin-sync.ts` must be restored if still a placeholder (see `docs/TELEGRAM_PLUGIN_SYNC_RESTORE.md`).

## Rate limiting

Music generate `rateMap` is **process-local UX throttle** (8/min/user). Not a distributed security control. Authz + credits remain the financial boundary.

## Logging rules

- Log operation name, correlation id, status codes, non-sensitive counts.
- Never log secrets, cookies, service-role keys, processor secrets, passwords.

## Verification limitations

- Live Render deploy verification may be unavailable from the agent environment.
- Config is updated in `render.yaml`; actual Render dashboard apply depends on Blueprint sync.
