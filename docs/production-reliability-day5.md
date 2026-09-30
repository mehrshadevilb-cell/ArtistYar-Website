# ArtistYar Day 5 — Production Reliability

## Runtime topology

| Component | Type | Notes |
|-----------|------|-------|
| artistyar-website | Render web (Node) | `node .next/standalone/server.js` |
| artistyar-telegram-plugin-processor | Render cron `*/2 * * * *` | Hits `/api/telegram/plugins/process` |
| artistyar-hitnevis-daily-trainer | Render cron daily | Optional training |
| Inline processor | `src/instrumentation.ts` | 2-minute interval fallback when secret set |

Multiple web instances may run; Telegram work is coordinated by DB claim RPCs.

## Health semantics

| Endpoint | Purpose | HTTP |
|----------|---------|------|
| `/api/health/live` | Liveness | 200 always if process answers |
| `/api/health/ready` | Readiness | 200; `degraded` if RahYar down |
| `/api/health` | Public summary | 200; no backend URLs/secrets |

RahYar is optional for site readiness.

## Render

`healthCheckPath: /api/health/live`

## Workers

- Owner: instrumentation.ts
- Disable: `ARTISTYAR_DISABLE_INLINE_TELEGRAM_PROCESSOR=1`
- Shutdown: SIGTERM/SIGINT
- Cross-instance safety: claim RPCs

## Rate limiting

Music `rateMap` is process-local UX throttle only.

## Limitations

Live Render verification may be unavailable from agent environment.
