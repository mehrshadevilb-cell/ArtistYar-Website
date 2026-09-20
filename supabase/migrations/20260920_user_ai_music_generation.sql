-- ArtistYar User AI Music Generator
-- Separate from Admin AI Assistant tables.

-- Jobs
CREATE TABLE IF NOT EXISTS public.ai_music_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','planning','generating','validating','completed','failed','cancelled','expired')),
  prompt text NOT NULL,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_id text,
  model_id text,
  provider_job_id text,
  parent_job_id uuid REFERENCES public.ai_music_generation_jobs(id) ON DELETE SET NULL,
  lineage_root_id uuid,
  variation_of_id uuid,
  refine_of_id uuid,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 2,
  credits_charged numeric(12,4) NOT NULL DEFAULT 0,
  credits_refunded numeric(12,4) NOT NULL DEFAULT 0,
  cost_usd numeric(12,6),
  error_code text,
  error_message text,
  validation jsonb,
  output_storage_key text,
  output_public_url text,
  output_mime_type text,
  output_duration_ms int,
  output_file_size bigint,
  idempotency_key text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_music_jobs_idempotency_uidx
  ON public.ai_music_generation_jobs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_music_jobs_user_created_idx
  ON public.ai_music_generation_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_music_jobs_status_idx
  ON public.ai_music_generation_jobs (status)
  WHERE status IN ('queued','planning','generating','validating');

CREATE INDEX IF NOT EXISTS ai_music_jobs_correlation_idx
  ON public.ai_music_generation_jobs (correlation_id);

-- Outputs (one job may produce multiple in future: variations/stems)
CREATE TABLE IF NOT EXISTS public.ai_music_generation_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ai_music_generation_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  public_url text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  duration_ms int,
  sample_rate int,
  channels int,
  checksum text,
  provider_id text NOT NULL,
  model_id text NOT NULL,
  validation jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','library')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_music_outputs_user_idx
  ON public.ai_music_generation_outputs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_music_outputs_job_idx
  ON public.ai_music_generation_outputs (job_id);

-- Credit balances + ledger (idempotent charges/refunds)
CREATE TABLE IF NOT EXISTS public.ai_music_generation_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(14,4) NOT NULL DEFAULT 0,
  lifetime_granted numeric(14,4) NOT NULL DEFAULT 0,
  lifetime_spent numeric(14,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_music_generation_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.ai_music_generation_jobs(id) ON DELETE SET NULL,
  delta numeric(12,4) NOT NULL,
  reason text NOT NULL CHECK (reason IN ('charge','refund','grant','purchase','admin_adjust')),
  balance_after numeric(14,4) NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ai_music_credit_ledger_user_idx
  ON public.ai_music_generation_credit_ledger (user_id, created_at DESC);

-- Optional provider/model config (admin-configurable later)
CREATE TABLE IF NOT EXISTS public.ai_music_provider_registry (
  id text PRIMARY KEY,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  priority int NOT NULL DEFAULT 100,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_music_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_music_generation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_music_generation_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_music_generation_credit_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
CREATE POLICY ai_music_jobs_select_own ON public.ai_music_generation_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_music_jobs_insert_own ON public.ai_music_generation_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_music_jobs_update_own ON public.ai_music_generation_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY ai_music_outputs_select_own ON public.ai_music_generation_outputs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ai_music_credits_select_own ON public.ai_music_generation_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ai_music_ledger_select_own ON public.ai_music_generation_credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS for workers / API routes using secret key.

COMMENT ON TABLE public.ai_music_generation_jobs IS 'User AI Music Generator jobs (not Admin AI)';
COMMENT ON TABLE public.ai_music_generation_outputs IS 'Generated audio assets owned by user';
