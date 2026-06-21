-- ─────────────────────────────────────────────────────────────
-- 069: LINE webhook diagnostics
-- ─────────────────────────────────────────────────────────────
-- Record when the agent's LINE channel last reached our webhook, so the UI can
-- tell the agent whether LINE is actually delivering events (the #1 setup pitfall
-- is Response mode = "Chat" or "Use webhook" being off, which silently drops events).
alter table public.line_integrations add column if not exists last_webhook_at    timestamptz;
alter table public.line_integrations add column if not exists last_webhook_event text;
