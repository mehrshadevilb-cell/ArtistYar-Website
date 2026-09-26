-- Phase 7.5 + Phase 8: Frequency Memory training context + skill mastery foundation
-- Additive only. Skills recompute from practice_skill_events metadata.

alter table public.practice_skill_profiles
  add column if not exists frequency_skill_snapshot jsonb not null default '{}'::jsonb;

alter table public.practice_skill_profiles
  add column if not exists last_training_focus text;

comment on column public.practice_skill_profiles.frequency_skill_snapshot is
  'Optional cached FrequencySkillProfile. Recomputed from events when missing.';

comment on column public.practice_skill_profiles.last_training_focus is
  'Last suggested training focus (precision|consistency|difficulty|range|general).';

comment on column public.practice_skill_events.metadata is
  'Round metadata. Frequency Memory may include sessionId, trainingFocus, targetHz, guessHz, errorHz.';
