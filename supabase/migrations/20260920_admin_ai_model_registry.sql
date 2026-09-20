create table if not exists public.admin_ai_model_registry (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  model_id text not null,
  display_name text,
  enabled boolean not null default false,
  priority integer not null default 0,
  preferred boolean not null default false,
  capabilities jsonb not null default '{"chat": true}'::jsonb,
  status text not null default 'discovered',
  last_validated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider_id, model_id)
);
create index if not exists admin_ai_model_registry_routing_idx on public.admin_ai_model_registry (enabled, status, preferred desc, priority desc);

alter table public.admin_ai_model_registry enable row level security;
