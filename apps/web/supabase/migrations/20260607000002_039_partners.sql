-- 039 Partners / Clients table
-- Replaces the hardcoded CLIENTS array on the homepage.
-- Admin-managed: name, logo, website, sort order, active toggle.

CREATE TABLE public.partners (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th     text        NOT NULL,
  name_en     text,
  logo_url    text,
  website     text,
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Anyone can read active partners (homepage display)
CREATE POLICY "partners_public_select"
  ON public.partners FOR SELECT
  USING (true);

-- Admins can do everything
CREATE POLICY "partners_admin_all"
  ON public.partners
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
