-- Atomic credit charge/refund for AI music generator (Day 2 residual).
-- Single transaction: idempotency claim + balance lock + debit/credit + ledger insert.
-- service_role only — application continues to own auth/session checks.

CREATE OR REPLACE FUNCTION public.charge_ai_music_credits(
  p_user_id text,
  p_amount numeric,
  p_idempotency_key text,
  p_job_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric := greatest(0, coalesce(p_amount, 0));
  v_bal numeric;
  v_spent numeric;
  v_next numeric;
  v_prior_balance numeric;
  v_prior_delta numeric;
BEGIN
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_user', 'balance', 0, 'charged', 0);
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'idempotency_required', 'balance', 0, 'charged', 0);
  END IF;

  INSERT INTO public.ai_music_generation_credits (user_id, balance, lifetime_granted, lifetime_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, lifetime_spent INTO v_bal, v_spent
  FROM public.ai_music_generation_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT balance_after, delta INTO v_prior_balance, v_prior_delta
  FROM public.ai_music_generation_credit_ledger
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'balance', coalesce(v_prior_balance, 0),
      'charged', abs(coalesce(v_prior_delta, 0)),
      'idempotent', true
    );
  END IF;

  IF v_amount = 0 THEN
    RETURN jsonb_build_object('ok', true, 'balance', coalesce(v_bal, 0), 'charged', 0, 'idempotent', false);
  END IF;

  IF coalesce(v_bal, 0) < v_amount THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'InsufficientCredits',
      'balance', coalesce(v_bal, 0),
      'charged', 0
    );
  END IF;

  v_next := v_bal - v_amount;
  UPDATE public.ai_music_generation_credits
  SET balance = v_next,
      lifetime_spent = coalesce(v_spent, 0) + v_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.ai_music_generation_credit_ledger
    (user_id, job_id, delta, reason, balance_after, idempotency_key)
  VALUES
    (p_user_id, p_job_id, -v_amount, 'charge', v_next, p_idempotency_key);

  RETURN jsonb_build_object('ok', true, 'balance', v_next, 'charged', v_amount, 'idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_ai_music_credits(
  p_user_id text,
  p_amount numeric,
  p_idempotency_key text,
  p_job_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric := greatest(0, coalesce(p_amount, 0));
  v_bal numeric;
  v_spent numeric;
  v_next numeric;
  v_prior_balance numeric;
BEGIN
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_user', 'balance', 0);
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'idempotency_required', 'balance', 0);
  END IF;

  INSERT INTO public.ai_music_generation_credits (user_id, balance, lifetime_granted, lifetime_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, lifetime_spent INTO v_bal, v_spent
  FROM public.ai_music_generation_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT balance_after INTO v_prior_balance
  FROM public.ai_music_generation_credit_ledger
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'balance', coalesce(v_prior_balance, 0), 'idempotent', true);
  END IF;

  IF v_amount = 0 THEN
    RETURN jsonb_build_object('ok', true, 'balance', coalesce(v_bal, 0), 'idempotent', false);
  END IF;

  v_next := coalesce(v_bal, 0) + v_amount;
  UPDATE public.ai_music_generation_credits
  SET balance = v_next,
      lifetime_spent = greatest(0, coalesce(v_spent, 0) - v_amount),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.ai_music_generation_credit_ledger
    (user_id, job_id, delta, reason, balance_after, idempotency_key)
  VALUES
    (p_user_id, p_job_id, v_amount, 'refund', v_next, p_idempotency_key);

  RETURN jsonb_build_object('ok', true, 'balance', v_next, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.charge_ai_music_credits(text, numeric, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.charge_ai_music_credits(text, numeric, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.charge_ai_music_credits(text, numeric, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.charge_ai_music_credits(text, numeric, text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.refund_ai_music_credits(text, numeric, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_ai_music_credits(text, numeric, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.refund_ai_music_credits(text, numeric, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_music_credits(text, numeric, text, uuid) TO service_role;
