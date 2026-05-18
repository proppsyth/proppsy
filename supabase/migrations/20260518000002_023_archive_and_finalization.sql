-- ============================================================
-- 023: Soft archive for customers/owners
-- ============================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by  UUID        REFERENCES auth.users(id);

ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by  UUID        REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_customers_archived ON public.customers(agent_uid, is_archived);
CREATE INDEX IF NOT EXISTS idx_owners_archived    ON public.owners(agent_uid, is_archived);
