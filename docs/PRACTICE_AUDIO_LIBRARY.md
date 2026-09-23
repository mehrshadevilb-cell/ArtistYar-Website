# Practice Audio Content Library

## Architecture
- **Builtin synthetic catalog** (`practice-audio-library.ts`) — always available offline
- **DB table** `practice_audio_sources` — admin can add recipes or storage paths
- **Selection** `selectAudioSource({ exerciseId, seed, difficulty, recentIds })`
- **Fallback** pink noise — never silent/broken

## Categories
vocals, drums, kick, snare, percussion, bass, piano, guitar, synth, strings, fx, full_mix, vocal_instrumental, stems

## APIs
- `GET /api/practice/audio-library` — public metadata catalog
- `GET /api/practice/audio-library?exerciseId=&seed=` — selection preview
- `GET|POST|PATCH /api/admin/practice/audio-sources` — admin only

## Variety
Recent-source ring (12) penalizes repeats; preferred category + compatible exercise boost rank.

## SQL
Run `20260923_practice_audio_library.sql` or paste into Supabase.
