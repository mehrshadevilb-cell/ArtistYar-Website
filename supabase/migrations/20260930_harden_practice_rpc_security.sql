-- Day 1 security hardening: lock down practice quota SECURITY DEFINER RPCs.
-- These functions are intentionally server-only (called via service_role from
-- Next.js API routes). They must not be executable by anon or authenticated
-- clients, who could otherwise pass arbitrary p_user_id values.

-- Revoke broad default PUBLIC grants and any explicit client-role grants.
REVOKE ALL ON FUNCTION public.get_practice_daily_quota(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_practice_daily_quota(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_practice_daily_quota(text) FROM authenticated;

REVOKE ALL ON FUNCTION public.consume_practice_daily_stage(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_practice_daily_stage(text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.consume_practice_daily_stage(text, boolean) FROM authenticated;

REVOKE ALL ON FUNCTION public.refund_practice_daily_stage(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_practice_daily_stage(text) FROM anon;
REVOKE ALL ON FUNCTION public.refund_practice_daily_stage(text) FROM authenticated;

REVOKE ALL ON FUNCTION public.refund_practice_daily_stage(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_practice_daily_stage(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.refund_practice_daily_stage(text, uuid) FROM authenticated;

-- Explicit service_role grants only (idempotent).
GRANT EXECUTE ON FUNCTION public.get_practice_daily_quota(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_practice_daily_stage(text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_practice_daily_stage(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_practice_daily_stage(text, uuid) TO service_role;

-- Re-affirm safe search_path on all four signatures (already set; defensive).
ALTER FUNCTION public.get_practice_daily_quota(text)
  SET search_path = public;

ALTER FUNCTION public.consume_practice_daily_stage(text, boolean)
  SET search_path = public;

ALTER FUNCTION public.refund_practice_daily_stage(text)
  SET search_path = public;

ALTER FUNCTION public.refund_practice_daily_stage(text, uuid)
  SET search_path = public;
