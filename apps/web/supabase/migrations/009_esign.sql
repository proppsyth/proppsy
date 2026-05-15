-- ============================================================
-- PROPPSY — Migration 009: E-Signature System
-- วันที่: 15 พฤษภาคม 2026
-- รัน script นี้ใน Supabase SQL Editor
-- ============================================================

-- ─── Extend contract status ──────────────────────────────────

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'draft', 'sent', 'viewed', 'partially_signed', 'signed', 'completed', 'cancelled'
  ));

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- ─── Contract Signers ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_signers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      TEXT        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  agent_uid        UUID        NOT NULL REFERENCES auth.users(id),
  signer_role      TEXT        NOT NULL DEFAULT 'tenant'
    CHECK (signer_role IN ('tenant', 'owner', 'co_agent', 'witness')),
  signer_name      TEXT,
  signer_phone     TEXT,
  sign_token       TEXT        UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  token_expires_at TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'signed', 'declined')),
  viewed_at        TIMESTAMPTZ,
  signed_at        TIMESTAMPTZ,
  signature_url    TEXT,
  signature_type   TEXT        CHECK (signature_type IN ('drawn', 'typed')),
  signed_name      TEXT,
  ip_address       TEXT,
  user_agent       TEXT,
  sort_order       INT         DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_signers_contract
  ON public.contract_signers(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_signers_token
  ON public.contract_signers(sign_token);

ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents manage own signers"
  ON public.contract_signers FOR ALL
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

-- ─── Sign Audit Events ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_sign_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_id   UUID        REFERENCES public.contract_signers(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL
    CHECK (event_type IN (
      'link_generated', 'signer_added', 'link_opened',
      'signed', 'declined', 'status_changed'
    )),
  actor_name  TEXT,
  actor_role  TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sign_events_contract
  ON public.contract_sign_events(contract_id);

ALTER TABLE public.contract_sign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents view own sign events"
  ON public.contract_sign_events FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.contracts WHERE agent_uid = auth.uid()
    )
  );

-- ─── Signatures storage bucket ───────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures');

-- ─── ตรวจสอบผลลัพธ์ ──────────────────────────────────────────
-- SELECT * FROM contract_signers LIMIT 1;
-- SELECT * FROM contract_sign_events LIMIT 1;
