-- ============================================================
-- MIGRATION 006: AI usage quota (monthly, per-user)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_calls_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calls_month       DATE;

-- ── RPC: increment_ai_usage ──────────────────────────────────
-- Atomically resets counter on new month, checks quota, then increments.
-- Returns { ok, used, limit } on success or { error, used, limit } if exceeded.
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan          TEXT;
  v_expires_at    TIMESTAMPTZ;
  v_quota         INTEGER;
  v_current_month DATE;
  v_stored_month  DATE;
  v_used          INTEGER;
BEGIN
  SELECT plan, plan_expires_at, ai_calls_this_month, ai_calls_month
  INTO v_plan, v_expires_at, v_used, v_stored_month
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  -- Quota by plan
  v_quota := CASE
    WHEN v_plan = 'professional' THEN 300
    WHEN v_plan = 'business'     THEN 300
    ELSE 10  -- starter
  END;

  -- Expired paid plan → revoke AI beyond starter
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() AND v_plan != 'starter' THEN
    v_quota := 0;
  END IF;

  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Reset on new month
  IF v_stored_month IS NULL OR v_stored_month < v_current_month THEN
    UPDATE profiles
    SET ai_calls_this_month = 1,
        ai_calls_month      = v_current_month
    WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', TRUE, 'used', 1, 'limit', v_quota);
  END IF;

  -- Quota exceeded
  IF v_used >= v_quota THEN
    RETURN jsonb_build_object('error', 'quota_exceeded', 'used', v_used, 'limit', v_quota);
  END IF;

  -- Increment
  UPDATE profiles
  SET ai_calls_this_month = ai_calls_this_month + 1
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', TRUE, 'used', v_used + 1, 'limit', v_quota);
END;
$$;
