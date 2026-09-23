create table if not exists public.practice_audio_sources (
  id text primary key,
  category text not null,
  label text not null default '',
  label_fa text not null default '',
  genre text,
  tempo_bpm integer,
  musical_key text,
  duration_sec numeric not null default 1.4,
  loudness_lufs numeric,
  sample_rate integer,
  channels integer not null default 1,
  difficulty_min integer default 1,
  difficulty_max integer default 5,
  compatible jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  storage_path text,
  recipe jsonb not null default '{"kind":"noise","seconds":1.4,"color":"pink"}'::jsonb,
  enabled boolean not null default true,
  status text not null default 'ready' check (status in ('ready','processing','invalid','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practice_audio_sources_cat_idx on public.practice_audio_sources (category, enabled);
create index if not exists practice_audio_sources_status_idx on public.practice_audio_sources (status);
alter table public.practice_audio_sources enable row level security;
