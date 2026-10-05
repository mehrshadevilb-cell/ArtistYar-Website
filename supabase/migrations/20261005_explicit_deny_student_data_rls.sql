-- Explicit deny-all for browser roles on student/practice data.
-- Application access is service_role + server session auth only.
-- Live verification (2026-10-05): SET ROLE authenticated/anon → 0 rows;
-- INSERT as authenticated → ERROR 42501 RLS violation.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'practice_records',
    'practice_daily_quota',
    'practice_daily_consumptions',
    'practice_daily_locks',
    'practice_subscriptions',
    'user_learning_profiles',
    'learning_roadmap_items',
    'artistyar_projects',
    'artistyar_project_files',
    'artistyar_project_file_versions',
    'artistyar_project_notes',
    'artistyar_project_activity',
    'artistyar_project_analyses',
    'artistyar_project_generations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS deny_all_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY deny_all_%I ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      t, t
    );
  END LOOP;
END $$;
