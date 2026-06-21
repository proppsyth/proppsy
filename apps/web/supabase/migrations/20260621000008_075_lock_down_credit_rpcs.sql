-- ─────────────────────────────────────────────────────────────
-- 075: Lock down credit / AI SECURITY DEFINER RPCs (CRITICAL)
-- ─────────────────────────────────────────────────────────────
-- grant_credits / spend_credits / increment_ai_usage are SECURITY DEFINER and
-- were EXECUTE-able by anon + authenticated. Anyone with the public anon key
-- could call grant_credits to mint themselves credits (or bump their AI quota,
-- or alter balances). These are only ever invoked server-side via the service
-- role, so revoke direct access from anon/authenticated.
revoke all on function public.grant_credits(uuid, integer, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, integer, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.increment_ai_usage(uuid) from public, anon, authenticated;

grant execute on function public.grant_credits(uuid, integer, text, text, text, boolean) to service_role;
grant execute on function public.spend_credits(uuid, integer, text, text, text, jsonb) to service_role;
grant execute on function public.increment_ai_usage(uuid) to service_role;
