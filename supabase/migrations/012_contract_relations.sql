-- Contract Relations: parent_contract_id + contract_relation_type
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS parent_contract_id text REFERENCES contracts(id),
  ADD COLUMN IF NOT EXISTS contract_relation_type text;

COMMENT ON COLUMN contracts.parent_contract_id IS 'References original contract for cancellation/renewal/termination docs';
COMMENT ON COLUMN contracts.contract_relation_type IS 'Type of relationship: cancellation, renewal, termination, notice';
