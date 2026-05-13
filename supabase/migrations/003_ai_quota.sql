ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_calls_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calls_date  date;
