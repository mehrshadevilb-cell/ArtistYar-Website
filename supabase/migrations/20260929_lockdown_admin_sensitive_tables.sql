-- Keep admin-only and secret-bearing tables inaccessible to browser/anon clients.
-- All current application access uses trusted server-side service-role clients.
ALTER TABLE public.admin_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_music_provider_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_music_provider_token_usage ENABLE ROW LEVEL SECURITY;
