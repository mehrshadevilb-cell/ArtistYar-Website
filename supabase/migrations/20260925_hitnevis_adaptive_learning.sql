-- HitNevis adaptive learning
-- Stores only derived feedback/features, never lyric text or model prompts.

create table if not exists public.hitnevis_feedback (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  signal text not null check (signal in ('positive','negative','used','rejected')),
  feature_version text not null default '1.0',
  feature_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hitnevis_feedback_created_at_idx
  on public.hitnevis_feedback (created_at desc);

create index if not exists hitnevis_feedback_mode_signal_idx
  on public.hitnevis_feedback (mode, signal, created_at desc);

create table if not exists public.hitnevis_adaptive_profile (
  id boolean primary key default true check (id),
  profile jsonb not null default '{}'::jsonb,
  sample_count integer not null default 0,
  generated_at timestamptz not null default now()
);

insert into public.hitnevis_adaptive_profile (id)
values (true)
on conflict (id) do nothing;

alter table public.hitnevis_feedback enable row level security;
alter table public.hitnevis_adaptive_profile enable row level security;

revoke all on public.hitnevis_feedback from anon, authenticated;
revoke all on public.hitnevis_adaptive_profile from anon, authenticated;

grant all on public.hitnevis_feedback to service_role;
grant all on public.hitnevis_adaptive_profile to service_role;
