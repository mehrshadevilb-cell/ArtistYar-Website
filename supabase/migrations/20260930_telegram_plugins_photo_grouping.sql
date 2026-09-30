-- A single Telegram photo/cover can own multiple document files.
-- Keep one catalog product row per cover and store the document file_ids in
-- telegram_file_ids/file_names rather than creating duplicate products.
create unique index if not exists telegram_plugin_posts_published_photo_unique
  on public.telegram_plugin_posts (channel_id, photo_message_id)
  where status = 'published' and photo_message_id is not null;
