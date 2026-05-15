-- Standardize profile identity fields to match Owner/Customer schema

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prefix        text,
  ADD COLUMN IF NOT EXISTS prefix_en     text,
  ADD COLUMN IF NOT EXISTS first_name_th text,
  ADD COLUMN IF NOT EXISTS last_name_th  text,
  ADD COLUMN IF NOT EXISTS first_name_en text,
  ADD COLUMN IF NOT EXISTS last_name_en  text,
  ADD COLUMN IF NOT EXISTS nationality   text,
  ADD COLUMN IF NOT EXISTS gender        text,
  ADD COLUMN IF NOT EXISTS birth_date    text;
