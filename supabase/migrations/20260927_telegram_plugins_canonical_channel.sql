-- Canonicalize historical plugin channel references.
-- Production plugin channel is @ProAudios; older records may contain @ProAudioS.
update public.telegram_plugin_posts
set channel_id = '@ProAudios',
    telegram_post_url = regexp_replace(
      telegram_post_url,
      'https://t\.me/ProAudioS/',
      'https://t.me/ProAudios/',
      'gi'
    ),
    updated_at = now()
where lower(trim(channel_id)) in ('@proaudios', 'proaudios', '@proaudios')
   or telegram_post_url ilike '%t.me/ProAudioS/%';

update public.telegram_plugin_ingest_queue
set channel_username = 'ProAudios'
where lower(trim(coalesce(channel_username, ''))) in ('proaudios', 'proaudios');

notify pgrst, 'reload schema';
