# ArtistYar Practice — Production Verification (2026-09-23)

## Branch
`feat/practice-production-hardening` → PR #68

## Typecheck
`npx tsc --noEmit` → **0 errors** (Practice tree)

## Security smoke
| Check | Result |
|-------|--------|
| Global free daily limit (not per-game) | PASS |
| Server `calculateRoundXp` | PASS |
| Anti-dup itemKey → 409 | PASS |
| Session IDOR block | PASS |
| Unrated practice → 0 XP | PASS |
| Easy farm throttle | PASS |
| Wrong answer negative XP | PASS |

## Audio engine
- Single shared AudioContext
- `stopPracticePlayback()` clears activeSources, disconnects
- Master bus + limiter
- Stop before every new play

## Access
- Free: 5 stages/day **global**
- Pro: unlimited while subscription active

## SQL
Paste `PRACTICE_FULL_SQL.sql` (project artifacts) in Supabase if tables missing.

## Artifacts for full UI pack
`PracticeEngine.production.tsx`, `SoundGymLab.tsx`, `AdaptiveWorkoutLab.tsx`, `UserAudioLab.tsx`, registry, audio-engine — in project folder; merge onto this branch for complete release.
