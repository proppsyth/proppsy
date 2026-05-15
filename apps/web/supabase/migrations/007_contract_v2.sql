-- ============================================================
-- PROPPSY — Migration 007: Contract V2 — docx-based generation
-- วันที่: 15 พฤษภาคม 2026
-- รัน script นี้ใน Supabase SQL Editor
-- ============================================================

-- ─── เพิ่ม columns ใหม่ใน contracts ──────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS language_version TEXT DEFAULT 'th'
    CHECK (language_version IN ('th', 'th_en', 'th_en_zh')),
  ADD COLUMN IF NOT EXISTS template_slug     TEXT,           -- เช่น 'rental_th', 'reservation_th_en'
  ADD COLUMN IF NOT EXISTS sign_token        TEXT UNIQUE,    -- token สำหรับ e-sign link
  ADD COLUMN IF NOT EXISTS signed_at         TIMESTAMPTZ,    -- เวลาที่ลงนามจริง
  ADD COLUMN IF NOT EXISTS docx_url          TEXT,           -- URL ของ .docx ที่ generate แล้ว
  ADD COLUMN IF NOT EXISTS occupant_count    INT DEFAULT 1,  -- จำนวนผู้พักอาศัย
  ADD COLUMN IF NOT EXISTS extra_vars        JSONB DEFAULT '{}'; -- ตัวแปรพิเศษที่ไม่อยู่ใน DB fields

-- ─── อัพเดต doc_type constraint เพิ่ม co_agent ───────────────────

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_doc_type_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_doc_type_check
  CHECK (doc_type IN (
    'rental', 'reservation', 'renewal', 'cancellation',
    'termination', 'notice', 'receipt_book', 'receipt_rent', 'commission',
    'invoice_reservation', 'receipt_reservation',
    'invoice_deposit', 'receipt_deposit',
    'commission_confirm',
    'co_agent'
  ));

-- ─── Furniture Items ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_furniture_items (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT     NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  agent_uid   UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name   TEXT     NOT NULL,
  quantity    INT      DEFAULT 1,
  condition   TEXT     DEFAULT 'good'
    CHECK (condition IN ('good', 'fair', 'damaged', 'missing')),
  notes       TEXT,
  serial_no   TEXT,
  sort_order  INT      DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_furniture_contract_id
  ON public.contract_furniture_items(contract_id);

ALTER TABLE public.contract_furniture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents manage own furniture items"
  ON public.contract_furniture_items
  FOR ALL
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

-- ─── Contract Attachments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_attachments (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT     NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  agent_uid   UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT     NOT NULL,
  label       TEXT,
  attach_type TEXT     DEFAULT 'image'
    CHECK (attach_type IN ('image', 'document')),
  sort_order  INT      DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_contract_id
  ON public.contract_attachments(contract_id);

ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents manage own attachments"
  ON public.contract_attachments
  FOR ALL
  USING  (agent_uid = auth.uid())
  WITH CHECK (agent_uid = auth.uid());

-- ─── ตรวจสอบผลลัพธ์ ──────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'contracts' ORDER BY ordinal_position;
