-- ============================================================
-- 022: Contract Lifecycle Redesign
-- Adds: contract_category | master_contract_id | terminated_at
-- Creates: contract_timeline_events
-- Fixes: overlap index (leases only)
-- ============================================================

-- ── New columns on contracts ──────────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_category  TEXT
    CHECK (contract_category IN ('reservation', 'lease', 'child')),
  ADD COLUMN IF NOT EXISTS master_contract_id TEXT
    REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS terminated_at      TIMESTAMPTZ;

-- ── Backfill contract_category from doc_type ─────────────────
-- reservation → 'reservation', rental → 'lease', all else → 'child'

UPDATE public.contracts
SET contract_category = CASE
  WHEN doc_type = 'reservation' THEN 'reservation'
  WHEN doc_type = 'rental'      THEN 'lease'
  ELSE                               'child'
END
WHERE contract_category IS NULL;

-- ── Backfill master_contract_id for existing child docs ───────
-- Approximate: use parent_contract_id as the master reference.
-- Deeper chain-walking is not needed for existing data.

UPDATE public.contracts
SET master_contract_id = parent_contract_id
WHERE parent_contract_id IS NOT NULL
  AND contract_category = 'child'
  AND master_contract_id IS NULL;

-- ── Timeline events table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_timeline_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         TEXT        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  master_contract_id  TEXT        REFERENCES public.contracts(id),
  agent_uid           UUID        NOT NULL REFERENCES auth.users(id),
  event_type          TEXT        NOT NULL,
  description         TEXT,
  related_contract_id TEXT        REFERENCES public.contracts(id),
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_agent_all" ON public.contract_timeline_events
  FOR ALL
  USING     (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

CREATE INDEX IF NOT EXISTS idx_timeline_contract_id
  ON public.contract_timeline_events(contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_master_id
  ON public.contract_timeline_events(master_contract_id, created_at DESC);

-- ── Update overlap index: restrict to lease contracts only ────
-- Old index covered all doc_types including reservations (wrong).
-- New partial index covers only lease-category contracts.

DROP INDEX IF EXISTS idx_contracts_stock_overlap;

CREATE INDEX IF NOT EXISTS idx_contracts_lease_overlap
  ON public.contracts(stock_id, agent_uid, status)
  WHERE contract_category = 'lease';
