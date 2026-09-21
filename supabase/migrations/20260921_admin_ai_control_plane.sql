-- Admin AI control plane: providers, tasks, agents, prompts, tools, executions
create table if not exists public.admin_ai_providers (
  id text primary key,
  name text not null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ai_tasks (
  id text primary key,
  name text not null,
  description text not null default '',
  capability text not null default 'chat',
  primary_provider text,
  primary_model text,
  fallback_provider text,
  fallback_model text,
  max_retries integer not null default 2,
  timeout_ms integer not null default 45000,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ai_agents (
  id text primary key,
  name text not null,
  description text not null default '',
  purpose text not null default '',
  task_id text references public.admin_ai_tasks(id) on delete set null,
  primary_provider text,
  primary_model text,
  fallback_provider text,
  fallback_model text,
  system_prompt text not null default '',
  permissions jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ai_prompts (
  id uuid primary key default gen_random_uuid(),
  agent_id text references public.admin_ai_agents(id) on delete cascade,
  task_id text references public.admin_ai_tasks(id) on delete set null,
  version integer not null default 1,
  system_prompt text not null default '',
  developer_instructions text not null default '',
  user_template text not null default '',
  changelog text not null default '',
  author text not null default 'admin',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id, task_id, version)
);

create table if not exists public.admin_ai_tools (
  id text primary key,
  name text not null,
  description text not null default '',
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  permission_level text not null default 'read',
  enabled boolean not null default false,
  agent_ids jsonb not null default '[]'::jsonb,
  timeout_ms integer not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ai_executions (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  admin_username text,
  agent_id text,
  task_id text,
  provider_id text,
  model_id text,
  prompt_version integer,
  tools_used jsonb not null default '[]'::jsonb,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  status text not null default 'started',
  error_type text,
  error_message text,
  retry_count integer not null default 0,
  fallback_used boolean not null default false,
  estimated_cost_usd numeric(12,6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists admin_ai_executions_created_idx on public.admin_ai_executions(created_at desc);
create index if not exists admin_ai_executions_provider_idx on public.admin_ai_executions(provider_id, model_id, created_at desc);
create index if not exists admin_ai_executions_status_idx on public.admin_ai_executions(status, created_at desc);

alter table public.admin_ai_providers enable row level security;
alter table public.admin_ai_tasks enable row level security;
alter table public.admin_ai_agents enable row level security;
alter table public.admin_ai_prompts enable row level security;
alter table public.admin_ai_tools enable row level security;
alter table public.admin_ai_executions enable row level security;

insert into public.admin_ai_tasks(id,name,description,capability)
values
 ('admin-analysis','Admin Analysis','تحلیل و گزارش مدیریتی','reasoning'),
 ('chat','Admin Chat','گفتگوی مدیریتی','chat'),
 ('coding','Coding Task','وظایف کدنویسی و review','coding'),
 ('audio-analysis','Audio Analysis','تحلیل عددی صوت با سرویس DSP','audio'),
 ('image-analysis','Image Analysis','تحلیل تصویر با مدل vision','vision')
on conflict (id) do nothing;

insert into public.admin_ai_agents(id,name,description,purpose,task_id,system_prompt,permissions)
values
 ('admin-assistant','Admin Assistant','دستیار مدیریتی ArtistYar','گفتگو، خلاصه‌سازی و گزارش','chat',
  'تو دستیار مدیریتی Admin AI هستی. فارسی، دقیق و ساختاریافته پاسخ بده. هرگز ادعا نکن DSP یا ابزار تخصصی را خودت اجرا کرده‌ای.',
  '[]'::jsonb),
 ('site-operations','Site Operations Assistant','دستیار عملیات سایت','تشخیص و تحلیل وضعیت سرویس‌ها','admin-analysis',
  'وضعیت سایت را بر اساس داده‌های واقعی تحلیل کن و داده ساختگی نساز.',
  '["analytics.read","diagnostics.read"]'::jsonb)
on conflict (id) do nothing;

insert into public.admin_ai_tools(id,name,description,permission_level,enabled)
values
 ('site-analytics','Site Analytics','خواندن آمار سایت','read',false),
 ('file-analysis','File Analysis','تحلیل فایل با سرویس امن','read',false),
 ('search','Search','جستجوی کنترل‌شده','read',false),
 ('audio-dsp','Audio DSP','محاسبات واقعی صوتی/DSP','specialized',false)
on conflict (id) do nothing;
