-- Practice Pro subscriptions (manual grant + payment approval)
create table if not exists public.practice_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  status text not null default 'active' check (status in ('active','cancelled','expired')),
  price_toman integer not null default 0,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists practice_subscriptions_user_idx
  on public.practice_subscriptions(user_id, status, expires_at desc);

create index if not exists practice_subscriptions_active_idx
  on public.practice_subscriptions(status, expires_at desc);

alter table public.practice_subscriptions enable row level security;

comment on table public.practice_subscriptions is 'ArtistYar Practice Pro subscriptions (manual admin grant and approved payments).';

-- Reload PostgREST schema cache so the table is visible immediately
notify pgrst, 'reload schema';
