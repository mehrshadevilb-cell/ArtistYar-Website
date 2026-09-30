# ArtistYar Day 3 — Migration History Reconciliation

**Date:** 2026-09-30  
**Production project:** `ejfgbiyfqjlqddbxvqhk`  
**Policy:** Do not reset production. Do not fabricate unverified history rows. Do not blindly replay repository migrations.

## Summary

| Source | Count |
|--------|------:|
| Repository `supabase/migrations/*.sql` | 54+ (includes Day 3 marker) |
| Production `supabase_migrations.schema_migrations` | 12 (11 prior + Day 3 marker) |

Most production objects were applied **before** consistent Supabase migration history tracking. Repository files remain the **intent archive**. Production schema is the **runtime source of truth**. Fresh environments cannot yet be built by replaying history alone.

## Production recorded migrations (authoritative history)

| Version | Name | Closest repo file | Status |
|---------|------|-------------------|--------|
| 20260926130728 | class_session_attendance | 20260925_class_session_attendance.sql | Applied and recorded (filename ≠ version) |
| 20260926130914 | admin_class_rls_and_audit_align | 20260926_admin_class_rls_and_audit_align.sql | Applied and recorded |
| 20260926213720 | telegram_plugins_reliability_production_repair | 20260925_telegram_plugins_reliability.sql | Applied and recorded (prod repair variant) |
| 20260926214015 | telegram_plugins_canonical_channel_production_repair | 20260927_telegram_plugins_canonical_channel.sql | Applied and recorded |
| 20260927135826 | telegram_plugins_caption_intelligence | 20260927_telegram_plugins_caption_intelligence.sql | Applied and recorded |
| 20260928154449 | telegram_plugin_multi_file | 20260928_telegram_plugin_multi_file.sql | Applied and recorded |
| 20260929133415 | phase4_control_center | 20260925_phase4_control_center.sql | Applied and recorded |
| 20260929173607 | lockdown_admin_sensitive_tables | 20260929_lockdown_admin_sensitive_tables.sql | Applied and recorded |
| 20260929174345 | admin_site_settings | 20260929_admin_site_settings.sql | Applied and recorded |
| 20260930104031 | harden_practice_rpc_security | 20260930_harden_practice_rpc_security.sql | Applied and recorded (Day 1) |
| 20260930112531 | ai_music_credit_charge_atomic | 20260930_ai_music_credit_charge_atomic.sql | Applied and recorded (Day 2) |
| (Day 3 marker) | day3_schema_reconciliation_baseline_marker | 20260930_day3_schema_reconciliation_baseline_marker.sql | Marker only |

## Classification rules

- **Applied and recorded** — present in production history; schema evidence matches.
- **Applied but unrecorded** — live objects exist; no matching history row; repo may contain creating migration.
- **Not applied** — repo migration defines objects absent from production.
- **Unsafe to replay** — data mutations, non-idempotent ALTER, or already-applied CREATE without IF NOT EXISTS.
- **Superseded / obsolete** — later repair migration replaced earlier intent.
- **Unknown** — cannot prove apply state without destructive experiment.

## Repository migrations (full set)

All files under `supabase/migrations/` are retained as historical intent. **None are deleted.**  
**None of the unrecorded files should be replayed against production.**

### Applied but unrecorded (schema evidence in production)

| Domain | Live tables / functions | Likely repo origin |
|--------|-------------------------|--------------------|
| Practice core | practice_records, practice_subscriptions, practice_daily_quota, practice_daily_consumptions, practice_daily_locks | 20260918_*, 20260923_* practice* |
| Practice RPCs | get/consume/refund_practice_daily_stage | 20260923_practice_* + Day 1 harden |
| AI music | ai_music_generation_*, ai_music_provider_* | 20260920_user_ai_music_generation.sql, 20260921_ai_music_provider_tokens.sql |
| Admin AI subset | admin_ai_conversations, messages, memory, usage, model_* | 20260920_admin_ai_* |
| Ecosystem | artistyar_projects*, user_learning_profiles, learning_roadmap_items | 20260922_user_centered_ecosystem.sql |
| Telegram | telegram_plugin_* | 20260923–28 telegram* |
| Media | media_assets | **No CREATE in repo** — pre-history / dashboard |
| Locks | practice_daily_locks | **No CREATE in repo** — pre-history or lost migration |

### Not applied (repo defines; production lacks)

These migrations must **not** be force-applied without a product decision:

- Admin AI control plane extras: admin_ai_agents, tasks, tools, prompts, providers, skills, activity, executions
- Education system: educational_* tables
- Hitnevis trainer: hitnevis_* tables
- Practice skill/audio lab: practice_skill_*, practice_ai_questions, practice_audio_sources, practice_voicing_*, practice_daily_missions, practice_payment_requests, practice_rewards

### Day 1 / Day 2 verification

| Object | Live | History |
|--------|------|---------|
| Practice RPC EXECUTE denied for anon/auth | Yes | harden_practice_rpc_security recorded |
| charge_ai_music_credits / refund_ai_music_credits | Yes, service_role only | ai_music_credit_charge_atomic recorded |

## Chosen strategy

**Strategy A + documentation baseline (not a squash, not fabricated history):**

1. Keep all historical SQL files in git as intent archive.
2. Treat production `schema_migrations` + live schema inventory as the runtime baseline.
3. Apply only forward migrations via Supabase tooling going forward (timestamped versions).
4. Do **not** insert synthetic rows for the 40+ unrecorded historical files.
5. Fresh environment procedure: restore from a production schema dump **or** selectively apply idempotent migrations after product triage of "Not applied" domains — **not** a blind full replay.

## Fresh deploy reproducibility

**Status: PARTIAL**

A greenfield database cannot be proven equivalent to production by replaying repository files alone because:

1. History version IDs ≠ filenames.
2. ~27 repo tables are not in production (would over-create).
3. media_assets / practice_daily_locks lack CREATE statements in repo.
4. Some production migrations were repair variants not identical to repo text.

## Safety rules going forward

1. New schema changes → new forward migration only.
2. Never edit applied historical files to "match" production.
3. Never `DROP SCHEMA public CASCADE` / `db reset` on production.
4. Day 1/Day 2 RPC grants must remain service_role-only.
