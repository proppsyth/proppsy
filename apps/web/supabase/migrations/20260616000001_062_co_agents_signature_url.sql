-- Add signature_url to co_agents table
ALTER TABLE co_agents ADD COLUMN IF NOT EXISTS signature_url TEXT;
