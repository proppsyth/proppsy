-- ─────────────────────────────────────────────────────────────
-- 068: LINE integration (per-agent OA rent / expiry reminders)
-- ─────────────────────────────────────────────────────────────
-- Each agent connects their OWN LINE OA (Messaging API channel). The system
-- pushes monthly rent reminders and 30-day lease-expiry reminders into the
-- LINE group that holds the owner / tenant / agent, using the agent's own
-- channel access token. Group IDs are captured passively via the webhook when
-- the agent's bot is added to a group.

-- ── Per-agent LINE OA credentials ────────────────────────────
create table if not exists public.line_integrations (
  agent_uid            uuid        primary key references auth.users(id) on delete cascade,
  channel_access_token text        not null,
  channel_secret       text        not null,
  bot_user_id          text,        -- the bot's own userId (= webhook "destination")
  bot_basic_id         text,        -- @xxxx handle
  bot_display_name     text,
  enabled              boolean      not null default true,
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

-- Service role (webhook) resolves which agent a webhook belongs to via the bot userId
create index if not exists line_integrations_bot_user_id_idx
  on public.line_integrations (bot_user_id);

alter table public.line_integrations enable row level security;

-- Owner-only: an agent can read / manage only their own integration.
create policy "line_integ_select_own" on public.line_integrations
  for select to authenticated using (auth.uid() = agent_uid);
create policy "line_integ_insert_own" on public.line_integrations
  for insert to authenticated with check (auth.uid() = agent_uid);
create policy "line_integ_update_own" on public.line_integrations
  for update to authenticated using (auth.uid() = agent_uid) with check (auth.uid() = agent_uid);
create policy "line_integ_delete_own" on public.line_integrations
  for delete to authenticated using (auth.uid() = agent_uid);

-- ── Groups the agent's bot belongs to (captured via webhook) ─
create table if not exists public.line_groups (
  id         uuid        primary key default gen_random_uuid(),
  agent_uid  uuid        not null references auth.users(id) on delete cascade,
  group_id   text        not null,        -- LINE group id (C...)
  group_name text,                        -- best-effort, from group summary API
  is_active  boolean     not null default true,  -- false once the bot leaves
  joined_at  timestamptz not null default now(),
  unique (agent_uid, group_id)
);

create index if not exists line_groups_agent_idx on public.line_groups (agent_uid, is_active);

alter table public.line_groups enable row level security;

-- Owner-only read. Writes happen from the webhook (service role, bypasses RLS).
create policy "line_groups_select_own" on public.line_groups
  for select to authenticated using (auth.uid() = agent_uid);

-- ── Lease-level LINE reminder config ─────────────────────────
alter table public.contracts add column if not exists line_group_id                  text;
alter table public.contracts add column if not exists line_rent_reminder_enabled     boolean not null default false;
alter table public.contracts add column if not exists line_expiry_reminder_enabled   boolean not null default false;
alter table public.contracts add column if not exists line_last_rent_reminded_on     date;
alter table public.contracts add column if not exists line_last_expiry_reminded_on   date;

-- ── Audit / dedup log of pushed messages ─────────────────────
create table if not exists public.line_message_log (
  id          uuid        primary key default gen_random_uuid(),
  agent_uid   uuid        not null references auth.users(id) on delete cascade,
  contract_id text        references public.contracts(id) on delete set null,
  group_id    text,
  kind        text        not null,  -- 'rent_reminder' | 'expiry_reminder' | 'test'
  status      text        not null,  -- 'sent' | 'failed'
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists line_message_log_agent_idx on public.line_message_log (agent_uid, created_at desc);

alter table public.line_message_log enable row level security;

create policy "line_msglog_select_own" on public.line_message_log
  for select to authenticated using (auth.uid() = agent_uid);
