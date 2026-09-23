-- Practice Phase 4: user personal audio for User Audio Lab
create table if not exists public.practice_user_audio (
  id uuid primary key,
  user_id text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  checksum text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists practice_user_audio_user_idx on public.practice_user_audio (user_id, created_at desc);

alter table public.practice_user_audio enable row level security;
