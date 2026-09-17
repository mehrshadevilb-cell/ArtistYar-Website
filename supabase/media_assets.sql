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
  consent boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;
-- The website uses the server-only secret key for all reads/writes.
-- No public table policy is needed because public visitors receive only API-filtered records.
