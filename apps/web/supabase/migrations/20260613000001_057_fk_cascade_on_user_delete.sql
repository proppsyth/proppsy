-- Migration 057: Fix FK constraints to allow hard-deleting auth users
--
-- Several tables had ON DELETE NO ACTION pointing at auth.users, which blocked
-- Supabase dashboard's "Delete user" button. Each constraint is dropped and
-- recreated with the semantics that make sense for that table:
--
--   CASCADE  — delete child rows when the user is deleted (ownership data)
--   SET NULL — keep the row but null the user reference (audit/history data)

-- ── contract_signers.agent_uid ────────────────────────────────────────────────
-- Signers belong to an agent; deleting the agent removes their signer rows.
ALTER TABLE contract_signers
  DROP CONSTRAINT IF EXISTS contract_signers_agent_uid_fkey;
ALTER TABLE contract_signers
  ADD CONSTRAINT contract_signers_agent_uid_fkey
  FOREIGN KEY (agent_uid) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── contract_timeline_events.agent_uid ───────────────────────────────────────
-- Audit log rows should stay; just nullify the agent reference.
ALTER TABLE contract_timeline_events
  DROP CONSTRAINT IF EXISTS contract_timeline_events_agent_uid_fkey;
ALTER TABLE contract_timeline_events
  ADD CONSTRAINT contract_timeline_events_agent_uid_fkey
  FOREIGN KEY (agent_uid) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── contracts.deleted_by ──────────────────────────────────────────────────────
-- Keep the contract record; just clear who soft-deleted it.
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_deleted_by_fkey;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_deleted_by_fkey
  FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── credit_transactions.user_id ───────────────────────────────────────────────
-- Financial history belongs to the user; cascade-delete with the user.
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── customers.archived_by ─────────────────────────────────────────────────────
-- Keep customer records; just clear who archived them.
ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_archived_by_fkey;
ALTER TABLE customers
  ADD CONSTRAINT customers_archived_by_fkey
  FOREIGN KEY (archived_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── owners.archived_by ───────────────────────────────────────────────────────
-- Same pattern as customers.
ALTER TABLE owners
  DROP CONSTRAINT IF EXISTS owners_archived_by_fkey;
ALTER TABLE owners
  ADD CONSTRAINT owners_archived_by_fkey
  FOREIGN KEY (archived_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── plan_limits.updated_by ───────────────────────────────────────────────────
-- Admin audit column; just clear it if the admin account is deleted.
ALTER TABLE plan_limits
  DROP CONSTRAINT IF EXISTS plan_limits_updated_by_fkey;
ALTER TABLE plan_limits
  ADD CONSTRAINT plan_limits_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
