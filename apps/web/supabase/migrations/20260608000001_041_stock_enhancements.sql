-- 041_stock_enhancements
-- co_agent_accepted flag + view_count tracking on stock listings

ALTER TABLE stock ADD COLUMN IF NOT EXISTS co_agent_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Atomic view-count increment (SECURITY DEFINER so public callers can bump the counter
-- without needing direct UPDATE on the table through RLS).
CREATE OR REPLACE FUNCTION increment_stock_view(stock_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stock SET view_count = view_count + 1 WHERE id = stock_id;
END;
$$;
