-- Per-signer toggle: whether to email the agent when this signer signs.
-- Default true preserves the current behavior (agent gets notified). Agents can
-- turn it off for signers who are signing in person (no need for a heads-up).
ALTER TABLE contract_signers
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE;
