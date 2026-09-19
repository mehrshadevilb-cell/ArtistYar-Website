create table if not exists public.educational_video_progress (
  user_id bigint not null,
  lesson_id uuid not null references public.educational_lessons(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.educational_video_progress enable row level security;
