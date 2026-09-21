-- AI runtime provider pool: encrypted credentials live in Supabase, not in runtime provider discovery.
alter table public.admin_ai_providers
  add column if not exists base_url text,
  add column if not exists api_key_encrypted text,
  add column if not exists provider_type text not null default 'openai_compat',
  add column if not exists priority integer not null default 100,
  add column if not exists cooldown_until timestamptz;

create index if not exists admin_ai_providers_enabled_priority_idx
  on public.admin_ai_providers(enabled, priority, id);
