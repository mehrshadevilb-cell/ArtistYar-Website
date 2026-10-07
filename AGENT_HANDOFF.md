# ArtistYar Website — Agent Handoff

## Current state (2026-10-07)

Repository: `mehrshadevilb-cell/ArtistYar-Website`  
Default branch: `main`  
Live: https://artistyaar.ir

### Active security / audit branch
`fix/audit-2026-10-07` — closes remaining findings from the 2026-10-07 full audit:

| ID | Severity | Fix |
|----|----------|-----|
| D1 | HIGH | `/api/admin/diagnostics` returns **401** without admin session (no backend URL / AI provider ID / secret-presence leak) |
| D2 | MED | Plugin cover proxy serves deterministic branded SVG when Telegram `file_id` is unresolvable/empty |
| D3 | MED | `sitemap.ts` course URLs use `encodeURIComponent(slugify(...))` |
| D4 | MED | `.env.example` documents additional env vars read by code |
| D8 | LOW | `/practice` added to sitemap |

### Historical note
PR #35 (`feat/admin-ai-assistant-phase-0-1`) was **merged 2026-09-20**. Older handoff text that called it open/do-not-merge is obsolete.

## Security invariants (must hold)

- Every Admin Assistant / diagnostics / admin API request verifies admin session server-side.
- `/api/admin/diagnostics` fails closed (401) for anonymous callers.
- Provider secrets stay server-side; never in URLs or frontend.
- Gemini uses `x-goog-api-key` header (discovery + generateContent).
- Routing only via enabled Registry candidates; health cooldown applied.
- Empty provider replies are not persisted; cancellation propagates.
- Provider errors in health storage are sanitized.
- Plugin covers: Telegram is canonical; on bot failure serve branded SVG and log cause server-side.

## Render deployment

Production flow:

`main push → Render auto-deploy → npm ci && npm run build → npm start`

Render configuration is in `render.yaml`. Runtime secrets live in the Render service Environment settings only.

Do not claim a production deployment succeeded until the actual Render deploy is observed as successful.

## Required validation order

```
npm ci
npm run typecheck
npm run build
```

Never claim a check passed unless it actually ran and passed.

## Admin AI scope

Canonical UI: `/admin/ai`  
Alias: `/admin/assistant` → redirect `/admin/ai`  
Canonical API: `/api/admin/assistant` (+ `/api/admin/assistant/models`)  
Legacy: `/api/ai/agent`, `/api/ai/develop` → 410  
User Chat Bot: `/api/ai/chat` (separate)

### Do NOT add

- Multi-Agent, Agent Registry, Parallel Execution, Task Orchestration
- Coding Agent, Repository Intelligence, Build/Test Runner, Shell
- Music/Audio analysis, practice-game tools, arbitrary tool execution
