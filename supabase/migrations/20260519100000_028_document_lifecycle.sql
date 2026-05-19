-- ============================================================
-- 028: Document Lifecycle Refactor
-- New stock states: reserved, pending_move_in
-- New contract states: sent_for_sign, finalized, active
-- New columns: reservation_id, finalized_snapshot
-- New tables: document_packages, document_package_items
-- ============================================================

-- ── Stock status expansion ────────────────────────────────────
ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_status_check;
ALTER TABLE stock ADD CONSTRAINT stock_status_check
  CHECK (status IN ('available', 'reserved', 'pending_move_in', 'rented', 'sold', 'unavailable'));

-- ── Contract status expansion ─────────────────────────────────
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'draft', 'sent', 'sent_for_sign', 'viewed', 'partially_signed',
    'signed', 'finalized', 'active', 'completed',
    'cancelled', 'terminated', 'renewed'
  ));

-- ── Reservation link on leases (enforces the flow) ───────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reservation_id TEXT REFERENCES contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_reservation_id ON contracts(reservation_id) WHERE reservation_id IS NOT NULL;

-- ── Immutable snapshot captured at finalization ───────────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS finalized_snapshot JSONB;

-- ── Document packages (groups of documents per lease) ─────────
CREATE TABLE IF NOT EXISTS document_packages (
  id                 TEXT PRIMARY KEY,          -- PKG-XXXX
  agent_uid          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  label              TEXT,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'generating', 'ready', 'sent')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_package_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   TEXT NOT NULL REFERENCES document_packages(id) ON DELETE CASCADE,
  contract_id  TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  doc_type     TEXT NOT NULL,
  label        TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  pdf_url      TEXT,
  docx_url     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'generated', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS policies ──────────────────────────────────────────────
ALTER TABLE document_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_own_packages" ON document_packages
  FOR ALL USING (agent_uid = auth.uid());

ALTER TABLE document_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_own_package_items" ON document_package_items
  FOR ALL USING (
    package_id IN (
      SELECT id FROM document_packages WHERE agent_uid = auth.uid()
    )
  );

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packages_master  ON document_packages(master_contract_id);
CREATE INDEX IF NOT EXISTS idx_packages_agent   ON document_packages(agent_uid);
CREATE INDEX IF NOT EXISTS idx_package_items_pkg ON document_package_items(package_id);
