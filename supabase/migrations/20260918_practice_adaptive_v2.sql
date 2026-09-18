-- Adaptive Practice v2
-- XP remains gamification. Listening skill is calculated from accuracy,
-- consistency, reaction time and demonstrated difficulty.

alter table public.practice_skill_events
  add column if not exists response_time_ms integer,
  add column if not exists session_id text,
  add column if not exists item_key text;

create index if not exists practice_skill_events_session_idx
  on public.practice_skill_events(user_id, session_id, created_at desc);

create index if not exists practice_skill_events_item_idx
  on public.practice_skill_events(user_id, game_id, item_key, created_at desc);

comment on column public.practice_skill_events.response_time_ms is 'Client response latency for adaptive difficulty analytics.';
comment on column public.practice_skill_events.session_id is 'Practice session identifier.';
comment on column public.practice_skill_events.item_key is 'Stable exercise/question identifier when available.';
