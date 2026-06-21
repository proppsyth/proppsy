-- ─────────────────────────────────────────────────────────────
-- 076: Lock down kill_user_sessions
-- ─────────────────────────────────────────────────────────────
-- Only the admin deactivation flow (service role) should force-logout a user.
revoke all on function public.kill_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.kill_user_sessions(uuid) to service_role;
