-- Migration 030: plan_limits table
-- Stores per-plan limits that can be edited at runtime from admin panel
-- Falls back to PLAN_LIMITS constant in code if table is empty

CREATE TABLE IF NOT EXISTS plan_limits (
  plan                     TEXT PRIMARY KEY,
  max_stock                INT,               -- null = unlimited
  max_contracts_per_month  INT,               -- null = unlimited
  ai_calls_per_month       INT NOT NULL DEFAULT 10,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by               UUID REFERENCES auth.users(id)
);

-- Seed with current hardcoded values
INSERT INTO plan_limits (plan, max_stock, max_contracts_per_month, ai_calls_per_month) VALUES
  ('starter',      10,   5,    10),
  ('professional', NULL, NULL, 300),
  ('business',     NULL, NULL, 300)
ON CONFLICT (plan) DO NOTHING;

-- Only admins can write; anyone authenticated can read
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_write_plan_limits"
  ON plan_limits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "auth_read_plan_limits"
  ON plan_limits FOR SELECT
  USING (auth.role() = 'authenticated');
