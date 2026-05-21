-- Migration 032: payment_transactions — audit trail for Omise charges

CREATE TABLE IF NOT EXISTS payment_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  omise_charge_id  TEXT        NOT NULL UNIQUE,
  amount_thb       INT         NOT NULL,
  type             TEXT        NOT NULL, -- 'credit_topup' | 'plan_subscription'
  plan             TEXT,                 -- plan purchased (if type = plan_subscription)
  billing_period   TEXT,                 -- 'monthly' | 'yearly'
  credits_granted  INT,                  -- credits added (if type = credit_topup)
  status           TEXT        NOT NULL DEFAULT 'pending',
  omise_event_key  TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
CREATE POLICY "payment_txn_own_read"
  ON payment_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Service role (admin client) can do everything
CREATE POLICY "payment_txn_admin_all"
  ON payment_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Index for admin queries
CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_created_at_idx ON payment_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions (status);
