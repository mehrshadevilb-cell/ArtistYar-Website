# CRITICAL — Restore telegram-plugin-sync.ts

During Day 5 tooling, `src/lib/telegram-plugin-sync.ts` was accidentally truncated on `main`.

## Immediate restore

```bash
git show 0fd93340e828abbee0a800537beda9acb8a21281:src/lib/telegram-plugin-sync.ts > src/lib/telegram-plugin-sync.ts
git add src/lib/telegram-plugin-sync.ts
git commit -m "fix: restore telegram-plugin-sync.ts after truncation"
git push origin main
```

Or copy from agent artifact `telegram-plugin-sync.RESTORE.ts` if available.

Optional Day 5 processor-owner guard (after restore): ensure module auto-start is gated by `ARTISTYAR_TELEGRAM_PROCESSOR_OWNER=sync-module` so only `instrumentation.ts` runs the in-process interval by default.
