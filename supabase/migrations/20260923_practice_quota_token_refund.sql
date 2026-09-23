-- Race-safe quota: each consume issues a consumption_id; refund only that id.

create table if not exists public.practice_daily_consumptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  day_utc date not null,
  created_at timestamptz not null default now(),
  refunded_at timestamptz
);

create index if not exists practice_daily_consumptions_user_day_idx
  on public.practice_daily_consumptions (user_id, day_utc)
  where refunded_at is null;

alter table public.practice_daily_consumptions enable row level security;

create table if not exists public.practice_daily_quota (
  user_id text not null,
  day_utc date not null,
  consumed integer not null default 0 check (consumed >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_utc)
);

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
  v_id uuid;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object(
      'allowed', false, 'pro', false, 'consumed', 0, 'remaining', 0,
      'dailyLimit', v_limit, 'consumptionId', null, 'error', 'invalid_user'
    );
  end if;

  if coalesce(p_is_pro, false) then
    return jsonb_build_object(
      'allowed', true, 'pro', true, 'consumed', 0,
      'remaining', null, 'dailyLimit', null, 'consumptionId', null
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
      'dailyLimit', v_limit, 'consumptionId', null, 'error', 'quota_row_missing'
    );
  end if;

  if v_consumed >= v_limit then
    return jsonb_build_object(
      'allowed', false, 'pro', false, 'consumed', v_consumed,
      'remaining', 0, 'dailyLimit', v_limit, 'consumptionId', null
    );
  end if;

  update public.practice_daily_quota
  set consumed = consumed + 1, updated_at = now()
  where user_id = p_user_id and day_utc = v_day
  returning consumed into v_consumed;

  insert into public.practice_daily_consumptions (user_id, day_utc)
  values (p_user_id, v_day)
  returning id into v_id;

  return jsonb_build_object(
    'allowed', true, 'pro', false, 'consumed', v_consumed,
    'remaining', greatest(0, v_limit - v_consumed),
    'dailyLimit', v_limit, 'consumptionId', v_id
  );
end;
$$;

create or replace function public.refund_practice_daily_stage(
  p_user_id text,
  p_consumption_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumed int;
  v_row public.practice_daily_consumptions%rowtype;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_user');
  end if;

  if p_consumption_id is null then
    return jsonb_build_object('ok', false, 'error', 'consumption_id_required');
  end if;

  select * into v_row
  from public.practice_daily_consumptions
  where id = p_consumption_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'consumption_not_found');
  end if;

  if v_row.refunded_at is not null then
    return jsonb_build_object('ok', true, 'alreadyRefunded', true, 'consumptionId', p_consumption_id);
  end if;

  update public.practice_daily_consumptions
  set refunded_at = now()
  where id = p_consumption_id;

  update public.practice_daily_quota
  set consumed = greatest(0, consumed - 1), updated_at = now()
  where user_id = p_user_id and day_utc = v_row.day_utc
  returning consumed into v_consumed;

  return jsonb_build_object(
    'ok', true,
    'consumed', coalesce(v_consumed, 0),
    'consumptionId', p_consumption_id,
    'day_utc', v_row.day_utc
  );
end;
$$;

create or replace function public.refund_practice_daily_stage(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'error', 'consumption_id_required');
end;
$$;

grant execute on function public.consume_practice_daily_stage(text, boolean) to service_role;
grant execute on function public.refund_practice_daily_stage(text, uuid) to service_role;
grant execute on function public.refund_practice_daily_stage(text) to service_role;
