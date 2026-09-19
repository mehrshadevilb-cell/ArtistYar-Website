create table if not exists public.admin_ai_model_health (
  provider_id text not null,
  model_id text not null,
  consecutive_failures integer not null default 0,
  success_count bigint not null default 0,
  failure_count bigint not null default 0,
  cooldown_until timestamptz,
  last_error text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (provider_id, model_id)
);
create index if not exists admin_ai_model_health_cooldown_idx on public.admin_ai_model_health (cooldown_until);
alter table public.admin_ai_model_health enable row level security;
