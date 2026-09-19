create table if not exists public.practice_ai_questions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  game_id text not null,
  level integer not null default 1,
  fingerprint text not null,
  question jsonb not null,
  created_at timestamptz not null default now()
);
create unique index if not exists practice_ai_questions_fingerprint_idx on public.practice_ai_questions(user_id, game_id, fingerprint);
create index if not exists practice_ai_questions_user_game_created_idx on public.practice_ai_questions(user_id, game_id, created_at desc);
alter table public.practice_ai_questions enable row level security;