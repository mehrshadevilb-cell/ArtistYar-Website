-- Telegram plugin reliability: persist thumbnails and retry state for every queue item.
alter table public.telegram_plugin_ingest_queue
  add column if not exists thumbnail_file_id text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz;

create index if not exists telegram_plugin_queue_retry_idx
  on public.telegram_plugin_ingest_queue(next_attempt_at, processing_at, received_at);

create or replace function public.claim_telegram_plugin_item(p_queue_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  update public.telegram_plugin_ingest_queue
  set processing_at = now(),
      attempt_count = coalesce(attempt_count, 0) + 1,
      last_attempt_at = now(),
      last_error = null
  where id = p_queue_id
    and (
      processing_at is null
      or processing_at < now() - interval '10 minutes'
    )
    and (
      next_attempt_at is null
      or next_attempt_at <= now()
    );
  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

revoke all on function public.claim_telegram_plugin_item(uuid) from public;
grant execute on function public.claim_telegram_plugin_item(uuid) to service_role;

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
  available integer;
begin
  perform 1
  from public.telegram_plugin_ingest_queue
  where id in (p_photo_id, p_document_id)
  order by id
  for update;
  select count(*)::integer into available
  from public.telegram_plugin_ingest_queue
  where id in (p_photo_id, p_document_id)
    and (processing_at is null or processing_at < now() - interval '10 minutes')
    and (next_attempt_at is null or next_attempt_at <= now());
  if available < 2 then return false; end if;
  update public.telegram_plugin_ingest_queue
  set processing_at = now(),
      attempt_count = coalesce(attempt_count, 0) + 1,
      last_attempt_at = now(),
      last_error = null
  where id in (p_photo_id, p_document_id);
  return true;
end;
$$;

revoke all on function public.claim_telegram_plugin_pair(uuid, uuid) from public;
grant execute on function public.claim_telegram_plugin_pair(uuid, uuid) to service_role;
notify pgrst, 'reload schema';
