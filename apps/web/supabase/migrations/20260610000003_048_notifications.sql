-- ─────────────────────────────────────────────────────────────
-- 048: Notification center + push subscriptions
-- ─────────────────────────────────────────────────────────────

-- ── Notifications ────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null,
  title      text        not null,
  message    text        not null default '',
  url        text,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

create index on public.notifications (user_id, created_at desc);
create index on public.notifications (user_id, is_read) where not is_read;

alter table public.notifications enable row level security;

-- Authenticated users may read only their own notifications
create policy "notif_select_own" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

-- Authenticated users may update (mark read) only their own
create policy "notif_update_own" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable Realtime CDC so clients receive instant INSERT events
alter publication supabase_realtime add table public.notifications;

-- ── Push subscriptions ────────────────────────────────────────
-- Stores Web Push subscriptions per user/browser/device
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth_key   text        not null,
  created_at timestamptz not null default now(),
  constraint push_subs_user_endpoint_uq unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Users manage their own subscriptions; service role sends pushes (bypasses RLS)
create policy "push_subs_all_own" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
