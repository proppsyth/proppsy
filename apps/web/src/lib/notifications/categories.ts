import type { NotificationType } from './types'

// Notification categories — the unit users toggle on/off, and what notify()
// checks before delivering. 'announcement' is intentionally NOT toggleable
// (system / PR broadcasts always reach everyone).
export type NotifCategory =
  | 'leads' | 'esign' | 'contracts' | 'appointments'
  | 'credits' | 'ai' | 'plan' | 'listings' | 'line' | 'workflow'

export const NOTIF_CATEGORIES: { key: NotifCategory; label: string; desc: string; types: (NotificationType)[] }[] = [
  { key: 'leads',        label: 'ลูกค้าสนใจทรัพย์',     desc: 'เมื่อมีคนกรอกสนใจทรัพย์',                types: ['inquiry'] },
  { key: 'esign',        label: 'การลงนามเอกสาร',       desc: 'เปิดอ่าน / ลงนามสัญญา',                  types: ['esign_viewed', 'esign_signed', 'owner_signed', 'tenant_signed', 'coagent_signed', 'document_rejected'] },
  { key: 'contracts',    label: 'สัญญาใกล้หมด / ห้องว่าง', desc: 'แจ้งล่วงหน้าก่อนสัญญาหมด',             types: ['lease_expiry_30', 'lease_expiry_7', 'contract_expiry_90', 'contract_expiry_60', 'contract_expiry_30', 'contract_expiry_7'] },
  { key: 'appointments', label: 'นัดหมาย',              desc: 'นัดหมายในปฏิทินวันนี้',                  types: ['appointment_today'] },
  { key: 'credits',      label: 'เครดิต',               desc: 'ใช้/ได้รับเครดิต',                       types: ['credit_spent', 'admin_credit_granted'] },
  { key: 'ai',           label: 'โควต้า AI',            desc: 'เมื่อโควต้า AI ใกล้หมด',                  types: ['ai_used'] },
  { key: 'plan',         label: 'แพ็กเกจ',              desc: 'เปลี่ยน/ใกล้หมดอายุแพ็กเกจ',             types: ['admin_plan_changed', 'plan_expiring'] },
  { key: 'listings',     label: 'ยอดเข้าชมทรัพย์',       desc: 'เมื่อยอดเข้าชมถึงเป้า',                   types: ['listing_views_10', 'listing_views_100', 'listing_views_500', 'listing_views_1000'] },
  { key: 'line',         label: 'การส่ง LINE',          desc: 'สรุปการส่งแจ้งเตือนค่าเช่า',              types: ['rent_reminder_sent'] },
  { key: 'workflow',     label: 'เอกสาร/สัญญา',         desc: 'สร้างใบจอง/สัญญา/ต่อสัญญา',              types: ['booking_created', 'lease_created', 'renewal_created'] },
]

const TYPE_TO_CATEGORY: Partial<Record<NotificationType, NotifCategory>> = (() => {
  const m: Partial<Record<NotificationType, NotifCategory>> = {}
  for (const c of NOTIF_CATEGORIES) for (const t of c.types) m[t] = c.key
  return m
})()

export function categoryOf(type: string): NotifCategory | null {
  return TYPE_TO_CATEGORY[type as NotificationType] ?? null
}

/** A category is enabled unless the user's prefs explicitly set it to false. */
export function isTypeEnabled(prefs: Record<string, boolean> | null | undefined, type: string): boolean {
  const cat = categoryOf(type)
  if (!cat) return true            // unmapped (e.g. 'announcement') → always on
  return prefs?.[cat] !== false
}
