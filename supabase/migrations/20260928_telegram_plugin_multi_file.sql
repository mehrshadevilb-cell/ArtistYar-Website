-- Harden Telegram plugin catalog for multi-file releases.
-- A Telegram post may represent one plugin with multiple archive parts/files.
alter table public.telegram_plugin_posts
  add column if not exists telegram_file_ids text[] not null default '{}',
  add column if not exists file_names text[] not null default '{}',
  add column if not exists attachment_count integer not null default 1;

update public.telegram_plugin_posts
set telegram_file_ids = case
      when coalesce(array_length(telegram_file_ids, 1), 0) = 0 and telegram_file_id is not null
        then array[telegram_file_id]
      else telegram_file_ids
    end,
    file_names = case
      when coalesce(array_length(file_names, 1), 0) = 0 and file_name is not null
        then array[file_name]
      else file_names
    end,
    attachment_count = greatest(
      coalesce(attachment_count, 1),
      coalesce(array_length(telegram_file_ids, 1), 1),
      coalesce(array_length(file_names, 1), 1)
    );

create index if not exists telegram_plugin_posts_attachment_idx
  on public.telegram_plugin_posts(channel_id, attachment_count);
