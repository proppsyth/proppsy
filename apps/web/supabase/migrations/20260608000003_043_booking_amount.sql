-- Add booking_amount: separate reservation fee from security deposit on contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS booking_amount NUMERIC;

-- For existing reservations: preserve current deposit_amount value as the booking fee
UPDATE contracts
SET booking_amount = deposit_amount
WHERE contract_category = 'reservation'
  AND booking_amount IS NULL
  AND deposit_amount IS NOT NULL;

-- For existing reservations: recalculate deposit_amount to be the security deposit (rent × months)
UPDATE contracts
SET deposit_amount = COALESCE(rent_price, 0) * COALESCE(deposit_months, 2)
WHERE contract_category = 'reservation'
  AND rent_price IS NOT NULL;
