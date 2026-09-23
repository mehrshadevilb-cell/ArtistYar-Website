-- Repair Telegram plugin production schema if the original migration was not applied.
-- Idempotent: safe to run on an existing installation.

alter table public.telegram_plugin_ingest_queue
  add column if not exists processing_at timestamptz;

create index if not exists telegram_plugin_queue_file_idx
  on public.telegram_plugin_ingest_queue(channel_id, kind, file_id);

create unique index if not exists telegram_plugin_queue_file_unique
  on public.telegram_plugin_ingest_queue(channel_id, kind, file_id);

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
  perform 1
  from public.telegram_plugin_ingest_queue
  where id in (p_photo_id, p_document_id)
  order by id
  for update;

  update public.telegram_plugin_ingest_queue
  set processing_at = now()
  where id in (p_photo_id, p_document_id)
    and (
      processing_at is null
      or processing_at < now() - interval '10 minutes'
    );

  get diagnostics claimed = row_count;
  return claimed = 2;
end;
$$;

revoke all on function public.claim_telegram_plugin_pair(uuid, uuid) from public;
grant execute on function public.claim_telegram_plugin_pair(uuid, uuid) to service_role;

-- Refresh PostgREST's schema cache immediately after the DDL.
notify pgrst, 'reload schema';
