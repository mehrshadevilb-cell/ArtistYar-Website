# ArtistYar and RahYar Production Audit Report

**Audit scope:** `ArtistYar-Website` and the shared `RahYar-Academy-Management-System-V14` backend.

**Audit date:** 2026-09-19.

## Executive conclusion

The audited codebases are materially more robust after this pass. The website now passes a clean dependency installation, TypeScript validation, production build, source scan, and production dependency audit. The shared backend passes its complete automated suite after correcting eleven AI-provider routing regressions uncovered during the audit.

The system should **not yet be declared fully production-ready** under the supplied launch standard. The remaining limitation is verification scope rather than a known failing automated check: this sandbox did not have production credentials, a live database, a configured Supabase bucket, a deployed RahYar API, a GPU worker, payment provider access, or a real browser session. Therefore, live end-to-end authentication, payment, storage, media-processing, webhook, proxy-timeout, and cross-service flows remain unverified.

## Critical and high-priority findings

### AI provider routing regressions

The RahYar router was unintentionally importing ambient provider environment variables in addition to explicit JSON, database, and legacy environment configuration. This caused unrelated credentials injected by the runtime to appear as providers, changed provider ordering, broke fallback expectations, and caused gateway URL tests to select the wrong provider.

Normal chat also probed optional `/models` catalog endpoints even when a model had been explicitly configured. That added an unnecessary network dependency and caused transient-failure behavior to make extra requests. Finally, when all models were in cooldown, the router could fall through to a generic retry interval instead of reporting the actual remaining cooldown.

**Impact:** incorrect provider selection, unnecessary upstream requests, inaccurate failover behavior, and misleading retry timing.

**Status:** fixed and verified by the focused provider suite and the full backend suite.

### Unbounded public request bodies

The public login, AI chat, student-registration, order, and separation gateway routes did not enforce an early request-size limit before parsing or forwarding request bodies.

**Impact:** avoidable memory and upstream-cost exposure, especially on JSON forwarding and multipart media routes.

**Status:** fixed with explicit request-size guards. The route-level limits are 16 KiB for login, 256 KiB for AI chat, 64 KiB for registration and orders, and 252 MiB for the separation gateway.

### Upstream and inference error disclosure

The public AI chat and separation gateway could return provider or worker exception text directly to clients. That can expose implementation details and upstream response information.

**Status:** fixed. Technical exceptions are logged server-side while clients receive generic retryable messages.

### UVR worker secret comparison

The private UVR worker compared the shared secret using ordinary string equality and returned the underlying inference exception text in a 500 response.

**Status:** fixed. The worker now uses `hmac.compare_digest`, logs the exception server-side, and returns a generic inference error.

### Production dependency vulnerability

The initial `npm audit` reported one high and one moderate transitive vulnerability involving PostCSS resolved through the installed Next.js dependency tree.

**Status:** fixed without a Next.js major upgrade by adding an npm override for patched `postcss@8.5.28`. A clean audit now reports zero vulnerabilities.

## Changes made

| Area | Files changed | Result |
|---|---|---|
| Login request hardening | `src/app/api/auth/login/route.ts` | Added request-size guard and expired rate-limit entry cleanup. |
| AI chat hardening | `src/app/api/ai/chat/route.ts` | Added request-size guard, cleaned expired rate-limit state, and removed provider error details from responses. |
| Registration forwarding | `src/app/api/rahyar/students/register/route.ts` | Added request-size guard before forwarding to RahYar. |
| Order forwarding | `src/app/api/rahyar/orders/route.ts` | Added request-size guard before parsing and forwarding. |
| Separation gateway | `src/app/api/separation/route.ts` | Added multipart request-size guard and genericized non-timeout worker errors. |
| UVR worker | `services/uvr-worker/app.py` | Added constant-time secret comparison and genericized inference failures. |
| AI provider routing | `src/ai/provider_router.py` | Stopped ambient provider contamination when explicit configuration exists, avoided unnecessary catalog probes for pinned models, and returned accurate cooldown intervals. |
| Dependency remediation | `package.json`, `package-lock.json` | Pinned PostCSS to `8.5.28` through npm overrides. |

## Verification performed

### ArtistYar website

The clean verification command completed successfully:

```text
npm ci                         passed
npm run typecheck              passed
node scripts/scan-codebase.js  passed; 0 missing alt-text findings
npm run build                  passed
npm audit --omit=dev           passed; 0 vulnerabilities
```

The production build compiled all listed application pages and API routes successfully. The repository scanner reported two raw `<img>` usage locations but no missing `alt` attributes. These are intentional dynamic Supabase/Instagram media URLs for which a static Next.js remote allowlist would be unsafe; they now use explicit lazy-loading or asynchronous decoding where appropriate.

### RahYar backend

The complete backend verification command completed successfully:

```text
python3 -m compileall -q src scripts       passed
py_compile UVR worker                     passed
pytest -q                                 206 passed, 1 third-party warning
```

The focused regression suite for AI routing and provider health also passed independently:

```text
19 passed in 0.79s
```

All project-owned `datetime.utcnow()` usages were removed. The single remaining warning originates in the installed Passlib dependency importing Python's deprecated `crypt` module; it is external to this repository and does not cause test failures.

## Remaining issues and unverified areas

The following items prevent a final unconditional production-readiness declaration:

1. **Live end-to-end flows were not executed.** Authentication, session expiry, role restrictions, course access, practice persistence, admin operations, storage uploads, payment status changes, and cross-service RahYar synchronization require deployed services and valid credentials.
2. **Rate limiting is process-local.** Login and AI chat limits use bounded in-memory maps, preventing unbounded memory growth but not coordinating across multiple instances. Production deployment should use a trusted proxy identity and a shared rate-limit store such as Redis or an equivalent platform facility.
3. **Media and GPU behavior remains environment-dependent.** Large uploads, reverse-proxy limits, FFmpeg/WASM behavior, worker queue saturation, model downloads, GPU memory, and interrupted downloads require testing on the actual deployment topology.
4. **Payment and webhook verification remains untested live.** No payment provider credentials or webhook deliveries were available in this audit environment.
5. **One third-party warning remains.** Passlib currently imports Python's deprecated `crypt` module. This should be addressed through a compatible Passlib replacement or dependency update before Python 3.13 becomes the runtime baseline.
6. **Raw image usage remains dynamic by design.** The two raw-image locations have explicit accessibility text where applicable and optimized loading/decoding attributes. Actual layout stability should still be confirmed in a real browser audit.

## Final production-readiness status

**Status: NOT YET FULLY PRODUCTION-READY; automated verification is green, but live integration verification is still required.**

The code-level fixes from this audit are complete and verified. The remaining work is to deploy or expose a staging-equivalent environment, execute authenticated browser and API journeys, test real storage/payment/AI/GPU integrations, confirm reverse-proxy limits and timeouts, and resolve any failures found there.

## References

[1]: https://github.com/mehrshadevilb-cell/ArtistYar-Website "ArtistYar Website repository"
[2]: https://github.com/mehrshadevilb-cell/RahYar-Academy-Management-System-V14 "RahYar Academy Management System repository"
[3]: https://github.com/advisories/GHSA-qx2v-qp2m-jg93 "PostCSS security advisory"
