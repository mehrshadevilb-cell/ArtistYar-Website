# ArtistYar Website — Agent Handoff

## Current continuation point

Latest application fixes:
- `7fd0f427cbfe3b4883347a0c2e1ebce86905b8bf` — explicit provider/model routing records health success/failure and respects cancellation.
- `a236ea36f6704272a372e40c0b197c97f4f9c608` — explicit provider/model selection is now strict; it no longer silently falls back to another model.

Repository: `mehrshadevilb-cell/ArtistYar-Website`

Active branch:
`feat/admin-ai-assistant-phase-0-1`

Pull Request:
#35 — `feat: RahYar Admin AI Assistant — production architecture`

PR status: **open, draft, not merged**

Latest code commit before this handoff:
`4acc80b3e4fba13b93efb2a50414c9bc459e3c91`

The latest handoff commits are:
- `b9be63aee58567febea7efc572944100f5fd334f` — add `cf:build` to Agent Verify
- this file — persistent continuation state

## Immediate next task

Continue PR #35 from the current branch.

Do **not** merge the PR.

First verify the current branch and inspect the latest workflow runs. Then continue production validation.

## CI / deployment state

The project uses Next.js + OpenNext + Cloudflare Workers.

Required validation commands:

```bash
npm ci
npm run typecheck
npm run build
npm run cf:build
```

The following workflows are intended to verify these paths:
- `.github/workflows/build.yml`
- `.github/workflows/verify-main.yml`
- `.github/workflows/agent-verify.yml`

All three should validate the Cloudflare/OpenNext build.

Previous GitHub Actions runs on commit
`4acc80b3e4fba13b93efb2a50414c9bc459e3c91`
failed before executing any step. The jobs reported:

```
status: completed
conclusion: failure
steps: []
```

A failed-job rerun was also attempted and again produced no steps.

Therefore those failures were not evidence of a TypeScript, Next.js, or Cloudflare build error. Do not claim CI is green or that the build is verified until actual workflow steps execute.

If GitHub Actions again fails with zero steps, treat it as a runner/infrastructure issue and do not randomly modify application code to fix it.

## Cloudflare

Important files:
- `wrangler.jsonc`
- `open-next.config.ts`
- `package.json`

Important scripts:
- `npm run build`
- `npm run cf:build`
- `npm run cf:deploy`
- `npm run preview`

Do not perform a real Cloudflare deployment unless valid deployment credentials/configuration are available and deployment is explicitly required.

Do not invent Cloudflare secrets.

## Admin AI scope

Canonical UI:
`/admin/ai`

Backward-compatible route:
`/admin/assistant` → redirects to `/admin/ai`

Canonical API:
`/api/admin/assistant`

Legacy:
- `/api/ai/agent` → 410
- `/api/ai/develop` → 410

User Chat Bot:
`/api/ai/chat`

The Admin Assistant is strictly separate from the User Chat Bot.

### Do NOT add

- Multi-Agent
- Agent Registry
- Parallel Execution
- Task Orchestration
- Coding Agent
- Repository Intelligence
- Build Runner
- Test Runner
- Shell/command execution
- Filesystem write access
- Music Analysis
- Audio Analysis
- Practice-game functionality
- arbitrary tool execution

Files, memory, and dynamic tools are intentionally deferred until explicit least-privilege security boundaries exist.

## Important implementation files

Inspect these before modifying behavior:

```
src/app/api/admin/assistant/route.ts
src/lib/admin-ai-assistant.ts
src/lib/admin-ai-model-registry.ts
src/lib/admin-ai-model-health.ts
src/lib/ai-providers.ts
src/lib/server-admin-auth.ts
src/app/admin/ai/page.tsx
```

Migrations:

```
supabase/migrations/20260920_admin_ai_assistant.sql
supabase/migrations/20260920_admin_ai_model_registry.sql
supabase/migrations/20260920_admin_ai_model_health.sql
```

## Security invariants

- Every Admin Assistant API request must verify the admin session server-side.
- Provider secrets remain server-side.
- Secrets must never be sent to frontend code.
- Secrets must never be placed in request URLs.
- Provider/model selection must remain inside the validated enabled Registry routing boundary.
- Provider failures stored in health data must be sanitized.
- Request cancellation must propagate to provider requests.
- Never simulate token streaming.
- Invalid/empty provider responses must not be persisted as successful assistant messages.

## Existing fixes already completed

- Admin-only server authorization
- Persistent admin-isolated conversations
- Provider abstraction
- Model Registry
- Model discovery/sync
- Enabled-model routing boundary
- Provider/model health and cooldown
- Cancellation-safe generation
- Empty-response validation
- Provider error redaction
- Gemini API key moved out of URL/query parameters
- Registry state transition validation
- Routing state preservation during model sync
- Mobile-first Persian RTL ChatGPT-style Admin UI
- Cloudflare/OpenNext build checks added to CI

## Working method

For each change:

1. Inspect current state.
2. Plan the smallest safe change.
3. Implement.
4. Run typecheck.
5. Run normal build.
6. Run Cloudflare/OpenNext build.
7. Run relevant tests.
8. Perform security/regression review.
9. Commit the change.
10. Re-check the PR and workflow status.
11. Continue to the next unresolved production issue.

Never claim a check passed unless it actually ran and passed.

## Product/UI constraints

Admin AI UI should remain:
- mobile-first
- Persian RTL
- simple
- premium
- ChatGPT-like
- uncluttered

Do not break existing important features or restructure the application unnecessarily.

## Current priority

The next agent should:

1. Verify PR #35 head.
2. Inspect new workflow runs after the latest commits.
3. Determine whether GitHub Actions now executes real steps.
4. If real steps execute, fix actual failures in order:
   `npm ci` → typecheck → build → cf:build.
5. If steps remain empty, document the runner/infrastructure failure and continue with static/local validation available through the environment.
6. Audit remaining Admin AI production issues without expanding scope.
7. Keep PR #35 open and unmerged.

This file is the source of truth for continuation context.