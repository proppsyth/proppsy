-- Backfill commission_records for pre-existing contracts
-- Idempotent: NOT EXISTS guards prevent duplicates on re-run

DO $$
DECLARE
  r RECORD;
BEGIN

  -- ── 1. Leases → new_lease earned records ─────────────────────
  -- Amount priority: commission_net on lease > commission_confirm child doc > rent_price (1 month)
  FOR r IN
    SELECT
      l.id                     AS lease_id,
      l.agent_uid,
      l.parent_contract_id     AS reservation_id,
      COALESCE(
        l.commission_net,
        (SELECT cc.commission_net
         FROM public.contracts cc
         WHERE cc.parent_contract_id = l.id
           AND cc.doc_type = 'commission_confirm'
           AND cc.deleted_at IS NULL
         ORDER BY cc.created_at DESC LIMIT 1),
        l.rent_price
      ) AS resolved_amount
    FROM public.contracts l
    WHERE l.contract_category = 'lease'
      AND l.doc_type = 'rental'
      AND l.deleted_at IS NULL
      AND l.status NOT IN ('cancelled')
      AND NOT EXISTS (
        SELECT 1 FROM public.commission_records cr
        WHERE cr.lease_id = l.id AND cr.commission_type = 'new_lease'
      )
  LOOP
    IF r.resolved_amount IS NULL OR r.resolved_amount <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.commission_records (
      agent_uid, reservation_id, lease_id,
      amount, commission_type, status, earned_at
    ) VALUES (
      r.agent_uid, r.reservation_id, r.lease_id,
      r.resolved_amount, 'new_lease', 'earned', NOW()
    );
  END LOOP;

  -- ── 2. Renewal docs → renewal earned records at 0.5× rent ────
  FOR r IN
    SELECT
      c.id                      AS renewal_id,
      c.agent_uid,
      ROUND(c.rent_price * 0.5) AS renewal_commission
    FROM public.contracts c
    WHERE c.doc_type = 'renewal'
      AND c.contract_category = 'child'
      AND c.deleted_at IS NULL
      AND c.parent_contract_id IS NOT NULL
      AND c.rent_price > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.commission_records cr
        WHERE cr.lease_id = c.id AND cr.commission_type = 'renewal'
      )
  LOOP
    INSERT INTO public.commission_records (
      agent_uid, lease_id,
      amount, commission_type, status, earned_at
    ) VALUES (
      r.agent_uid, r.renewal_id,
      r.renewal_commission, 'renewal', 'earned', NOW()
    );
  END LOOP;

END;
$$;
