-- ============================================================
-- MIGRATION 005: Credit management system
-- ============================================================

-- ── 1. Credits balance per user ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.credits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance        INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned   INTEGER NOT NULL DEFAULT 0,
  total_spent    INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Immutable transaction audit log ───────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_type      TEXT NOT NULL
    CHECK (tx_type IN ('topup','grant','spend','reset','assign','expire')),
  amount       INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description  TEXT,
  reference_id TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Credit pools (Business plan shared pools) ─────────────
CREATE TABLE IF NOT EXISTS public.credit_pools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_pool_members (
  pool_id     UUID NOT NULL REFERENCES public.credit_pools(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit INTEGER,
  PRIMARY KEY (pool_id, user_id)
);

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE public.credits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_pools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_pool_members ENABLE ROW LEVEL SECURITY;

-- credits: user sees own row only
CREATE POLICY "user reads own credits"
  ON public.credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- credit_transactions: user sees own rows only
CREATE POLICY "user reads own transactions"
  ON public.credit_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- credit_pools: pool owner only
CREATE POLICY "pool owner manages pool"
  ON public.credit_pools FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- credit_pool_members: pool owner manages members
CREATE POLICY "pool owner manages members"
  ON public.credit_pool_members FOR ALL TO authenticated
  USING (
    pool_id IN (SELECT id FROM public.credit_pools WHERE owner_id = auth.uid())
  );

-- ── 5. RPC: grant_credits ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_tx_type     TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_is_reset    BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance  INTEGER := 0;
  v_new_balance  INTEGER;
  v_credits_row  credits%ROWTYPE;
BEGIN
  -- Upsert credits row
  INSERT INTO credits (user_id, balance, total_earned, last_reset_date)
  VALUES (p_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_credits_row FROM credits WHERE user_id = p_user_id FOR UPDATE;
  v_old_balance := v_credits_row.balance;

  IF p_is_reset THEN
    -- Log expiry of old balance before reset
    IF v_old_balance > 0 THEN
      INSERT INTO credit_transactions (user_id, tx_type, amount, balance_after, description)
      VALUES (p_user_id, 'expire', -v_old_balance, 0, 'รีเซ็ตรายเดือน — ยอดเก่าหมดอายุ');
    END IF;
    v_new_balance := p_amount;
    UPDATE credits
    SET balance        = p_amount,
        total_earned   = total_earned + p_amount,
        last_reset_date = CURRENT_DATE,
        updated_at     = NOW()
    WHERE user_id = p_user_id;
  ELSE
    v_new_balance := v_old_balance + p_amount;
    UPDATE credits
    SET balance      = v_new_balance,
        total_earned = total_earned + p_amount,
        updated_at   = NOW()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO credit_transactions (user_id, tx_type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_tx_type, p_amount, v_new_balance, p_description, p_reference_id);

  RETURN jsonb_build_object('ok', TRUE, 'balance', v_new_balance);
END;
$$;

-- ── 6. RPC: spend_credits ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id      UUID,
  p_amount       INTEGER,
  p_tx_type      TEXT,
  p_description  TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance  INTEGER;
  v_new_bal  INTEGER;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT balance INTO v_balance FROM credits WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('error', 'insufficient_credits', 'balance', 0, 'required', p_amount);
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'insufficient_credits', 'balance', v_balance, 'required', p_amount);
  END IF;

  v_new_bal := v_balance - p_amount;

  UPDATE credits
  SET balance     = v_new_bal,
      total_spent = total_spent + p_amount,
      updated_at  = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions
    (user_id, tx_type, amount, balance_after, description, reference_id, metadata)
  VALUES
    (p_user_id, p_tx_type, -p_amount, v_new_bal, p_description, p_reference_id, p_metadata);

  RETURN jsonb_build_object('ok', TRUE, 'balance', v_new_bal);
END;
$$;

-- ── 7. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON public.credit_transactions (user_id, created_at DESC);
