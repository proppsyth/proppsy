create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  link_url text,
  position text not null default 'home_top',
  is_active boolean not null default true,
  start_date date,
  end_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "Public can read active banners"
  on public.banners for select
  using (is_active = true and (start_date is null or start_date <= current_date) and (end_date is null or end_date >= current_date));

create policy "Admin full access on banners"
  on public.banners for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
