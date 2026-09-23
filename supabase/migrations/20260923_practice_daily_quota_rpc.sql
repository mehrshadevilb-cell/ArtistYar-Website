-- Atomic Free daily stage quota (UTC day). Pro never writes rows.
-- Limit: exactly 5 stages per user_id per UTC day.

create table if not exists public.practice_daily_quota (
  user_id text not null,
  day_utc date not null,
  consumed integer not null default 0 check (consumed >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_utc)
);

create index if not exists practice_daily_quota_day_idx
  on public.practice_daily_quota (day_utc);

alter table public.practice_daily_quota enable row level security;

create or replace function public.consume_practice_daily_stage(
  p_user_id text,
  p_is_pro boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (timezone('utc', now()))::date;
  v_limit int := 5;
  v_consumed int;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object(
      'allowed', false, 'pro', false, 'consumed', 0, 'remaining', 0,
      'dailyLimit', v_limit, 'error', 'invalid_user'
    );
  end if;

  if coalesce(p_is_pro, false) then
    return jsonb_build_object(
      'allowed', true, 'pro', true, 'consumed', 0,
      'remaining', null, 'dailyLimit', null
    );
  end if;

  insert into public.practice_daily_quota (user_id, day_utc, consumed, updated_at)
  values (p_user_id, v_day, 0, now())
  on conflict (user_id, day_utc) do nothing;

  select consumed into v_consumed
  from public.practice_daily_quota
  where user_id = p_user_id and day_utc = v_day
  for update;

  if v_consumed is null then
    return jsonb_build_object(
      'allowed', false, 'pro', false, 'consumed', 0, 'remaining', 0,
      'dailyLimit', v_limit, 'error', 'quota_row_missing'
    );
  end if;

  if v_consumed >= v_limit then
    return jsonb_build_object(
      'allowed', false, 'pro', false, 'consumed', v_consumed,
      'remaining', 0, 'dailyLimit', v_limit
    );
  end if;

  update public.practice_daily_quota
  set consumed = consumed + 1, updated_at = now()
  where user_id = p_user_id and day_utc = v_day
  returning consumed into v_consumed;

  return jsonb_build_object(
    'allowed', true, 'pro', false, 'consumed', v_consumed,
    'remaining', greatest(0, v_limit - v_consumed), 'dailyLimit', v_limit
  );
end;
$$;

create or replace function public.refund_practice_daily_stage(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (timezone('utc', now()))::date;
  v_consumed int;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_user');
  end if;

  update public.practice_daily_quota
  set consumed = greatest(0, consumed - 1), updated_at = now()
  where user_id = p_user_id and day_utc = v_day and consumed > 0
  returning consumed into v_consumed;

  return jsonb_build_object(
    'ok', true, 'consumed', coalesce(v_consumed, 0), 'day_utc', v_day
  );
end;
$$;

create or replace function public.get_practice_daily_quota(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (timezone('utc', now()))::date;
  v_limit int := 5;
  v_consumed int;
begin
  select consumed into v_consumed
  from public.practice_daily_quota
  where user_id = p_user_id and day_utc = v_day;

  v_consumed := coalesce(v_consumed, 0);
  return jsonb_build_object(
    'consumed', v_consumed,
    'remaining', greatest(0, v_limit - v_consumed),
    'dailyLimit', v_limit,
    'day_utc', v_day
  );
end;
$$;

grant execute on function public.consume_practice_daily_stage(text, boolean) to service_role;
grant execute on function public.refund_practice_daily_stage(text) to service_role;
grant execute on function public.get_practice_daily_quota(text) to service_role;
