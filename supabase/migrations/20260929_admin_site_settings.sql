create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

comment on table public.site_settings is 'Server-managed site configuration. Public/browser access is intentionally denied; admin APIs use the service role.';
