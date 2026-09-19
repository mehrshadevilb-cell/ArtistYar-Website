-- Media metadata compatibility for Content Management / Media Library
-- Adds the optional audio-tag fields expected by the application.
alter table public.media_assets
  add column if not exists artist text,
  add column if not exists album text,
  add column if not exists genre text,
  add column if not exists year integer,
  add column if not exists duration numeric,
  add column if not exists cover_url text;

create index if not exists media_assets_category_status_idx
  on public.media_assets(category, status, created_at desc);
