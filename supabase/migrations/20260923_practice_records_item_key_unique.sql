-- Concurrent duplicate protection: same user cannot insert the same itemKey twice.
create unique index if not exists practice_records_user_item_key_uidx
  on public.practice_records (user_id, ((metadata ->> 'itemKey')))
  where metadata ? 'itemKey'
    and length(coalesce(metadata ->> 'itemKey', '')) >= 4;
