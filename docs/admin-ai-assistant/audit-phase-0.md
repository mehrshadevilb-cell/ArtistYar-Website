# RahYar Admin AI Assistant — Phase 0 Audit

Date: 2026-09-20
Repository: `mehrshadevilb-cell/ArtistYar-Website`
Baseline ref: `main`

## Current architecture snapshot

- Next.js 15 + React 19 + TypeScript.
- Admin area is protected by `ADMIN_SESSION_COOKIE` and `verifyAdminSession`.
- Current login exposes one admin identity from `ARTISTYAR_ADMIN_USERNAME/PASSWORD`; student sessions are separate.
- Existing public/user AI endpoint is `/api/ai/chat` and is music/ArtistYar scoped.
- Existing `/admin/ai` exposes Multi-Agent and coding/development workflows.
- Provider integration lives in `src/lib/ai-providers.ts` and already has multiple provider adapters, model discovery and fallback.
- Coding/repository agent code exists under `src/lib/coding-agent/*` and `src/lib/github-agent.ts`.
- Supabase service-role access is already available to server-side modules.

## Scope decision

The new Admin AI Assistant is a separate conversational product. It must not call or expose the existing Multi-Agent/coding-agent runtime, repository write access, music analyzer, audio analysis, or user-chat capabilities.

## Phase 1 boundary

Implemented in this branch:
1. Admin-only backend boundary.
2. Separate Admin Assistant conversation/message storage.
3. Separate Admin Assistant audit stream.
4. Dedicated conversational UI route.
5. Reuse of the existing provider abstraction without coupling to a specific model.
6. No tools, no Multi-Agent, no repository access, no music/audio analysis.

## Known gaps

- Owner is not represented by the current web login contract; the current production login exposes one admin identity. A future role migration is required for an independent Owner/Admin matrix.
- Persistent Model Registry extraction is deferred to Phase 2.
- Streaming, files, memory, background jobs, cost dashboard and dynamic tools are deferred.

## Security findings addressed

- The new Admin Assistant endpoint verifies the admin session server-side on every request.
- Conversation IDs are resolved with an admin owner scope.
- Secrets remain server-side; provider responses are not written to audit logs.
- User AI and Admin AI use different API routes and different system prompts.

## Baseline

Baseline commit: `688d4b49af1725429aa793d921bb20c453bc47dd`. Existing music-analyzer and coding-agent features remain in the wider product and are outside this Assistant scope.