# ArtistYar Website — Agent Handoff

## Current continuation point

Repository: `mehrshadevilb-cell/ArtistYar-Website`

Active branch:
`feat/admin-ai-assistant-phase-0-1`

Pull Request:
#35 — `feat: RahYar Admin AI Assistant — production architecture`

PR status: **open, draft, not merged**

Do **not** merge the PR unless explicitly requested.

## Verified CI (real steps)

Branch head Build run `35500139220` completed with **success**:

- `npm ci` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run cf:build` ✅

URL: https://github.com/mehrshadevilb-cell/ArtistYar-Website/actions/runs/35500139220

Subsequent hardening commits may need a fresh Build dispatch to re-confirm.

## Recent hardening (this continuation)

- Model Registry API: map conflict errors (`enabled/status`, preferred-must-be-enabled), return 404 for missing model on validate/update.
- Admin AI UI: roll back optimistic user message and restore input on send failure or abort (aligned with server: user message is only persisted after successful generation).
- CI workflows on this branch support `workflow_dispatch` for manual validation.

## Cloudflare deployment

Production deployment must use:

`.github/workflows/deploy-cloudflare.yml`

Production flow:

`main push → npm ci → npm run cf:build → cloudflare/wrangler-action@v4 → Worker deploy`

Deploy job only runs when `github.ref == 'refs/heads/main'`.

Do not claim a production deployment succeeded until the actual Deploy Cloudflare workflow run is observed as successful.

## Required validation order

```
npm ci
npm run typecheck
npm run build
npm run cf:build
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

## Security invariants

- Every Admin Assistant API request verifies admin session server-side.
- Provider secrets stay server-side; never in URLs or frontend.
- Gemini uses `x-goog-api-key` header (discovery + generateContent).
- Routing only via enabled Registry candidates; health cooldown applied.
- Empty provider replies are not persisted; cancellation propagates.
- Provider errors in health storage are sanitized.

## Immediate next task

1. Keep PR #35 open and unmerged.
2. Re-run Build on latest head after hardening commits.
3. Confirm Supabase migrations applied in the target environment before production use of Assistant storage.
4. Production deploy only after merge to `main` via deploy-cloudflare.yml.
