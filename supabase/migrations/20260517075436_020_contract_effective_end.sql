-- Add effective_end_date to contracts
-- Stores the date a lease actually ends when terminated/cancelled early.
-- Overlap validation uses COALESCE(effective_end_date, end_date) so new leases
-- can be created after the real termination date, not the original end_date.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS effective_end_date date;

CREATE INDEX IF NOT EXISTS idx_contracts_stock_overlap
  ON contracts(stock_id, agent_uid, doc_type, status);
