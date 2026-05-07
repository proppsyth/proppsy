-- ============================================================
-- PROPPSY — Initial Database Schema
-- วันที่: 6 พฤษภาคม 2026
-- รัน script นี้ใน Supabase SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- สำหรับ fuzzy search

-- ============================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  nickname TEXT,
  phone TEXT,
  line_id TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected')),
  permissions JSONB NOT NULL DEFAULT '{"stock":true,"owner":true,"customer":true,"project":true,"contract":true}',
  company_name TEXT,
  tax_id TEXT,
  national_id TEXT,
  id_card_url TEXT,
  signature_url TEXT,
  logo_url TEXT,
  address_no TEXT,
  address_road TEXT,
  province TEXT,
  district TEXT,
  subdistrict TEXT,
  zip TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: projects
-- ============================================================
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,  -- format: PRJ-XXXX
  name_th TEXT NOT NULL,
  name_en TEXT,
  developer TEXT,
  built_year INT,
  total_floors INT,
  total_units INT,
  parking_pct INT,
  facilities TEXT[] DEFAULT '{}',
  bts_mrt TEXT[] DEFAULT '{}',
  address_no TEXT,
  address_road TEXT,
  province TEXT,
  district TEXT,
  subdistrict TEXT,
  zip TEXT,
  map_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: owners (landlords)
-- ============================================================
CREATE TABLE public.owners (
  id TEXT PRIMARY KEY,  -- format: OWN-XXXX
  agent_uid UUID NOT NULL REFERENCES public.profiles(id),
  prefix TEXT,
  prefix_en TEXT,
  first_name_th TEXT,
  last_name_th TEXT,
  first_name_en TEXT,
  last_name_en TEXT,
  nickname TEXT,
  phone TEXT,
  line_id TEXT,
  national_id TEXT,
  id_card_url TEXT,
  address_no TEXT,
  address_road TEXT,
  province TEXT,
  district TEXT,
  subdistrict TEXT,
  zip TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: customers (tenants/buyers)
-- ============================================================
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,  -- format: CUS-XXXX
  agent_uid UUID NOT NULL REFERENCES public.profiles(id),
  prefix TEXT,
  prefix_en TEXT,
  first_name_th TEXT,
  last_name_th TEXT,
  first_name_en TEXT,
  last_name_en TEXT,
  nickname TEXT,
  phone TEXT,
  line_id TEXT,
  national_id TEXT,
  id_card_url TEXT,
  source TEXT CHECK (source IN ('line_oa', 'referral', 'walk_in', 'online')),
  follow_up BOOLEAN NOT NULL DEFAULT FALSE,
  address_no TEXT,
  address_road TEXT,
  province TEXT,
  district TEXT,
  subdistrict TEXT,
  zip TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: stock (property listings)
-- ============================================================
CREATE TABLE public.stock (
  id TEXT PRIMARY KEY,  -- format: STK-XXXX
  project_id TEXT REFERENCES public.projects(id),
  project_name TEXT,  -- denormalized
  owner_id TEXT REFERENCES public.owners(id),
  agent_uid UUID NOT NULL REFERENCES public.profiles(id),
  unit_no TEXT,
  unit_name TEXT,
  building TEXT,
  floor INT,
  room_type TEXT CHECK (room_type IN ('Studio', '1BR', '2BR', '3BR', 'Penthouse', 'อื่นๆ')),
  size_sqm NUMERIC,
  view_direction TEXT,
  listing_type TEXT NOT NULL DEFAULT 'rent' CHECK (listing_type IN ('rent', 'sale', 'both')),
  rent_price NUMERIC,
  sale_price NUMERIC,
  deposit INT NOT NULL DEFAULT 1,
  contract_term INT NOT NULL DEFAULT 12,
  furniture TEXT[] DEFAULT '{}',
  facilities TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'sold', 'unavailable')),
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  raw_text TEXT,
  contract_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: contracts
