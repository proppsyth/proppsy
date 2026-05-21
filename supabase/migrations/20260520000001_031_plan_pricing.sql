-- Migration 031: add pricing + features + display order to plan_limits

ALTER TABLE plan_limits
  ADD COLUMN IF NOT EXISTS price_monthly_thb  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_thb   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feature_list       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order      INT NOT NULL DEFAULT 0;

UPDATE plan_limits SET
  price_monthly_thb = 0,
  price_yearly_thb  = 0,
  feature_list      = ARRAY['ทรัพย์ได้สูงสุด 10 รายการ', 'สัญญา 5 ฉบับ/เดือน', 'AI 10 ครั้ง/เดือน'],
  display_order     = 1
WHERE plan = 'starter';

UPDATE plan_limits SET
  price_monthly_thb = 990,
  price_yearly_thb  = 9900,
  feature_list      = ARRAY['ทรัพย์ไม่จำกัด', 'สัญญาไม่จำกัด', 'AI 300 ครั้ง/เดือน', 'Marketplace listing', 'ระบบสัญญาครบวงจร'],
  display_order     = 2
WHERE plan = 'professional';

UPDATE plan_limits SET
  price_monthly_thb = 1990,
  price_yearly_thb  = 19900,
  feature_list      = ARRAY['ทุกอย่างใน Professional', 'ทีมสูงสุด 5 คน', 'AI 300 ครั้ง/เดือน', 'รายงานขั้นสูง', 'Priority support'],
  display_order     = 3
WHERE plan = 'business';
