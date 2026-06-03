-- 038: Add English name to contract_furniture_items
-- Enables bilingual (Thai + English) inventory in the lease attachment PDF,
-- matching the existing bilingual pattern used by contract_key_items.

ALTER TABLE contract_furniture_items
  ADD COLUMN IF NOT EXISTS item_name_en TEXT;

COMMENT ON COLUMN contract_furniture_items.item_name_en IS 'English item name for bilingual inventory PDF.';
