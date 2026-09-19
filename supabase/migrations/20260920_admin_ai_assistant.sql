create table if not exists public.admin_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  admin_username text not null,
  title text not null default 'گفتگوی جدید',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_ai_conversations_admin_updated_idx on public.admin_ai_conversations (admin_username, updated_at desc);

create table if not exists public.admin_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.admin_ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  provider text,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists admin_ai_messages_conversation_created_idx on public.admin_ai_messages (conversation_id, created_at asc);

create table if not exists public.admin_ai_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_username text not null,
  action text not null,
  conversation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_ai_audit_logs_admin_created_idx on public.admin_ai_audit_logs (admin_username, created_at desc);

alter table public.admin_ai_conversations enable row level security;
alter table public.admin_ai_messages enable row level security;
alter table public.admin_ai_audit_logs enable row level security;