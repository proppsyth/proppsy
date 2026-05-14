-- ─── Credit balance (one row per user) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credits (
  user_id         UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance         INT   NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned    INT   NOT NULL DEFAULT 0,
  total_spent     INT   NOT NULL DEFAULT 0,
  last_reset_date DATE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Business plan: shared credit pool ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_pools (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_uid   UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     INT   NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Team members with optional quota cap (NULL = unlimited from pool)
CREATE TABLE IF NOT EXISTS public.credit_pool_members (
  pool_id      UUID REFERENCES public.credit_pools(id)  ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id)            ON DELETE CASCADE,
  quota_limit  INT,   -- max monthly spend from pool; NULL = unlimited
  PRIMARY KEY (pool_id, user_id)
);

-- ─── Immutable audit log (never UPDATE or DELETE rows) ───────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID  NOT NULL REFERENCES auth.users(id),
  amount        INT   NOT NULL,        -- positive = credited, negative = spent
  balance_after INT   NOT NULL,
  type          TEXT  NOT NULL
    CHECK (type IN ('grant','topup','spend','reset','assign','expire')),
  description   TEXT,
  reference_id  TEXT,                  -- stock_id, omise charge_id, etc.
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Stock: publishing fields ─────────────────────────────────────────────────
ALTER TABLE public.stock
  ADD COLUMN IF NOT EXISTS is_published       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_premium         BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.credits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_pools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_pool_members ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own row
CREATE POLICY "credits_own_all" ON public.credits
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Transactions: read-only from client; all writes go through RPC (SECURITY DEFINER)
CREATE POLICY "transactions_own_read" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pools_own_all" ON public.credit_pools
  FOR ALL TO authenticated
  USING  (admin_uid = auth.uid())
  WITH CHECK (admin_uid = auth.uid());

CREATE POLICY "pool_members_own" ON public.credit_pool_members
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR
    pool_id IN (SELECT id FROM public.credit_pools WHERE admin_uid = auth.uid())
  );

-- ─── RPC: atomic spend (prevents race conditions via FOR UPDATE lock) ─────────
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id      UUID,
  p_amount       INT,
  p_tx_type      TEXT,
  p_description  TEXT,
  p_reference_id TEXT  DEFAULT NULL,
  p_metadata     JSONB DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_balance     INT;
  v_new_balance INT;
BEGIN
  SELECT balance INTO v_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'credit_record_not_found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'error',    'insufficient_credits',
      'balance',  v_balance,
      'required', p_amount
    );
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE public.credits
  SET balance     = v_new_balance,
      total_spent = total_spent + p_amount,
      updated_at  = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions
    (user_id, amount, balance_after, type, description, reference_id, metadata)
  VALUES
    (p_user_id, -p_amount, v_new_balance,
     p_tx_type, p_description, p_reference_id, p_metadata);

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

-- ─── RPC: atomic grant / top-up / reset ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id      UUID,
  p_amount       INT,
  p_tx_type      TEXT,
  p_description  TEXT,
  p_reference_id TEXT    DEFAULT NULL,
  p_is_reset     BOOLEAN DEFAULT FALSE  -- true = replace balance (non-accumulative)
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_old_balance  INT;
  v_new_balance  INT;
  v_earned_delta INT;
BEGIN
  INSERT INTO public.credits (user_id, balance, total_earned)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_old_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF p_is_reset THEN
    -- Use-it-or-lose-it: expire old balance, set to new quota
    v_new_balance  := p_amount;
    v_earned_delta := GREATEST(0, p_amount - v_old_balance);
  ELSE
    v_new_balance  := v_old_balance + p_amount;
    v_earned_delta := p_amount;
  END IF;

  UPDATE public.credits
  SET balance         = v_new_balance,
      total_earned    = total_earned + v_earned_delta,
      last_reset_date = CASE WHEN p_is_reset THEN CURRENT_DATE ELSE last_reset_date END,
      updated_at      = NOW()
  WHERE user_id = p_user_id;

  -- Log expire entry for old unused balance on reset
  IF p_is_reset AND v_old_balance > 0 THEN
    INSERT INTO public.credit_transactions
      (user_id, amount, balance_after, type, description)
    VALUES
      (p_user_id, -v_old_balance, 0, 'expire', 'เครดิตหมดอายุจากการรีเซ็ตรายเดือน');
  END IF;

  INSERT INTO public.credit_transactions
    (user_id, amount, balance_after, type, description, reference_id)
  VALUES
    (p_user_id, p_amount, v_new_balance,
     p_tx_type, p_description, p_reference_id);

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;
