-- ─────────────────────────────────────────────────────────────
-- 072: Fix stock SELECT RLS leak (H1)
-- ─────────────────────────────────────────────────────────────
-- The previous policy allowed `status = 'available'` for everyone, which let
-- anyone with the anon key read every agent's available stock — including
-- UNPUBLISHED drafts (owner_id, notes, raw_text, prices). Public marketplace
-- pages read stock through the service role (bypassing RLS), so this branch was
-- both unnecessary and a cross-tenant data leak. Restrict to owner/admin.
drop policy if exists stock_select_own on public.stock;
create policy stock_select_own on public.stock
  for select
  using (((agent_uid = auth.uid()) AND is_active_user()) OR is_admin());
