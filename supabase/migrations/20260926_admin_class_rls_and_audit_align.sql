-- Phase 1+2 security: RLS on admin/class tables + audit column alignment
-- Service role bypasses RLS; anon/authenticated denied.

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay_class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay_class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay_class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ay_session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_admin_audit_logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "deny_all_ay_classes" ON public.ay_classes;
DROP POLICY IF EXISTS "deny_all_ay_class_schedules" ON public.ay_class_schedules;
DROP POLICY IF EXISTS "deny_all_ay_class_enrollments" ON public.ay_class_enrollments;
DROP POLICY IF EXISTS "deny_all_ay_class_sessions" ON public.ay_class_sessions;
DROP POLICY IF EXISTS "deny_all_ay_session_attendance" ON public.ay_session_attendance;

CREATE POLICY "deny_all_admin_audit_logs" ON public.admin_audit_logs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_ay_classes" ON public.ay_classes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_ay_class_schedules" ON public.ay_class_schedules
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_ay_class_enrollments" ON public.ay_class_enrollments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_ay_class_sessions" ON public.ay_class_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_ay_session_attendance" ON public.ay_session_attendance
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Align audit columns with application code when needed
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'before'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'before_state'
  ) THEN
    ALTER TABLE public.admin_audit_logs RENAME COLUMN "before" TO before_state;
    ALTER TABLE public.admin_audit_logs RENAME COLUMN "after" TO after_state;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs'
      AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.admin_audit_logs
      ALTER COLUMN id TYPE text USING id::text;
    ALTER TABLE public.admin_audit_logs
      ALTER COLUMN id DROP DEFAULT;
  END IF;
END $$;

COMMENT ON TABLE public.admin_audit_logs IS 'Admin sensitive operation audit trail. Never store secrets. Access only via service role.';
