-- ============================================================
-- Migration 065: Let pending users SEE their credits
-- ============================================================
-- A pending (not-yet-approved) account may have been granted credits by an
-- admin, but the credit tables were gated on is_active_agent() (approved
-- only), so the balance always showed 0. Switch them to is_active_user()
-- (approved OR pending, never deactivated/rejected) so the balance is
-- visible. Spending credits (publishing) is still blocked in the app layer
-- for pending accounts.
-- ============================================================

DROP POLICY IF EXISTS "credits_own_all" ON public.credits;
CREATE POLICY "credits_own_all" ON public.credits FOR ALL TO authenticated
  USING (user_id = auth.uid() AND is_active_user())
  WITH CHECK (user_id = auth.uid() AND is_active_user());

DROP POLICY IF EXISTS "transactions_own_read" ON public.credit_transactions;
CREATE POLICY "transactions_own_read" ON public.credit_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND is_active_user());

DROP POLICY IF EXISTS "pools_own_all" ON public.credit_pools;
CREATE POLICY "pools_own_all" ON public.credit_pools FOR ALL TO authenticated
  USING (admin_uid = auth.uid() AND is_active_user())
  WITH CHECK (admin_uid = auth.uid() AND is_active_user());

DROP POLICY IF EXISTS "pool_members_own" ON public.credit_pool_members;
CREATE POLICY "pool_members_own" ON public.credit_pool_members FOR ALL TO authenticated
  USING (
    (user_id = auth.uid() OR pool_id IN (SELECT id FROM public.credit_pools WHERE admin_uid = auth.uid()))
    AND is_active_user()
  );
