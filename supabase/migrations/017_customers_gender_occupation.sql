ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gender     text,
  ADD COLUMN IF NOT EXISTS occupation text;
