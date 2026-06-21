-- ─────────────────────────────────────────────────────────────
-- 073: Scale indexes (S1) — ~10k stock / ~20k contracts
-- ─────────────────────────────────────────────────────────────
-- stock previously had only its primary key, so every agent_uid filter (and the
-- public marketplace queries) did a full table scan.
create index if not exists stock_agent_uid_idx on public.stock (agent_uid);
create index if not exists stock_public_idx on public.stock (status, published_at desc) where is_published;
-- Contract dependency guard + child lookups walk these self-FKs.
create index if not exists contracts_parent_idx on public.contracts (parent_contract_id) where parent_contract_id is not null;
create index if not exists contracts_master_idx on public.contracts (master_contract_id) where master_contract_id is not null;
