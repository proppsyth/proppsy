-- Allow alphanumeric floor values (e.g. "12A") instead of integer-only
ALTER TABLE stock ALTER COLUMN floor TYPE TEXT USING floor::text;
