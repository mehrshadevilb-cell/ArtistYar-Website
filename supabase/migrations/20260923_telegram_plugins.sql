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


-- Hardening: plugin ingestion never downloads documents; only photo bytes are used for AI.
-- Queue rows are claimed atomically so webhook background processing and cron cannot
-- process the same photo/document pair concurrently.
alter table public.telegram_plugin_ingest_queue
  add column if not exists processing_at timestamptz;

create index if not exists telegram_plugin_queue_file_idx
  on public.telegram_plugin_ingest_queue(channel_id, kind, file_id);

-- Remove duplicate queue events for the exact same Telegram file, keeping the newest.
delete from public.telegram_plugin_ingest_queue q
where q.id in (
  select id from (
    select id,
           row_number() over (
             partition by channel_id, kind, file_id
             order by received_at desc, id desc
           ) as rn
    from public.telegram_plugin_ingest_queue
  ) d
  where d.rn > 1
);

create unique index if not exists telegram_plugin_queue_file_unique
  on public.telegram_plugin_ingest_queue(channel_id, kind, file_id);

-- Remove duplicate catalog rows for the exact same Telegram document file,
-- keeping the newest successful row.
delete from public.telegram_plugin_posts p
where p.id in (
  select id from (
    select id,
           row_number() over (
             partition by channel_id, telegram_file_id
             order by updated_at desc, created_at desc, id desc
           ) as rn
    from public.telegram_plugin_posts
  ) d
  where d.rn > 1
);

create unique index if not exists telegram_plugin_posts_file_unique
  on public.telegram_plugin_posts(channel_id, telegram_file_id);

create or replace function public.claim_telegram_plugin_pair(
  p_photo_id uuid,
  p_document_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  update public.telegram_plugin_ingest_queue
  set processing_at = now()
  where id in (p_photo_id, p_document_id)
    and (
      processing_at is null
      or processing_at < now() - interval '10 minutes'
    );

  get diagnostics claimed = row_count;

  if claimed = 2 then
    return true;
  end if;

  -- If only one row was claimed, release it immediately.
  if claimed > 0 then
    update public.telegram_plugin_ingest_queue
    set processing_at = null
    where id in (p_photo_id, p_document_id);
  end if;

  return false;
end;
$$;

revoke all on function public.claim_telegram_plugin_pair(uuid, uuid) from public;
grant execute on function public.claim_telegram_plugin_pair(uuid, uuid) to service_role;
