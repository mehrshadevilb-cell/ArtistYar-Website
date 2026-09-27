-- Telegram plugin product intelligence hardening.
alter table public.telegram_plugin_posts
  add column if not exists processing_state text not null default 'RECEIVED',
  add column if not exists product_locked boolean not null default false,
  add column if not exists product_locked_at timestamptz,
  add column if not exists product_locked_by text,
  add column if not exists latest_official_version text,
  add column if not exists product_count integer not null default 1,
  add column if not exists included_products text[] not null default '{}',
  add column if not exists file_identity jsonb not null default '{}'::jsonb,
  add column if not exists admin_feedback jsonb not null default '[]'::jsonb;

alter table public.telegram_plugin_posts
  drop constraint if exists telegram_plugin_posts_processing_state_check;

alter table public.telegram_plugin_posts
  add constraint telegram_plugin_posts_processing_state_check
  check (processing_state in ('RECEIVED','ANALYZING','IDENTIFIED','VERIFYING','GENERATING','VALIDATING','READY','PUBLISHED','NEEDS_REVIEW','FAILED'));

create index if not exists telegram_plugin_posts_processing_state_idx
  on public.telegram_plugin_posts(processing_state, updated_at desc);

create index if not exists telegram_plugin_posts_product_lock_idx
  on public.telegram_plugin_posts(product_locked, updated_at desc);

notify pgrst, 'reload schema';
