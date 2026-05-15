-- ─── Migration 011: Contract finalization + billing fields ───────────────────

-- Contract finalization lock: immutable final state once all signers have signed
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS is_finalized       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at       timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_pdf_url  text,
  ADD COLUMN IF NOT EXISTS finalized_docx_url text;

-- Omise customer ID for saved payment methods (SaaS billing)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS omise_customer_id text;
