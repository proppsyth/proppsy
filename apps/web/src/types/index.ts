// ============================================================
// PROPPSY — TypeScript Types
// ============================================================

export type Role = 'admin' | 'manager' | 'user'
export type AccountStatus = 'pending' | 'approved' | 'rejected'
export type Plan = 'starter' | 'professional' | 'business'
export type StockStatus = 'available' | 'reserved' | 'pending_move_in' | 'rented' | 'sold' | 'unavailable'
export type ListingType = 'rent' | 'sale' | 'both'
export type RoomType = 'Studio' | '1BR' | '2BR' | '3BR' | 'Penthouse' | 'อื่นๆ'
export type ContractDocType =
  | 'rental' | 'reservation' | 'renewal' | 'cancellation'
  | 'termination' | 'notice' | 'end_contract' | 'warning'
  | 'receipt_book' | 'receipt_rent' | 'commission'
  | 'invoice_reservation' | 'receipt_reservation'
  | 'invoice_deposit' | 'receipt_deposit'
  | 'commission_confirm'
  | 'co_agent'
  | 'installment_schedule' | 'furniture_list'
export type ContractCategory = 'reservation' | 'lease' | 'child'
export type PaymentMethod = 'cash' | 'transfer' | 'cheque'
export type ContractStatus =
  | 'draft' | 'sent' | 'sent_for_sign' | 'viewed' | 'partially_signed'
  | 'signed' | 'finalized' | 'active' | 'completed'
  | 'cancelled' | 'terminated' | 'renewed' | 'converted_to_lease'
export type SignerRole = 'tenant' | 'owner' | 'co_agent' | 'witness'
export type SignerStatus = 'pending' | 'viewed' | 'signed' | 'declined'
export type CustomerSource = 'line_oa' | 'referral' | 'walk_in' | 'online' | 'facebook' | 'instagram' | 'tiktok' | 'website' | 'other' | 'public_listing'
export type LeadStatus = 'lead' | 'prospect' | 'viewing' | 'negotiating' | 'converted' | 'lost'
export type CreditTransactionType = 'grant' | 'topup' | 'spend' | 'reset' | 'assign' | 'expire'

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  balance_after: number
  type: CreditTransactionType
  description: string | null
  reference_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

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
  prefix?: string
  prefix_en?: string
  first_name_th?: string
  last_name_th?: string
  first_name_en?: string
  last_name_en?: string
  national_id?: string
  nationality?: string
  gender?: string
  birth_date?: string
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
  ai_calls_this_month?: number
  ai_calls_month?: string
  omise_customer_id?: string
  team_name?: string
  line_user_id?: string
  // Public profile fields
  public_slug?: string
  bio?: string
  avatar_url?: string
  show_phone?: boolean
  social_links?: Record<string, string>
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
  is_archived?: boolean
  archived_at?: string | null
  archived_by?: string | null
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
  gender?: string
  occupation?: string
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
  lead_status?: LeadStatus
  converted_at?: string | null
  preferred_move_in_date?: string | null
  notes?: string
  is_archived?: boolean
  archived_at?: string | null
  archived_by?: string | null
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
  photo_thumb_urls?: string[]
  is_published?: boolean
  is_premium?: boolean
  published_at?: string
  premium_expires_at?: string
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
  docx_url?: string
  snapshot?: Record<string, unknown>
  // Contract V2 fields
  language_version?: string
  template_slug?: string
  sign_token?: string
  signed_at?: string
  occupant_count?: number
  extra_vars?: Record<string, string>
  // Finalization (immutable lock after all signers complete)
  is_finalized?: boolean
  finalized_at?: string
  finalized_pdf_url?: string
  finalized_docx_url?: string
  // Contract relations
  parent_contract_id?: string | null
  master_contract_id?: string | null
  reservation_id?: string | null
  contract_relation_type?: string | null
  contract_category?: ContractCategory | null
  effective_end_date?: string | null
  terminated_at?: string | null
  finalized_snapshot?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined
  stock?: Stock
  owner?: Owner
  customer?: Customer
}

export interface DocumentPackage {
  id: string  // PKG-XXXX
  agent_uid: string
  master_contract_id?: string | null
  label?: string | null
  status: 'draft' | 'generating' | 'ready' | 'sent'
  created_at: string
  updated_at: string
  items?: DocumentPackageItem[]
}

export interface DocumentPackageItem {
  id: string
  package_id: string
  contract_id?: string | null
  doc_type: string
  label?: string | null
  sort_order: number
  pdf_url?: string | null
  docx_url?: string | null
  status: 'pending' | 'generated' | 'failed'
  created_at: string
}

export interface ContractTimelineEvent {
  id: string
  contract_id: string
  master_contract_id?: string | null
  agent_uid: string
  event_type: string
  description?: string | null
  related_contract_id?: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ContractSigner {
  id: string
  contract_id: string
  agent_uid: string
  signer_role: SignerRole
  signer_name: string | null
  signer_phone: string | null
  sign_token: string
  token_expires_at: string | null
  status: SignerStatus
  viewed_at: string | null
  signed_at: string | null
  signature_url: string | null
  signature_type: 'drawn' | 'typed' | null
  signed_name: string | null
  sort_order: number
  created_at: string
  updated_at: string
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
  end_contract: 'สิ้นสุดสัญญา',
  warning: 'หนังสือเตือน',
  receipt_book: 'ใบเสร็จรับเงิน (สมุด)',
  receipt_rent: 'ใบเสร็จค่าเช่า',
  commission: 'ใบคอมมิชชัน',
  invoice_reservation: 'ใบแจ้งหนี้เงินจอง',
  receipt_reservation: 'ใบเสร็จเงินจอง',
  invoice_deposit: 'ใบแจ้งหนี้เงินประกัน',
  receipt_deposit: 'ใบเสร็จเงินประกัน',
  commission_confirm: 'ยืนยันค่าคอมมิชชัน',
  co_agent: 'สัญญา Co-Agent',
  installment_schedule: 'ตารางผ่อนชำระ',
  furniture_list: 'รายการเฟอร์นิเจอร์/สินทรัพย์',
}

export const CONTRACT_CATEGORY_LABELS: Record<ContractCategory, string> = {
  reservation: 'ใบจอง',
  lease: 'สัญญาเช่า',
  child: 'เอกสารอ้างอิง',
}

export const STATUS_LABELS: Record<StockStatus, string> = {
  available:       'ว่าง',
  reserved:        'จอง',
  pending_move_in: 'รอเข้าอยู่',
  rented:          'เช่าแล้ว',
  sold:            'ขายแล้ว',
  unavailable:     'ไม่ว่าง',
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

export const PLAN_LIMITS: Record<Plan, { maxStock: number | null; maxContractsPerMonth: number | null; aiCallsPerMonth: number }> = {
  starter:      { maxStock: 10, maxContractsPerMonth: 5,    aiCallsPerMonth: 10 },
  professional: { maxStock: null, maxContractsPerMonth: null, aiCallsPerMonth: 300 },
  business:     { maxStock: null, maxContractsPerMonth: null, aiCallsPerMonth: 300 },
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
