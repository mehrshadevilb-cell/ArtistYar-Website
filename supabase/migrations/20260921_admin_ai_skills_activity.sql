-- Admin AI: persistent installed skills + activity log
create table if not exists public.admin_ai_skills (
  id text primary key,
  name text not null,
  description text not null default '',
  version text not null default '1.0.0',
  tools jsonb not null default '[]'::jsonb,
  system_prompt_extra text,
  enabled boolean not null default true,
  source text not null default 'github',
  source_url text,
  installed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ai_activity (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  message text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_ai_activity_created_idx
  on public.admin_ai_activity (created_at desc);

alter table public.admin_ai_skills enable row level security;
alter table public.admin_ai_activity enable row level security;
