-- Commission Records — tracks earned/received commission per agent
-- Lifecycle: pipeline (booking active) → earned (lease signed) → received (paid)

CREATE TABLE public.commission_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_uid        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source references (nullable — record may persist after contract deletion)
  reservation_id   TEXT        REFERENCES public.contracts(id) ON DELETE SET NULL,
  lease_id         TEXT        REFERENCES public.contracts(id) ON DELETE SET NULL,

  -- Financial
  amount           NUMERIC     NOT NULL DEFAULT 0,

  -- Type: new_lease (1 month) | renewal (0.5 month)
  commission_type  TEXT        NOT NULL DEFAULT 'new_lease',

  -- Status lifecycle
  status           TEXT        NOT NULL DEFAULT 'pipeline',

  notes            TEXT,
  earned_at        TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_commission_type   CHECK (commission_type IN ('new_lease', 'renewal')),
  CONSTRAINT chk_commission_status CHECK (status          IN ('pipeline', 'earned', 'received'))
);

CREATE INDEX idx_commission_records_agent   ON public.commission_records (agent_uid, created_at DESC);
CREATE INDEX idx_commission_records_status  ON public.commission_records (agent_uid, status);
CREATE INDEX idx_commission_records_res     ON public.commission_records (reservation_id);
CREATE INDEX idx_commission_records_lease   ON public.commission_records (lease_id);

ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_own_commission_records"
  ON public.commission_records FOR ALL
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

COMMENT ON TABLE public.commission_records IS
  'Per-agent commission pipeline. pipeline=booking active, earned=lease signed, received=paid.';
