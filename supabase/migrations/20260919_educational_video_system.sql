-- Production educational video metadata and lesson structure.
-- Course IDs refer to the canonical RahYar courses table; no duplicate course data is stored here.
create table if not exists public.educational_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id bigint not null,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists educational_lessons_course_idx
  on public.educational_lessons(course_id, sort_order, created_at);

create table if not exists public.educational_videos (
  id uuid primary key default gen_random_uuid(),
  course_id bigint not null,
  lesson_id uuid not null references public.educational_lessons(id) on delete cascade,
  title text not null,
  description text not null default '',
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null default 'video/mp4',
  file_size bigint,
  duration_seconds integer,
  thumbnail_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

create index if not exists educational_videos_lesson_idx
  on public.educational_videos(lesson_id, sort_order, created_at);

alter table public.educational_lessons enable row level security;
alter table public.educational_videos enable row level security;

-- The application uses server-only Supabase service-role access.
-- No anon policy is intentionally added: protected video metadata and storage paths
-- must never be directly queryable from the browser.
