-- ============================================================
-- Migration 064: Let pending (not-yet-approved) users prepare data
-- ============================================================
-- Intent: an account awaiting admin approval should be able to ENTER
-- working data — stock, customers, owners, projects (already open) — and
-- upload the supporting images (photos, ID cards, signatures). It must
-- still NOT be able to publish listings or create contracts; those remain
-- approved-only and are enforced both at the app layer and via the
-- contracts/* RLS policies (which keep using is_active_agent()).
--
-- Migration 056 over-restricted by gating every table on is_active_agent()
-- (= approved only). This adds is_active_user() (= approved OR pending, but
-- not deactivated and not rejected) and applies it to the data-entry tables
-- and their storage buckets. Deactivated users (deleted_at) and rejected
-- accounts are still fully blocked.
-- ============================================================

-- ── Helper: active = approved OR pending, never deactivated/rejected ─────────
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND account_status IN ('approved', 'pending')
      AND deleted_at IS NULL
  );
$$;

-- ── owners ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owners_select" ON public.owners;
DROP POLICY IF EXISTS "owners_insert" ON public.owners;
DROP POLICY IF EXISTS "owners_update" ON public.owners;
DROP POLICY IF EXISTS "owners_delete" ON public.owners;
CREATE POLICY "owners_select" ON public.owners FOR SELECT USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "owners_insert" ON public.owners FOR INSERT WITH CHECK (agent_uid = auth.uid() AND is_active_user());
CREATE POLICY "owners_update" ON public.owners FOR UPDATE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "owners_delete" ON public.owners FOR DELETE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());

-- ── customers ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (agent_uid = auth.uid() AND is_active_user());
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());

-- ── stock ─────────────────────────────────────────────────────────────────────
-- (publishing is gated separately in the app layer; inserting a draft is fine)
DROP POLICY IF EXISTS "stock_select_own" ON public.stock;
DROP POLICY IF EXISTS "stock_insert" ON public.stock;
DROP POLICY IF EXISTS "stock_update" ON public.stock;
DROP POLICY IF EXISTS "stock_delete" ON public.stock;
CREATE POLICY "stock_select_own" ON public.stock FOR SELECT USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin() OR status = 'available');
CREATE POLICY "stock_insert" ON public.stock FOR INSERT WITH CHECK (agent_uid = auth.uid() AND is_active_user());
CREATE POLICY "stock_update" ON public.stock FOR UPDATE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "stock_delete" ON public.stock FOR DELETE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());

-- ── appointments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT WITH CHECK (agent_uid = auth.uid() AND is_active_user());
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());
CREATE POLICY "appointments_delete" ON public.appointments FOR DELETE USING ((agent_uid = auth.uid() AND is_active_user()) OR is_admin());

-- ── co_agents ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "co_agents_own" ON public.co_agents;
CREATE POLICY "co_agents_own" ON public.co_agents FOR ALL
  USING (agent_uid = auth.uid() AND is_active_user())
  WITH CHECK (agent_uid = auth.uid() AND is_active_user());

-- ── storage: photos, documents, secure-documents (uploads for the above) ─────
DROP POLICY IF EXISTS "active agents manage stock-photos" ON storage.objects;
CREATE POLICY "active agents manage stock-photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'stock-photos' AND public.is_active_user())
  WITH CHECK (bucket_id = 'stock-photos' AND public.is_active_user());

DROP POLICY IF EXISTS "active agents manage documents" ON storage.objects;
CREATE POLICY "active agents manage documents" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.is_active_user())
  WITH CHECK (bucket_id = 'documents' AND public.is_active_user());

DROP POLICY IF EXISTS "active agents manage secure-documents" ON storage.objects;
CREATE POLICY "active agents manage secure-documents" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'secure-documents' AND public.is_active_user())
  WITH CHECK (bucket_id = 'secure-documents' AND public.is_active_user());
