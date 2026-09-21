-- ArtistYar AI Music — provider tokens (admin-managed) + usage
-- Run AFTER 20260920_user_ai_music_generation.sql

-- Pool of API endpoints (ElevenLabs-compatible or OpenAI-compat music proxies)
CREATE TABLE IF NOT EXISTS public.ai_music_provider_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  provider_kind text NOT NULL DEFAULT 'openai_compat'
    CHECK (provider_kind IN ('elevenlabs', 'openai_compat', 'custom')),
  base_url text NOT NULL,
  api_key text NOT NULL,
  model_id text,
  path text DEFAULT '/music/generate',
  enabled boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  -- Provider-side quota tracking (optional, admin-editable)
  credits_total numeric(14,4),
  credits_remaining numeric(14,4),
  -- Aggregates (updated by app)
  request_count bigint NOT NULL DEFAULT 0,
  success_count bigint NOT NULL DEFAULT 0,
  fail_count bigint NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_music_provider_tokens_enabled_idx
  ON public.ai_music_provider_tokens (enabled, priority);

-- Per-request usage log (for admin monitor)
CREATE TABLE IF NOT EXISTS public.ai_music_provider_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.ai_music_provider_tokens(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.ai_music_generation_jobs(id) ON DELETE SET NULL,
  user_id text,
  success boolean NOT NULL DEFAULT false,
  credits_used numeric(12,4) NOT NULL DEFAULT 1,
  latency_ms int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_music_token_usage_token_idx
  ON public.ai_music_provider_token_usage (token_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_music_token_usage_created_idx
  ON public.ai_music_provider_token_usage (created_at DESC);

-- Ensure free grant default is documented (app uses MUSIC_GEN_FREE_CREDITS=3)
COMMENT ON TABLE public.ai_music_provider_tokens IS 'Admin-managed music generation API tokens (base URL + key)';
COMMENT ON TABLE public.ai_music_provider_token_usage IS 'Per-call usage for admin monitoring';
