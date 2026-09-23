-- Persist channel username + media_group_id so queue workers can rebuild Telegram post URLs
-- and prefer album-based photo/document pairing.

alter table public.telegram_plugin_ingest_queue
  add column if not exists channel_username text,
  add column if not exists media_group_id text;

create index if not exists telegram_plugin_queue_media_group_idx
  on public.telegram_plugin_ingest_queue(channel_id, media_group_id)
  where media_group_id is not null;

-- Best-effort backfill for existing published rows that lost telegram_post_url
-- because the queue path only stored numeric channel ids.
update public.telegram_plugin_posts
set telegram_post_url = 'https://t.me/ProAudios/' || photo_message_id::text,
    updated_at = now()
where (telegram_post_url is null or telegram_post_url = '')
  and photo_message_id is not null
  and (
    channel_id ~ '^-?[0-9]+$'
    or lower(channel_id) in ('proaudios', '@proaudios')
  );

notify pgrst, 'reload schema';
