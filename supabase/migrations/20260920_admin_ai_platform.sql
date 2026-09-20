-- Admin AI Platform: memory + usage/cost tracking
create table if not exists public.admin_ai_memory (
  id uuid primary key default gen_random_uuid(),
  admin_username text not null,
  scope text not null default 'project',
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_username, scope, key)
);
create index if not exists admin_ai_memory_admin_updated_idx
  on public.admin_ai_memory (admin_username, updated_at desc);

create table if not exists public.admin_ai_usage (
  id uuid primary key default gen_random_uuid(),
  admin_username text not null,
  feature text not null,
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_ai_usage_admin_created_idx
  on public.admin_ai_usage (admin_username, created_at desc);

alter table public.admin_ai_memory enable row level security;
alter table public.admin_ai_usage enable row level security;
