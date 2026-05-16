-- Add lead funnel tracking to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'lead'
    CHECK (lead_status IN ('lead', 'prospect', 'viewing', 'negotiating', 'converted', 'lost')),
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_customers_lead_status ON customers(lead_status);
CREATE INDEX IF NOT EXISTS idx_customers_converted_at ON customers(converted_at);

-- Property inquiry event log (future-ready: marketing attribution, AI scoring)
CREATE TABLE IF NOT EXISTS property_inquiries (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_uid     uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stock_id      text         REFERENCES stock(id) ON DELETE SET NULL,
  customer_id   text         REFERENCES customers(id) ON DELETE SET NULL,
  source        text         NOT NULL DEFAULT 'direct'
    CHECK (source IN ('line', 'facebook', 'referral', 'direct', 'website', 'public_listing', 'walk_in', 'other')),
  notes         text,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE property_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_own_inquiries" ON property_inquiries
  FOR ALL TO authenticated
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

CREATE INDEX IF NOT EXISTS idx_property_inquiries_agent_uid  ON property_inquiries(agent_uid);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_created_at ON property_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_stock_id   ON property_inquiries(stock_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_source     ON property_inquiries(source);
