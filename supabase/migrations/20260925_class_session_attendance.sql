-- Class / Session / Enrollment / Attendance — canonical domain (Phase 2)
-- Compatible with existing Rahyar class/student IDs via optional keys.

create extension if not exists pgcrypto;

create table if not exists public.ay_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft','scheduled','active','paused','completed','cancelled','archived')),
  class_type text not null default 'group'
    check (class_type in ('group','one_on_one','workshop','online','hybrid')),
  delivery_mode text not null default 'online'
    check (delivery_mode in ('online','in_person','hybrid')),
  capacity integer check (capacity is null or capacity > 0),
  start_date date,
  end_date date,
  timezone text not null default 'Asia/Tehran',
  location text,
  meeting_url text,
  rahyar_class_id integer,
  course_id integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ay_classes_status_idx on public.ay_classes (status);
create index if not exists ay_classes_rahyar_idx on public.ay_classes (rahyar_class_id);
create index if not exists ay_classes_dates_idx on public.ay_classes (start_date, end_date);

create table if not exists public.ay_class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.ay_classes(id) on delete cascade,
  pattern text not null default 'weekly' check (pattern in ('weekly','once')),
  weekdays integer[] not null default '{}',
  start_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0 and duration_minutes <= 480),
  range_start date not null,
  range_end date,
  timezone text not null default 'Asia/Tehran',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ay_class_schedules_class_idx on public.ay_class_schedules (class_id);

create table if not exists public.ay_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.ay_classes(id) on delete cascade,
  rahyar_student_id integer,
  student_name text,
  student_phone text,
  status text not null default 'active'
    check (status in ('active','paused','completed','cancelled','archived')),
  enrolled_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ay_class_enrollments_class_idx on public.ay_class_enrollments (class_id);
create index if not exists ay_class_enrollments_student_idx on public.ay_class_enrollments (rahyar_student_id);
create unique index if not exists ay_class_enrollments_active_unique
  on public.ay_class_enrollments (class_id, rahyar_student_id)
  where status = 'active' and rahyar_student_id is not null;

create table if not exists public.ay_class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.ay_classes(id) on delete cascade,
  schedule_id uuid references public.ay_class_schedules(id) on delete set null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  timezone text not null default 'Asia/Tehran',
  status text not null default 'scheduled'
    check (status in ('scheduled','open','in_progress','completed','cancelled','rescheduled')),
  location text,
  meeting_url text,
  actual_start timestamptz,
  actual_end timestamptz,
  notes text,
  attendance_finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ay_class_sessions_time_valid check (scheduled_end > scheduled_start)
);

create index if not exists ay_class_sessions_class_idx on public.ay_class_sessions (class_id);
create index if not exists ay_class_sessions_start_idx on public.ay_class_sessions (scheduled_start);
create index if not exists ay_class_sessions_status_idx on public.ay_class_sessions (status);
create unique index if not exists ay_class_sessions_dedupe
  on public.ay_class_sessions (class_id, scheduled_start)
  where status <> 'cancelled';

create table if not exists public.ay_session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ay_class_sessions(id) on delete cascade,
  enrollment_id uuid not null references public.ay_class_enrollments(id) on delete cascade,
  status text not null default 'unknown'
    check (status in ('present','late','absent','excused','unknown')),
  source text not null default 'manual' check (source in ('manual','automatic')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  late_minutes integer check (late_minutes is null or late_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, enrollment_id)
);

create index if not exists ay_session_attendance_session_idx on public.ay_session_attendance (session_id);
create index if not exists ay_session_attendance_enrollment_idx on public.ay_session_attendance (enrollment_id);
create index if not exists ay_session_attendance_status_idx on public.ay_session_attendance (status);

comment on table public.ay_classes is 'Canonical class entity for Admin class management';
comment on table public.ay_class_sessions is 'Concrete session occurrences of a class';
comment on table public.ay_session_attendance is 'Session x Enrollment attendance; unique per pair';
