-- Fix partial claim race: never lock only one half of a photo/document pair.
-- Previous claim could set processing_at on the free row when the other was busy,
-- leaving an orphan lock that blocked legitimate pairing for 10 minutes.

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
