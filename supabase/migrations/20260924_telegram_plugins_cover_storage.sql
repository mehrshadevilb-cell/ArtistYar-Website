-- Latest-3 plugin covers only. Plugin binaries stay on Telegram forever.
alter table public.telegram_plugin_posts
  add column if not exists cover_storage_path text,
  add column if not exists cover_public_url text;

create index if not exists telegram_plugin_posts_cover_path_idx
  on public.telegram_plugin_posts(cover_storage_path)
  where cover_storage_path is not null;

notify pgrst, 'reload schema';
