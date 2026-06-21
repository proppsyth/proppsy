-- ─────────────────────────────────────────────────────────────
-- 071: Saved AI post per stock
-- ─────────────────────────────────────────────────────────────
-- Persist the agent's reviewed/edited AI-generated marketing post so it can be
-- copied again later without re-running (and re-charging) the AI generator.
alter table public.stock add column if not exists ai_post_text       text;
alter table public.stock add column if not exists ai_post_updated_at timestamptz;
