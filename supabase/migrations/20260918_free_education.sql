-- Dedicated management metadata for free education.
alter table public.media_assets
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists chapters jsonb not null default '[]'::jsonb;

create index if not exists media_assets_free_training_order_idx
  on public.media_assets(category, is_active, sort_order, created_at desc);

comment on column public.media_assets.chapters is 'Free education chapter markers: [{title:string,time:number}].';
