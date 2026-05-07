-- ============================================================
-- PROPPSY — Migration 002: Contract Fields Expansion
-- วันที่: 7 พฤษภาคม 2026
-- รัน script นี้ใน Supabase SQL Editor
-- ============================================================

-- ─── เพิ่ม fields ค่าใช้จ่ายรายเดือน ───────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS water_unit_price    NUMERIC,        -- ค่าน้ำ / หน่วย (บาท)
  ADD COLUMN IF NOT EXISTS electric_unit_price NUMERIC,        -- ค่าไฟ / หน่วย (บาท)
  ADD COLUMN IF NOT EXISTS internet_fee        NUMERIC,        -- ค่าอินเตอร์เน็ต / เดือน
  ADD COLUMN IF NOT EXISTS common_fee          NUMERIC,        -- ค่าส่วนกลาง / เดือน
  ADD COLUMN IF NOT EXISTS parking_fee         NUMERIC;        -- ค่าจอดรถ / เดือน

-- ─── เพิ่ม fields การชำระเงิน ────────────────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_date             DATE,           -- วันที่ชำระจริง
  ADD COLUMN IF NOT EXISTS payment_method           TEXT DEFAULT 'transfer'
    CHECK (payment_method IN ('cash', 'transfer', 'cheque')),       -- วิธีชำระ
  ADD COLUMN IF NOT EXISTS bank_ref                 TEXT,           -- เลขอ้างอิงการโอน
  ADD COLUMN IF NOT EXISTS reservation_expire_date  DATE,           -- วันหมดอายุการจอง
  ADD COLUMN IF NOT EXISTS payment_grace_days       INT DEFAULT 5,  -- ผ่อนผันชำระได้ไม่เกิน X วัน
  ADD COLUMN IF NOT EXISTS payment_day_of_month     INT;            -- ชำระทุกวันที่ X (default = วันที่ใน move_in_date)

-- ─── เพิ่ม fields คอมมิชชัน ──────────────────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS commission_rate_pct      NUMERIC,   -- % ค่าคอม
  ADD COLUMN IF NOT EXISTS commission_from_owner    NUMERIC,   -- ค่าคอมจากเจ้าของ
  ADD COLUMN IF NOT EXISTS commission_from_customer NUMERIC;   -- ค่าคอมจากลูกค้า

-- ─── อัพเดต doc_type CHECK constraint ────────────────────────────
-- ต้อง drop constraint เก่าก่อน แล้วสร้างใหม่
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_doc_type_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_doc_type_check
  CHECK (doc_type IN (
    -- เดิม
    'rental', 'reservation', 'renewal', 'cancellation',
    'termination', 'notice', 'receipt_book', 'receipt_rent', 'commission',
    -- ใหม่
    'invoice_reservation',   -- ใบแจ้งหนี้เงินจอง
    'receipt_reservation',   -- ใบเสร็จเงินจอง
    'invoice_deposit',       -- ใบแจ้งหนี้เงินประกัน
    'receipt_deposit',       -- ใบเสร็จเงินประกัน
    'commission_confirm'     -- เอกสารยืนยันค่าคอมมิชชัน
  ));

-- ─── ตรวจสอบผลลัพธ์ ──────────────────────────────────────────────
-- รันบรรทัดนี้หลัง migrate เพื่อยืนยัน:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'contracts' ORDER BY ordinal_position;
