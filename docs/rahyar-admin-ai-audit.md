# RahYar Admin AI Assistant — Phase 0 Audit

Date: 2026-09-19
Repository: `mehrshadevilb-cell/ArtistYar-Website`
Baseline branch: `main`
Implementation branch: `feat/rahyar-admin-ai-assistant`

## 1. Executive finding

The repository currently contains an admin AI page and several admin-protected AI routes, but the current admin experience is a development/coding center rather than the requested simple conversational Admin Assistant. The current implementation also contains explicit Multi-Agent and coding-agent paths that are outside the approved production scope.

The existing public assistant is a separate user-facing product and must remain independent.

## 2. Current architecture inventory

### User Chat Bot

- UI: `src/app/assistant/page.tsx`
- API: `src/app/api/ai/chat/route.ts`
- Shared provider layer: `src/lib/ai-providers.ts`
- Public floating entry point: `src/components/FloatingAssistant.tsx`
- Current behavior: domain-focused RahYar educational chat, IP-based in-memory rate limiting, non-streaming JSON response.

### Admin AI

- UI: `src/app/admin/ai/page.tsx`
- Admin route guard: `src/app/admin/layout.tsx`
- Admin session verifier: `src/lib/server-admin-auth.ts`
- Existing provider status: `/api/rahyar/ai-status`
- Current behavior: development/coding workflow UI, Multi-Agent execution, and task-oriented agent controls.

### Existing admin-protected AI routes

- `/api/ai/agent` → calls `runMultiAgent`.
- `/api/ai/develop` → development-agent workflow.
- `/api/admin/coding-agent` → GitHub workspace and development task execution.
- `/api/ai/providers` → provider/model discovery without an explicit admin guard.

### AI infrastructure

- `src/lib/ai-providers.ts` already contains provider discovery, multiple provider configuration, model selection inputs, and failover-related behavior.
- `src/lib/ai-agent.ts` contains Multi-Agent/development orchestration and must not be used by the new Admin Assistant core.
- Existing database migrations contain practice and media schemas; no dedicated Admin Assistant conversation/permission schema was found in the inspected migrations.

## 3. Scope decisions

### Preserve

- Existing user chat bot and its route contract.
- Existing admin login/session mechanism as the initial authentication seam.
- Existing provider environment variables and backend-only secret handling.
- Existing admin dashboard and unrelated admin modules.
- Existing AI provider adapters where compatible with the new interface.

### Isolate or deprecate from the new Admin Assistant

- Multi-Agent route and UI.
- Development/coding-agent route and UI.
- Repository access, code inspection, command execution, build/test execution, write access, and deployment tools.
- Music Analyzer, Audio Analysis, Mix Analysis, Arrangement Analysis, and separation functionality.

These paths should not be deleted in Phase 0. They require a separate migration/deprecation decision and regression coverage before removal or disabling.

## 4. Critical risks

| ID | Risk | Severity | Initial mitigation |
|---|---|---:|---|
| R1 | Admin UI is coupled to Multi-Agent/coding workflows | Critical | Build a new conversational surface and keep old UI isolated until migration validation |
| R2 | `/api/ai/providers` has no visible admin authorization guard | High | Add backend admin authorization before exposing provider management |
| R3 | No dedicated conversation scope/schema was found | High | Add Admin Assistant conversation/message tables with strict owner/admin scope |
| R4 | Admin and user AI share provider infrastructure | Medium | Share adapters only; separate prompts, storage, permissions, and routes |
| R5 | Existing provider layer is broad and dynamic | Medium | Introduce a narrow typed interface and registry seam without exposing secrets |
| R6 | Existing coding-agent routes can perform repository operations | Critical | Keep outside new Assistant routing; add explicit deny/legacy boundary and audit |
| R7 | Streaming/cancellation are not established in the current chat route | High | Implement after conversation core and provider adapter contract |

## 5. Baseline

- Framework: Next.js App Router, React, TypeScript, Node.js route handlers, Cloudflare/OpenNext deployment.
- Authentication: signed HTTP-only admin and user session cookies.
- User/admin separation: route-level admin layout exists; API-level enforcement is inconsistent and must be audited route by route.
- Test/build scripts: `npm run typecheck`, `npm run build`, `npm run lint`; no dedicated test script is currently visible in `package.json`.
- Production deploy: GitHub Actions deploys `main` to Cloudflare Workers.
- No production changes are made by this audit commit.

## 6. Proposed migration sequence

1. Add a dedicated Admin Assistant backend module and strict admin authorization helper.
2. Add database migrations for admin conversations, messages, model registry, and audit events.
3. Add a narrow provider adapter/registry seam around existing provider code.
4. Add non-streaming conversational core with stored history and deterministic error handling.
5. Add capability-aware model routing and bounded fallback.
6. Add read-only general tools only after permission and audit contracts exist.
7. Add streaming/cancellation and then replace the current admin AI UI with a simple workspace.
8. Add context limits, file context, observability, cost metrics, and model management incrementally.
9. Run security, regression, build, typecheck, and staging verification before merge.

## 7. Phase 0 acceptance status

- Architecture and route inventory: complete for inspected AI/admin surfaces.
- Scope boundary: defined.
- Critical risks: registered with initial mitigations.
- Baseline: recorded.
- Database schema audit: dedicated Admin Assistant schema is missing and is a Phase 1 prerequisite.
- Full repository-wide removal audit: not yet complete; no destructive deletion is authorized before route-level tests and migration mapping.

Next implementation step: Phase 1 security boundary and independent Admin Assistant conversation schema.