-- ============================================================
CREATE TABLE public.contracts (
  id TEXT PRIMARY KEY,  -- format: BK-XXXX
  agent_uid UUID NOT NULL REFERENCES public.profiles(id),
  stock_id TEXT REFERENCES public.stock(id),
  owner_id TEXT REFERENCES public.owners(id),
  customer_id TEXT REFERENCES public.customers(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'rental', 'reservation', 'renewal', 'cancellation',
    'termination', 'notice', 'receipt_book', 'receipt_rent', 'commission'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
  rent_price NUMERIC,
  deposit_amount NUMERIC,
  commission_net NUMERIC,
  deposit_months INT,
  contract_months INT,
  move_in_date DATE,
  end_date DATE,
  cleaning_fee NUMERIC,
  ac_count INT,
  ac_wash_per_unit NUMERIC,
  penalty_amount NUMERIC,
  vat_7 BOOLEAN NOT NULL DEFAULT FALSE,
  wht_3 BOOLEAN NOT NULL DEFAULT FALSE,
  doc_url TEXT,
  pdf_url TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: appointments
-- ============================================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_uid UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  stock_id TEXT REFERENCES public.stock(id),
  customer_id TEXT REFERENCES public.customers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: news
-- ============================================================
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  cover_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEQUENCES for custom IDs
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS seq_projects START 1;
CREATE SEQUENCE IF NOT EXISTS seq_owners START 1;
CREATE SEQUENCE IF NOT EXISTS seq_customers START 1;
CREATE SEQUENCE IF NOT EXISTS seq_stock START 1;
CREATE SEQUENCE IF NOT EXISTS seq_contracts START 1;

-- Functions for auto-generating IDs
CREATE OR REPLACE FUNCTION generate_project_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'PRJ-' || LPAD(nextval('seq_projects')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_owner_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'OWN-' || LPAD(nextval('seq_owners')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_customer_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'CUS-' || LPAD(nextval('seq_customers')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_stock_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'STK-' || LPAD(nextval('seq_stock')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_contract_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'BK-' || LPAD(nextval('seq_contracts')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUTO updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_updated_at BEFORE UPDATE ON public.stock FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE on Auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'user',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CONTRACT → STOCK status sync trigger
-- ============================================================
CREATE OR REPLACE FUNCTION sync_stock_on_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
    IF NEW.doc_type IN ('rental', 'renewal') THEN
      UPDATE public.stock
      SET status = 'rented', contract_end_date = NEW.end_date
      WHERE id = NEW.stock_id;
    ELSIF NEW.doc_type = 'reservation' THEN
      UPDATE public.stock
      SET status = 'unavailable'
      WHERE id = NEW.stock_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contract_sync_stock
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION sync_stock_on_contract();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND account_status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_insert_trigger" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- PROJECTS (all approved users can read, agent creates own)
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_status = 'approved')
);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (
  created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_status = 'approved'
  )
);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (
  created_by = auth.uid() OR is_admin()
);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (is_admin());

-- OWNERS (agent sees own, admin sees all)
CREATE POLICY "owners_select" ON public.owners FOR SELECT USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "owners_insert" ON public.owners FOR INSERT WITH CHECK (agent_uid = auth.uid());
CREATE POLICY "owners_update" ON public.owners FOR UPDATE USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "owners_delete" ON public.owners FOR DELETE USING (agent_uid = auth.uid() OR is_admin());

-- CUSTOMERS (agent sees own, admin sees all)
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (agent_uid = auth.uid());
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (agent_uid = auth.uid() OR is_admin());

-- STOCK (agent sees own, admin sees all, public sees available only)
CREATE POLICY "stock_select_own" ON public.stock FOR SELECT USING (
  agent_uid = auth.uid() OR is_admin() OR status = 'available'
);
CREATE POLICY "stock_insert" ON public.stock FOR INSERT WITH CHECK (agent_uid = auth.uid());
CREATE POLICY "stock_update" ON public.stock FOR UPDATE USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "stock_delete" ON public.stock FOR DELETE USING (agent_uid = auth.uid() OR is_admin());

-- CONTRACTS
CREATE POLICY "contracts_select" ON public.contracts FOR SELECT USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT WITH CHECK (agent_uid = auth.uid());
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE USING (agent_uid = auth.uid() OR is_admin());

-- APPOINTMENTS
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT WITH CHECK (agent_uid = auth.uid());
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE USING (agent_uid = auth.uid() OR is_admin());
CREATE POLICY "appointments_delete" ON public.appointments FOR DELETE USING (agent_uid = auth.uid() OR is_admin());

-- NEWS (all can read published, admin creates)
CREATE POLICY "news_select" ON public.news FOR SELECT USING (published = TRUE OR is_admin());
CREATE POLICY "news_insert" ON public.news FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "news_update" ON public.news FOR UPDATE USING (is_admin());
CREATE POLICY "news_delete" ON public.news FOR DELETE USING (is_admin());

-- ============================================================
-- Supabase Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('id-cards', 'id-cards', FALSE),
  ('signatures', 'signatures', FALSE),
  ('logos', 'logos', TRUE),
  ('stock-photos', 'stock-photos', TRUE),
  ('documents', 'documents', FALSE)
ON CONFLICT DO NOTHING;

-- Storage RLS
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'logos' AND auth.uid() IS NOT NULL
);

CREATE POLICY "stock_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'stock-photos');
CREATE POLICY "stock_photos_auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'stock-photos' AND auth.uid() IS NOT NULL
);

CREATE POLICY "id_cards_own" ON storage.objects FOR ALL USING (
  bucket_id = 'id-cards' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "signatures_own" ON storage.objects FOR ALL USING (
  bucket_id = 'signatures' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "documents_own" ON storage.objects FOR ALL USING (
  bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

-- ============================================================
-- Insert Admin profile (ต้อง signup ก่อนแล้วค่อย update role)
-- ============================================================
-- หลังจาก signup ด้วย proppsyth@gmail.com แล้ว รัน:
-- UPDATE public.profiles SET role = 'admin', account_status = 'approved' WHERE id = '8XjsiDhv6PhlmDgLSzSd9FRKeIG3';
-- (ถ้า ID ใน Supabase Auth ต่างออกไป ให้ใช้ id จาก auth.users table)
