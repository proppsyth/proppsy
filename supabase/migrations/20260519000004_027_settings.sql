create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  label text,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.settings enable row level security;

create policy "Admin full access on settings"
  on public.settings for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

insert into public.settings (key, value, label, description) values
  ('maintenance_mode',  'false',        'Maintenance Mode',    'ปิดระบบชั่วคราวสำหรับผู้ใช้ทั่วไป'),
  ('site_name',         '"Proppsy"',    'Site Name',           'ชื่อแพลตฟอร์ม'),
  ('contact_email',     '"support@proppsy.com"', 'Contact Email', 'อีเมลสำหรับติดต่อทีม'),
  ('allow_registration','true',         'Allow Registration',  'เปิด/ปิด การลงทะเบียนใหม่'),
  ('require_approval',  'true',         'Require Approval',    'บัญชีใหม่ต้องรออนุมัติก่อนใช้งาน'),
  ('ai_enabled',        'true',         'AI Features',         'เปิดใช้งาน AI และ OCR'),
  ('max_free_stock',    '5',            'Free Plan Stock Limit','จำนวนทรัพย์สูงสุดสำหรับ Starter plan'),
  ('line_notify_token', 'null',         'LINE Notify Token',   'Token สำหรับ LINE Notify alerts')
on conflict (key) do nothing;
