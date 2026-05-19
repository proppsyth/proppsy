create table if not exists public.faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faq enable row level security;

create policy "Public can read published faq"
  on public.faq for select using (is_published = true);

create policy "Admin full access on faq"
  on public.faq for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
