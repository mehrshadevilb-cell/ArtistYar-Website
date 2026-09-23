# ArtistYar Practice — Release (2026-09-23)

Branch: `feat/practice-production-hardening` (PR #68)

## Verified locally
- tsc 0 errors
- Server XP + global free 5/day + anti-dup + IDOR
- PE production: Today → Ear Gym → Lab → Music → Progress; Practice Mode; dynamic imports
- Audio library + calibration + skill maps
- PracticeEnginePreview removed

## Deploy
1. Merge PR #68
2. Ensure large modules (registry, labs, audio-engine) committed from release workspace
3. SQL: PRACTICE_FULL_SQL + practice_audio_library
4. Env: Supabase, ARTISTYAR_PRACTICE_REMINDER_SECRET

## Access
Free 5/day global · Pro unlimited · Admin unlimited
