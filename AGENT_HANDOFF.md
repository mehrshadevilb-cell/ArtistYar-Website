# ArtistYar Website — Agent Handoff

## Current continuation point

Repository: `mehrshadevilb-cell/ArtistYar-Website`

Active branch:
`feat/admin-ai-assistant-phase-0-1`

Pull Request:
#35 — `feat: RahYar Admin AI Assistant — production architecture`

PR status: **open, draft, not merged**

Current PR head:
`dac9457ed64ca34a3733d6cc4dd17cbd997afdd6`

Do **not** merge the PR unless explicitly requested.

## Latest verified CI finding

The latest `main` verification runs were inspected directly.

Run `35474465039` (Build) and run `35474465053` (ArtistYar Verify) both executed real workflow steps:

- `npm ci` passed.
- `npm run typecheck` failed.
- `npm run build` was skipped because typecheck failed.

The concrete main-branch TypeScript failure is in `src/app/api/admin/free-education/route.ts`: it imports five functions that were absent from `main`'s `src/lib/supabase-media.ts`:

- `listFreeLessonsAdmin`
- `listFreeTrainingStorageFiles`
- `registerFreeLessonFromStorage`
- `updateFreeLesson`
- `deleteFreeLesson`

The current PR branch already contains these exports in `src/lib/supabase-media.ts`, so this known main-branch typecheck blocker is covered by the PR changes.

Important: do not describe the previous main CI failure as runner/infrastructure failure. The latest inspected logs contain the actual TypeScript errors above.

## Cloudflare deployment

Production deployment must use:

`.github/workflows/deploy-cloudflare.yml`

Production flow:

`main push → npm ci → npm run cf:build → cloudflare/wrangler-action@v4 → Worker deploy`

The hardened deployment workflow exists on the PR branch. It:

- uses Node 22
- uses `npm ci`
- runs `npm run cf:build`
- uses Cloudflare Wrangler Action v4
- writes `.env.production` only during the build/deploy job
- removes `.env.production` with `if: always()`
- only executes the production job when `github.ref == 'refs/heads/main'`
- logs the deployment URL when provided

Do not claim a production deployment succeeded until the actual Deploy Cloudflare workflow run is observed as successful.

## PR branch CI state

The latest PR-head workflow runs for `dac9457ed64ca34a3733d6cc4dd17cbd997afdd6` were rerun.

GitHub returned completed failures whose jobs had no executable step list/logs available from the connector. This is distinct from the verified main-branch typecheck failure above. Do not invent a build error for these PR-head runs.

## Required validation order

```
npm ci
npm run typecheck
npm run build
npm run cf:build
```

For every code change:

1. Inspect current state.
2. Make the smallest safe change.
3. Typecheck.
4. Normal build.
5. Cloudflare/OpenNext build.
6. Relevant tests.
7. Security/regression review.
8. Commit.
9. Re-check PR and workflow status.
10. Continue to the next unresolved production issue.

Never claim a check passed unless it actually ran and passed.

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

Files, memory, and dynamic tools remain deferred until explicit least-privilege security boundaries exist.

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

## Product/UI constraints

Admin AI UI remains:

- mobile-first
- Persian RTL
- simple
- premium
- ChatGPT-like
- uncluttered

Do not restructure the application unnecessarily or break existing important features.

## Immediate next task

1. Keep PR #35 open and unmerged.
2. Re-check the PR head after the latest workflow reruns.
3. If GitHub exposes real steps, fix failures in order: `npm ci` → typecheck → build → `cf:build`.
4. Ensure the PR branch retains the free-education typecheck fix that is missing from current `main`.
5. Continue production audit of Admin AI without expanding scope.
6. Production deployment is only through `.github/workflows/deploy-cloudflare.yml` after changes reach `main`.

This file is the source of truth for continuation context.
