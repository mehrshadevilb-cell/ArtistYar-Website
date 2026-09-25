-- HitNevis licensed corpus + daily training
-- Full lyric text is accepted only when the ingestion source explicitly marks it authorized.
create table if not exists public.hitnevis_licensed_lyrics (
  id uuid primary key default gen_random_uuid(),
  song_key text not null unique,
  title text not null,
  artist text not null,
  lyrics text not null,
  source_url text not null,
  license text not null,
  source_updated_at timestamptz,
  feature_version text not null default '1.0',
  feature_snapshot jsonb not null default '{}'::jsonb,
  content_sha256 text not null,
  ingested_at timestamptz not null default now(),
  analyzed_at timestamptz not null default now()
);
create index if not exists hitnevis_licensed_lyrics_artist_idx
  on public.hitnevis_licensed_lyrics (artist);
create index if not exists hitnevis_licensed_lyrics_analyzed_idx
  on public.hitnevis_licensed_lyrics (analyzed_at desc);

create table if not exists public.hitnevis_training_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','completed','failed')),
  discovered_count integer not null default 0,
  ingested_count integer not null default 0,
  analyzed_count integer not null default 0,
  error_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  error_message text
);
create index if not exists hitnevis_training_runs_started_idx
  on public.hitnevis_training_runs (started_at desc);

alter table public.hitnevis_licensed_lyrics enable row level security;
alter table public.hitnevis_training_runs enable row level security;
revoke all on public.hitnevis_licensed_lyrics from anon, authenticated;
revoke all on public.hitnevis_training_runs from anon, authenticated;
grant all on public.hitnevis_licensed_lyrics to service_role;
grant all on public.hitnevis_training_runs to service_role;
