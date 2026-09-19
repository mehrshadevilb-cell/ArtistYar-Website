create table if not exists public.practice_voicing_questions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  day_key text not null,
  fingerprint text not null,
  question jsonb not null,
  created_at timestamptz not null default now()
);
create unique index if not exists practice_voicing_questions_user_fp_idx on public.practice_voicing_questions(user_id, fingerprint);
create index if not exists practice_voicing_questions_user_created_idx on public.practice_voicing_questions(user_id, created_at desc);
alter table public.practice_voicing_questions enable row level security;

create index if not exists practice_records_voicing_idx on public.practice_records(game_id, played_at desc) where game_id = 'voicing';
create index if not exists practice_subscriptions_created_idx on public.practice_subscriptions(created_at desc);
comment on table public.practice_voicing_questions is 'Per-student non-repeating adaptive daily voicing questions.';
