-- Security deposit (เงินประกัน) — separate from booking deposit (deposit_amount/เงินมัดจำ)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS security_deposit INT;

-- Co-agent profile snapshot stored on the contract (address, bank, tax ID)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS co_agent_info JSONB;

-- Co-agent commission split percentage (default 50 when co-agent present)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS co_agent_split_pct INT;

-- Co-agent's share of commission in THB
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS co_agent_commission INT;
