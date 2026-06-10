-- Activity Timeline v1
-- Lightweight business-event log — NOT a full audit trail

CREATE TABLE public.activity_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type   TEXT        NOT NULL,
  entity_id     TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_entity_type CHECK (
    entity_type IN ('stock','project','owner','tenant','booking','lease','renewal',
                    'termination','esign','invoice','receipt','commission','coagent')
  )
);

-- Performance indexes
CREATE INDEX idx_activity_logs_created_at   ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_entity       ON public.activity_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_logs_user_id      ON public.activity_logs (user_id, created_at DESC);

-- RLS: agents see only their own log entries
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_read_own_activity"
  ON public.activity_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "service_role_all"
  ON public.activity_logs FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.activity_logs IS
  'Business-event timeline. Tracks significant CRUD events for stock, contracts, owners, tenants, esign, etc. Not a UI audit log.';
