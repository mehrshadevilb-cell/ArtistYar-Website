-- Telegram plugin queue security hardening.
-- These queue claim/cleanup functions are service-role-only operations.
revoke all on function public.claim_telegram_plugin_item(uuid) from public, anon, authenticated;
revoke all on function public.claim_telegram_plugin_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cleanup_telegram_plugin_queue() from public, anon, authenticated;

grant execute on function public.claim_telegram_plugin_item(uuid) to service_role;
grant execute on function public.claim_telegram_plugin_pair(uuid, uuid) to service_role;
grant execute on function public.cleanup_telegram_plugin_queue() to service_role;

create or replace function public.telegram_plugin_posts_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

notify pgrst, 'reload schema';
