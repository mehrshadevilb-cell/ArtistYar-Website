# Production Audit — 2026-09-19

## Scope
Repository audit focused on production-critical authentication, practice APIs, browser media processing, separation, CI/deployment configuration, and failure paths. The project-wide audit prompt is the governing checklist.

## Critical / High findings fixed

### 1. Practice identity/quota spoofing
- **Problem:** practice analysis endpoints trusted client-supplied `userId`, `telegramId`, and in one flow a client-supplied `role=admin`.
- **Root cause:** authorization identity was read from multipart/query parameters instead of the signed server session.
- **Fix:** `/api/practice/music-analyzer` and `/api/practice/analyze` now resolve admin/student identity from the HTTP-only signed session cookies.
- **Verification:** source inspection confirms quota and course/subscription lookups use the authenticated session identity.

### 2. Production login fallback stored credentials in browser storage
- **Problem:** client login could fall back to localStorage-backed local accounts when the API was unavailable.
- **Risk:** plaintext local credentials are not an acceptable production authentication mechanism.
- **Fix:** local fallback is now limited to non-production builds. Production login remains server/backend based.
- **Verification:** `src/lib/auth.ts` gates both fallback paths on `process.env.NODE_ENV !== "production"`.

### 3. Browser stem-separation memory exhaustion
- **Problem:** browser Demucs expanded audio to large Float32 buffers while retaining four full-length stem buffers, normalized audio, ZIP/WAV buffers, and the ONNX model. Large files could surface as browser `AbortError`/WASM failures.
- **Fix:** local browser separation is capped at 30 MB; large files use the configured HQ server path instead of attempting a memory-heavy local run.
- **Additional fix:** model loading no longer retains every streamed chunk plus a second combined model buffer.
- **Failure handling:** if a large HQ server request fails, the UI no longer falls back to the local memory-heavy path.
- **Verification:** source inspection confirms the guards and memory reduction are in the active `main` branch.

## Architecture observations

- The site is a Next.js 15 / React 19 application deployed through OpenNext to Cloudflare Workers.
- Supabase is used for media/practice data.
- RahYar is used as the shared backend for student authentication/course state.
- UVR separation is a separate worker service; the current website proxy still performs synchronous multipart parsing and synchronous upstream processing.
- GitHub-based AI development is restricted to admin sessions and creates `ai/*` branches/Draft PRs rather than writing directly to `main`.

## Remaining production risks

1. **Synchronous UVR proxy:** `/api/separation` accepts a large multipart request and waits synchronously for the worker with a 55-second timeout. Long-running separation can still produce 502/timeout behavior. The durable solution is an asynchronous job/upload architecture (or direct signed upload + job polling) in the UVR worker.
2. **Media admin upload:** `/api/media` buffers uploaded files into Node `Buffer` objects before sending them to Supabase. It is capped at 50 MB, but large uploads still create avoidable server memory pressure.
3. **Anonymous mix-analysis quota:** the public `/api/practice/analyze` path intentionally remains usable without a session, so its anonymous quota is not persisted per user. A production anti-abuse layer should use a durable rate-limit keyed by an anonymous session/IP or require login for that operation.
4. **CI verification:** repository workflow files are present and the lockfile is now synchronized, but the GitHub connector did not expose workflow runs for the latest commits, so a successful remote build/typecheck cannot be claimed from this audit session.
5. **Live-site verification:** direct access to the deployed domain was unavailable from the web inspection tool, so live production HTTP behavior was not independently verified.

## Audit status

**Not production-complete yet.** The fixes above address confirmed security and browser-memory issues, but the remaining asynchronous media-processing and verification gaps prevent a claim that the full project-wide production goal has been reached.


## Follow-up fixes — 2026-09-19

- Practice identity is now bound to the signed user session for progress, status/limits, and AI question generation. Client-supplied user IDs can no longer redirect XP, daily usage, subscription checks, or generated-question history to another account.
- Admin free-training video/thumbnail uploads no longer send the binary through the Next.js request body. The admin requests a short-lived Supabase signed upload URL and uploads the file directly to Storage from the browser, avoiding the previous 1 GB Node multipart-buffering path that could surface as HTTP 502.
- The signed-upload ticket validates the declared client file size before issuing the upload URL.
- GitHub Actions verification is running against the latest main commit; the result must be observed before calling the change fully verified.
