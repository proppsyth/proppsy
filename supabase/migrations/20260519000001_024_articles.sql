create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_url text,
  category text not null default 'general',
  is_published boolean not null default false,
  published_at timestamptz,
  author_uid uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;

create policy "Public can read published articles"
  on public.articles for select using (is_published = true);

create policy "Admin full access on articles"
  on public.articles for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
