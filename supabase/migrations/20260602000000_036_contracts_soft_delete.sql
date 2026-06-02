-- 036: Soft-delete support for contracts
-- Agents can soft-delete draft/cancelled/terminated contracts.
-- Deleted contracts are hidden from normal views (deleted_at IS NULL filter).

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid        REFERENCES auth.users(id) DEFAULT NULL;

-- Index for the common query pattern: only show non-deleted contracts
CREATE INDEX IF NOT EXISTS contracts_agent_not_deleted_idx
  ON contracts (agent_uid, deleted_at)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN contracts.deleted_at IS 'Soft-delete timestamp. NULL = active record.';
COMMENT ON COLUMN contracts.deleted_by IS 'User who soft-deleted this record.';
