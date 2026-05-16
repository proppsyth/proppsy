-- Expand customers.source to include all known acquisition channels
-- Original constraint only had: line_oa, referral, walk_in, online
DO $$
BEGIN
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_source_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE customers
  ADD CONSTRAINT customers_source_check CHECK (
    source IS NULL OR source IN (
      'line_oa', 'referral', 'walk_in', 'online',
      'facebook', 'instagram', 'tiktok', 'website', 'other',
      'public_listing'
    )
  );
