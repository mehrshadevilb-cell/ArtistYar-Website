-- Repair Telegram plugin production schema if the original migration was not applied.
-- Idempotent: safe to run on an existing installation.

alter table public.telegram_plugin_ingest_queue
  add column if not exists processing_at timestamptz;

create index if not exists telegram_plugin_queue_file_idx
  on public.telegram_plugin_ingest_queue(channel_id, kind, file_id);

delete from public.telegram_plugin_ingest_queue q
where q.id in (
  select id
  from (
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

delete from public.telegram_plugin_posts p
where p.id in (
  select id
  from (
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
    and (
      processing_at is null
      or processing_at < now() - interval '10 minutes'
    );

  if available < 2 then
    return false;
  end if;

  update public.telegram_plugin_ingest_queue
  set processing_at = now()
  where id in (p_photo_id, p_document_id);

  return true;
end;
$$;

revoke all on function public.claim_telegram_plugin_pair(uuid, uuid) from public;
grant execute on function public.claim_telegram_plugin_pair(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
