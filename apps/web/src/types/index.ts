// ============================================================
// PROPPSY — TypeScript Types
// ============================================================

export type Role = 'admin' | 'manager' | 'user'
export type AccountStatus = 'pending' | 'approved' | 'rejected'
export type Plan = 'starter' | 'professional' | 'business'
export type StockStatus = 'available' | 'rented' | 'sold' | 'unavailable'
export type ListingType = 'rent' | 'sale' | 'both'
export type RoomType = 'Studio' | '1BR' | '2BR' | '3BR' | 'Penthouse' | 'อื่นๆ'
export type ContractDocType =
  | 'rental' | 'reservation' | 'renewal' | 'cancellation'
  | 'termination' | 'notice' | 'receipt_book' | 'receipt_rent' | 'commission'
  | 'invoice_reservation' | 'receipt_reservation'
  | 'invoice_deposit' | 'receipt_deposit'
  | 'commission_confirm'
export type PaymentMethod = 'cash' | 'transfer' | 'cheque'
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'cancelled'
export type CustomerSource = 'line_oa' | 'referral' | 'walk_in' | 'online'

export interface Permissions {
  stock: boolean
  owner: boolean
  customer: boolean
  project: boolean
  contract: boolean
}

export interface Profile {
  id: string
  email?: string
  name?: string
  nickname?: string
  phone?: string
  line_id?: string
  position?: string
  role: Role
  account_status: AccountStatus
  permissions: Permissions
  company_name?: string
  tax_id?: string
  national_id?: string
  id_card_url?: string
  signature_url?: string
  logo_url?: string
  address_no?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
  plan?: Plan
  plan_expires_at?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string  // PRJ-XXXX
  name_th: string
  name_en?: string
  developer?: string
  built_year?: number
  total_floors?: number
  total_units?: number
  parking_pct?: number
  facilities: string[]
  bts_mrt: string[]
  address_no?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  map_url?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Owner {
  id: string  // OWN-XXXX
  agent_uid: string
  prefix?: string
  prefix_en?: string
  first_name_th?: string
  last_name_th?: string
  first_name_en?: string
  last_name_en?: string
  nickname?: string
  phone?: string
  line_id?: string
  national_id?: string
  id_card_url?: string
  address_no?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
  signature_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string  // CUS-XXXX
  agent_uid: string
  prefix?: string
  prefix_en?: string
  first_name_th?: string
  last_name_th?: string
  first_name_en?: string
  last_name_en?: string
  nickname?: string
  phone?: string
  line_id?: string
  national_id?: string
  id_card_url?: string
  source?: CustomerSource
  follow_up: boolean
  address_no?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
  signature_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Stock {
  id: string  // STK-XXXX
  project_id?: string
  project_name?: string
  owner_id?: string
  agent_uid: string
  unit_no?: string
  unit_name?: string
  building?: string
  floor?: number
  room_type?: RoomType
  size_sqm?: number
  view_direction?: string
  listing_type: ListingType
  rent_price?: number
  sale_price?: number
  deposit: number
  contract_term: number
  furniture: string[]
  facilities: string[]
  status: StockStatus
  photo_urls: string[]
  notes?: string
  raw_text?: string
  contract_end_date?: string
  created_at: string
  updated_at: string
  // Joined
  project?: Project
  owner?: Owner
  agent?: Profile
}

export interface Contract {
  id: string  // BK-XXXX
  agent_uid: string
  stock_id?: string
  owner_id?: string
  customer_id?: string
  doc_type: ContractDocType
  status: ContractStatus
  rent_price?: number
  deposit_amount?: number
  commission_net?: number
  deposit_months?: number
  contract_months?: number
  move_in_date?: string
  end_date?: string
  cleaning_fee?: number
  ac_count?: number
  ac_wash_per_unit?: number
  penalty_amount?: number
  vat_7: boolean
  wht_3: boolean
  // Monthly expenses
  water_unit_price?: number
  electric_unit_price?: number
  internet_fee?: number
  common_fee?: number
  parking_fee?: number
  // Payment details
  payment_date?: string
  payment_method?: PaymentMethod
  bank_ref?: string
  reservation_expire_date?: string
  payment_grace_days?: number
  payment_day_of_month?: number
  // Commission
  commission_rate_pct?: number
  commission_from_owner?: number
  commission_from_customer?: number
  doc_url?: string
  pdf_url?: string
  snapshot?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  stock?: Stock
  owner?: Owner
  customer?: Customer
}

export interface Appointment {
  id: string
  agent_uid: string
  title: string
  description?: string
  stock_id?: string
  customer_id?: string
  start_time: string
  end_time?: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
  // Joined
  stock?: Stock
  customer?: Customer
}

export interface News {
  id: string
  title: string
  summary?: string
  content?: string
  cover_url?: string
  published: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Helper display functions
// ============================================================

export function ownerDisplayName(owner: Partial<Owner>): string {
  if (owner.nickname) return owner.nickname
  const parts = [owner.prefix, owner.first_name_th, owner.last_name_th].filter(Boolean)
  return parts.join(' ') || 'ไม่ระบุชื่อ'
}

export function customerDisplayName(customer: Partial<Customer>): string {
  if (customer.nickname) return customer.nickname
  const parts = [customer.prefix, customer.first_name_th, customer.last_name_th].filter(Boolean)
  return parts.join(' ') || 'ไม่ระบุชื่อ'
}

export function stockDisplayTitle(stock: Partial<Stock>): string {
  return [stock.project_name, stock.unit_no, stock.room_type].filter(Boolean).join(' · ') || 'ทรัพย์ไม่ระบุ'
}

export const DOC_TYPE_LABELS: Record<ContractDocType, string> = {
  rental: 'สัญญาเช่า',
  reservation: 'สัญญาจอง',
  renewal: 'ต่อสัญญา',
  cancellation: 'ยกเลิกสัญญา',
  termination: 'บอกเลิกสัญญา',
  notice: 'หนังสือแจ้ง',
  receipt_book: 'ใบเสร็จรับเงิน (สมุด)',
  receipt_rent: 'ใบเสร็จค่าเช่า',
  commission: 'ใบคอมมิชชัน',
  invoice_reservation: 'ใบแจ้งหนี้เงินจอง',
  receipt_reservation: 'ใบเสร็จเงินจอง',
  invoice_deposit: 'ใบแจ้งหนี้เงินประกัน',
  receipt_deposit: 'ใบเสร็จเงินประกัน',
  commission_confirm: 'ยืนยันค่าคอมมิชชัน',
}

export const STATUS_LABELS: Record<StockStatus, string> = {
  available: 'ว่าง',
  rented: 'เช่าแล้ว',
  sold: 'ขายแล้ว',
  unavailable: 'ไม่ว่าง',
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'แอดมิน',
  manager: 'ผู้จัดการ',
  user: 'เอเจนต์',
}

export const PLAN_META: Record<Plan, { label: string; color: string; badge: string }> = {
  starter:      { label: 'Starter',      color: 'gray',   badge: 'bg-gray-100 text-gray-600' },
  professional: { label: 'Professional', color: 'blue',   badge: 'bg-blue-100 text-blue-700' },
  business:     { label: 'Business',     color: 'purple', badge: 'bg-purple-100 text-purple-700' },
}

export const PLAN_LIMITS: Record<Plan, { maxStock: number | null; maxContractsPerMonth: number | null; ai: boolean }> = {
  starter:      { maxStock: 10, maxContractsPerMonth: 5, ai: false },
  professional: { maxStock: null, maxContractsPerMonth: null, ai: true },
  business:     { maxStock: null, maxContractsPerMonth: null, ai: true },
}

export function resolvePlan(plan?: string | null): Plan {
  if (plan === 'professional' || plan === 'business') return plan
  return 'starter'
}

export const ROOM_TYPE_LABELS: Record<string, string> = {
  'Studio':   'Studio',
  '1BR':      '1 Bedroom',
  '2BR':      '2 Bedrooms',
  '3BR':      '3 Bedrooms',
  'Penthouse':'Penthouse',
  'อื่นๆ':    'อื่นๆ',
}

export function formatRoomType(rt: string | null | undefined): string {
  if (!rt) return ''
  return ROOM_TYPE_LABELS[rt] ?? rt
}
