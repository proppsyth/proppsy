-- 036: Key & Equipment Handover Items per contract
-- Stores the move-in key/device handover list for rental contracts.
-- Each row is one item line (key, keycard, remote, etc.) with quantity and lost-penalty amount.

CREATE TABLE IF NOT EXISTS public.contract_key_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id    TEXT        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  agent_uid      UUID        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  item_name_th   TEXT        NOT NULL,
  item_name_en   TEXT        NOT NULL DEFAULT '',
  quantity       INT         NOT NULL DEFAULT 1,
  penalty_amount INT         NOT NULL DEFAULT 500,
  sort_order     INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contract_key_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_manage_own_key_items"
  ON public.contract_key_items
  FOR ALL
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

CREATE INDEX IF NOT EXISTS idx_key_items_contract_id
  ON public.contract_key_items (contract_id);
