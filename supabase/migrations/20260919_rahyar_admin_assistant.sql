create table if not exists public.rahyar_admin_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'گفت‌وگوی جدید',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rahyar_admin_assistant_conversations_created_by_idx
  on public.rahyar_admin_assistant_conversations (created_by, updated_at desc);

create table if not exists public.rahyar_admin_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.rahyar_admin_assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists rahyar_admin_assistant_messages_conversation_idx
  on public.rahyar_admin_assistant_messages (conversation_id, created_at);

create table if not exists public.rahyar_admin_assistant_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  conversation_id uuid references public.rahyar_admin_assistant_conversations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rahyar_admin_assistant_audit_events_actor_idx
  on public.rahyar_admin_assistant_audit_events (actor, created_at desc);

alter table public.rahyar_admin_assistant_conversations enable row level security;
alter table public.rahyar_admin_assistant_messages enable row level security;
alter table public.rahyar_admin_assistant_audit_events enable row level security;
