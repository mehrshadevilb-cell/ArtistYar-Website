-- Phase 5 adaptive: micro skill events + daily workouts
create table if not exists public.practice_micro_skill_events (
  id bigserial primary key,
  user_id text not null,
  micro_skill text not null,
  game_id text not null,
  exercise_id text,
  correct boolean not null default false,
  accuracy numeric not null default 0,
  difficulty integer not null default 1,
  response_time_ms integer,
  xp integer not null default 0,
  rated boolean not null default true,
  item_key text,
  fingerprint text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists practice_micro_skill_events_user_idx on public.practice_micro_skill_events (user_id, created_at desc);
create index if not exists practice_micro_skill_events_skill_idx on public.practice_micro_skill_events (user_id, micro_skill, created_at desc);

create table if not exists public.practice_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  workout_date date not null default (timezone('utc', now()))::date,
  plan jsonb not null,
  minutes integer not null default 12,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  summary jsonb
);
create unique index if not exists practice_workouts_user_date_uidx on public.practice_workouts (user_id, workout_date);
