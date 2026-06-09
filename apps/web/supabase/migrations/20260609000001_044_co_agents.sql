-- Co-agent profiles (reusable per-agent, like owners/customers)
CREATE TABLE co_agents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_uid         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Name
  prefix_th         TEXT,
  prefix_en         TEXT,
  first_name_th     TEXT        NOT NULL,
  last_name_th      TEXT        NOT NULL,
  first_name_en     TEXT,
  last_name_en      TEXT,
  -- Address (structured)
  address_no        TEXT,
  moo               TEXT,
  soi               TEXT,
  road              TEXT,
  subdistrict       TEXT,
  district          TEXT,
  province          TEXT,
  zip               TEXT,
  -- Bank info
  bank_name         TEXT,
  bank_account_name TEXT,
  bank_account_no   TEXT,
  -- Identity
  national_id       TEXT,
  tax_id            TEXT,
  id_card_url       TEXT,
  bank_book_url     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX co_agents_agent_uid_idx ON co_agents(agent_uid);

-- Link contracts to co-agent profiles
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS co_agent_id                UUID REFERENCES co_agents(id),
  ADD COLUMN IF NOT EXISTS co_agent_payment_direction TEXT;

-- RLS: each agent can only see and manage their own co-agent profiles
ALTER TABLE co_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_agents_own" ON co_agents
  FOR ALL
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());
