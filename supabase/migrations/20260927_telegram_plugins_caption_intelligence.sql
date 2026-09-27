-- Telegram plugin caption intelligence v3.
-- Preserve original source data while storing verification/evidence separately.
alter table public.telegram_plugin_posts
  add column if not exists final_caption text not null default '',
  add column if not exists draft_caption text not null default '',
  add column if not exists ai_analysis jsonb not null default '{}'::jsonb,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists verification_status text not null default 'unavailable',
  add column if not exists verification_confidence text not null default 'low',
  add column if not exists verified_source_url text,
  add column if not exists verified_source_title text,
  add column if not exists search_status text not null default 'unavailable',
  add column if not exists detected_language text,
  add column if not exists review_required boolean not null default false;

create index if not exists telegram_plugin_posts_review_idx
  on public.telegram_plugin_posts(review_required, updated_at desc);

create table if not exists public.telegram_plugin_verification_cache (
  cache_key text primary key,
  product_name text not null,
  developer text,
  version text,
  verification jsonb not null,
  source_url text,
  verified_at timestamptz not null default now()
);

create index if not exists telegram_plugin_verification_cache_verified_idx
  on public.telegram_plugin_verification_cache(verified_at desc);

alter table public.telegram_plugin_verification_cache enable row level security;

notify pgrst, 'reload schema';
