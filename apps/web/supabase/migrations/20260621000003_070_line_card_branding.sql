-- ─────────────────────────────────────────────────────────────
-- 070: LINE card branding (editable reminder card)
-- ─────────────────────────────────────────────────────────────
-- Per-agent customization of the reminder card: a brand/display name and an
-- optional hero image, both shown on every rent / expiry card the agent sends.
alter table public.line_integrations add column if not exists card_brand_name text;
alter table public.line_integrations add column if not exists card_image_url  text;
