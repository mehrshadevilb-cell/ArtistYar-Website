-- ArtistYar branding: stop hardcoding ProAudios post URLs for unresolved channels.
-- Existing ProAudios rows keep their URLs; new posts resolve channel username at publish time.

update public.telegram_plugin_posts
set updated_at = now()
where telegram_post_url ilike '%t.me/ProAudios/%'
  and status = 'published';

notify pgrst, 'reload schema';
