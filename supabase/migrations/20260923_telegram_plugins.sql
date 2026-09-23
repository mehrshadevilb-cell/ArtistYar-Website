-- Telegram -> ArtistYar plugin catalog.
-- Files remain in Telegram; only metadata and Telegram file/message IDs are stored.
create extension if not exists pgcrypto;

create table if not exists public.telegram_plugin_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  photo_message_id bigint,
  document_message_id bigint,
  telegram_photo_file_id text,
  telegram_file_id text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  title text not null,
  developer text,
  version text,
  category text not null default 'other',
  formats text[] not null default '{}',
  platforms text[] not null default '{}',
  description text not null default '',
  features text[] not null default '{}',
  tags text[] not null default '{}',
  raw_caption text not null default '',
  telegram_post_url text,
  ai_provider text,
  ai_model text,
  status text not null default 'published' check (status in ('processing','published','failed','hidden')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id, document_message_id)
);

create index if not exists telegram_plugin_posts_created_idx on public.telegram_plugin_posts(created_at desc);
create index if not exists telegram_plugin_posts_category_idx on public.telegram_plugin_posts(category);
create index if not exists telegram_plugin_posts_status_idx on public.telegram_plugin_posts(status);

create table if not exists public.telegram_plugin_ingest_queue (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  message_id bigint not null,
  kind text not null check (kind in ('photo','document')),
  file_id text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  caption text not null default '',
  received_at timestamptz not null default now(),
  unique(channel_id, message_id)
);

create index if not exists telegram_plugin_queue_match_idx on public.telegram_plugin_ingest_queue(channel_id, kind, received_at desc);

alter table public.telegram_plugin_posts enable row level security;
alter table public.telegram_plugin_ingest_queue enable row level security;

drop policy if exists telegram_plugin_posts_public_read on public.telegram_plugin_posts;
create policy telegram_plugin_posts_public_read on public.telegram_plugin_posts for select using (status = 'published');
