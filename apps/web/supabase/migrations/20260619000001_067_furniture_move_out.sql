-- Move-out inspection (phase 1): per-item move-out condition + notes.
-- Additive and nullable — the move-in inventory on the signed lease is never
-- touched. These columns are only populated on the snapshot copied into an
-- ending document (termination / cancellation / end_contract).
ALTER TABLE contract_furniture_items
  ADD COLUMN IF NOT EXISTS move_out_condition TEXT,
  ADD COLUMN IF NOT EXISTS move_out_notes TEXT;
