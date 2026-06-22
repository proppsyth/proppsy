-- ─────────────────────────────────────────────────────────────
-- 077: Per-user notification preferences
-- ─────────────────────────────────────────────────────────────
-- jsonb map of category → boolean. NULL (default) means everything is enabled;
-- a category set to false suppresses bell + push for that category.
alter table public.profiles add column if not exists notification_prefs jsonb;
