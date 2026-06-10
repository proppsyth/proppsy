-- E-Sign Consent Log table
-- Stores immutable metadata after each electronic signature event.
-- Service role writes; agents read their own via RLS.

CREATE TABLE public.esign_consent_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           TEXT        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_id           TEXT,                  -- denormalized copy of contract_id for self-contained audit
  document_type         TEXT,                  -- rental | reservation | renewal | etc.
  document_no           TEXT,                  -- human-readable doc number (BK-XXXX)
  signer_role           TEXT,                  -- tenant | owner | co_agent | witness
  signer_name           TEXT,
  signed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address            TEXT,
  user_agent            TEXT,
  signature_hash        TEXT,                  -- SHA-256 of canonical signing payload
  consent_text_version  TEXT        NOT NULL DEFAULT 'v1',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_esign_consent_logs_contract_id ON public.esign_consent_logs(contract_id);

ALTER TABLE public.esign_consent_logs ENABLE ROW LEVEL SECURITY;

-- Agents can read logs for contracts they own
CREATE POLICY "agents_read_own_contract_esign_logs"
  ON public.esign_consent_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = esign_consent_logs.contract_id
        AND c.agent_uid = auth.uid()
    )
  );
