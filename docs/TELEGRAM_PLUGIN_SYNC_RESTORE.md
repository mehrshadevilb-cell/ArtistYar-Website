# CRITICAL — Restore telegram-plugin-sync.ts

`src/lib/telegram-plugin-sync.ts` on `main` is currently a placeholder (`PLACEHOLDER_WILL_REPLACE`).
This must be restored before Telegram plugin processing will work in production.

## Restore (preferred)

From a machine with the Day 5 agent artifact:

```bash
cp path/to/telegram-plugin-sync.DAY5_RESTORED.ts src/lib/telegram-plugin-sync.ts
# or
cp path/to/telegram-plugin-sync.RESTORE.ts src/lib/telegram-plugin-sync.ts
```

Integrity check (must all pass):

```bash
grep -q 'export async function enqueuePluginMessage' src/lib/telegram-plugin-sync.ts
grep -q 'export async function processPendingPluginPairs' src/lib/telegram-plugin-sync.ts
grep -q 'ARTISTYAR_TELEGRAM_PROCESSOR_OWNER' src/lib/telegram-plugin-sync.ts
test $(wc -c < src/lib/telegram-plugin-sync.ts) -gt 20000
```

Then:

```bash
git add src/lib/telegram-plugin-sync.ts
git commit -m "fix: restore telegram-plugin-sync.ts after Day 5 truncation"
git push origin main
```

## Notes

- Day 5 health/liveness/readiness and instrumentation shutdown are already on `main` and do not depend on this file.
- After restore, the in-module processor auto-start remains gated by `ARTISTYAR_TELEGRAM_PROCESSOR_OWNER=sync-module` so only `src/instrumentation.ts` owns the interval by default.
- Optional: `ARTISTYAR_DISABLE_INLINE_TELEGRAM_PROCESSOR=1` to rely on Render cron only.
