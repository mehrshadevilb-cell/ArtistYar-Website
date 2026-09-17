-- Run in Supabase SQL Editor after creating the `artistyar-media` public bucket.
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  title text not null,
  description text not null default '',
  category text not null check (category in ('student-work', 'free-training')),
  mime_type text not null default 'application/octet-stream',
  file_ext text not null default '',
  artist text not null default '',
  album text not null default '',
  genre text not null default '',
  year integer,
  duration numeric,
  cover_url text,
  metadata jsonb not null default '{}'::jsonb,
  consent boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;
alter table public.media_assets add column if not exists artist text not null default '';
alter table public.media_assets add column if not exists album text not null default '';
alter table public.media_assets add column if not exists genre text not null default '';
alter table public.media_assets add column if not exists year integer;
alter table public.media_assets add column if not exists duration numeric;
alter table public.media_assets add column if not exists cover_url text;
alter table public.media_assets add column if not exists metadata jsonb not null default '{}'::jsonb;
-- The website uses the server-only secret key for all reads/writes.
-- No public table policy is needed because public visitors receive only API-filtered records.
