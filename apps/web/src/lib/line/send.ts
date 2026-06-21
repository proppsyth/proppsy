// Shared assembly + delivery for LINE reminders. Used by both the in-app
// "send test" action and the daily cron. Pure formatting + a push-and-log call.
import type { SupabaseClient } from '@supabase/supabase-js'
import { pushMessage } from './client'
import { buildRentReminderFlex, buildExpiryReminderFlex, type CardBranding } from './flex'
import { ownerDisplayName, customerDisplayName, type Owner, type Customer } from '@/types'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function thaiMonthYear(d: Date): string {
  return `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
function thaiDateLong(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** Lease row with the joins this module needs. */
export interface LeaseForReminder {
  id: string
  rent_price?: number | null
  payment_day_of_month?: number | null
  end_date?: string | null
  finalized_pdf_url?: string | null
  pdf_url?: string | null
  // joined
  stock?: { unit_no?: string | null; project_name?: string | null; project?: { name_en?: string | null; name_th?: string | null } | null } | null
  owner?: { prefix?: string | null; first_name_th?: string | null; last_name_th?: string | null; nickname?: string | null; bank_name?: string | null; bank_account_no?: string | null; bank_account_name?: string | null } | null
  customer?: { prefix?: string | null; first_name_th?: string | null; last_name_th?: string | null; nickname?: string | null } | null
}

function projectUnit(l: LeaseForReminder): string {
  const proj = l.stock?.project?.name_en || l.stock?.project?.name_th || l.stock?.project_name || '-'
  return l.stock?.unit_no ? `${proj} · ห้อง ${l.stock.unit_no}` : proj
}

function contractUrl(l: LeaseForReminder): string | null {
  // Stored value is now a private secure-documents path — not usable in a LINE
  // button. Only pass through legacy public http URLs; otherwise the caller must
  // supply a signed URL via the override param.
  const v = l.finalized_pdf_url || l.pdf_url || null
  return v && /^https?:\/\//.test(v) ? v : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rentReminderMessage(l: LeaseForReminder, when: Date = new Date(), branding?: CardBranding, contractUrlSigned?: string | null): any {
  return buildRentReminderFlex({
    projectUnit:     projectUnit(l),
    tenantName:      l.customer ? customerDisplayName(l.customer as unknown as Partial<Customer>) : '-',
    periodLabel:     thaiMonthYear(when),
    rentAmount:      l.rent_price ?? null,
    paymentDayLabel: l.payment_day_of_month ? `ทุกวันที่ ${l.payment_day_of_month}` : 'ตามสัญญา',
    bankName:        l.owner?.bank_name ?? null,
    bankAccountNo:   l.owner?.bank_account_no ?? null,
    bankAccountName: l.owner?.bank_account_name ?? (l.owner ? ownerDisplayName(l.owner as unknown as Partial<Owner>) : null),
    contractUrl:     contractUrlSigned ?? contractUrl(l),
    branding,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expiryReminderMessage(l: LeaseForReminder, daysLeft: number, branding?: CardBranding, contractUrlSigned?: string | null): any {
  const end = l.end_date ? new Date(l.end_date) : new Date()
  return buildExpiryReminderFlex({
    projectUnit:  projectUnit(l),
    tenantName:   l.customer ? customerDisplayName(l.customer as unknown as Partial<Customer>) : '-',
    endDateLabel: thaiDateLong(end),
    daysLeft,
    contractUrl:  contractUrlSigned ?? contractUrl(l),
    branding,
  })
}

/** Push a message to a group and record it in line_message_log. */
export async function pushAndLog(
  admin: SupabaseClient,
  args: {
    agentUid: string
    token: string
    groupId: string
    contractId: string
    kind: 'rent_reminder' | 'expiry_reminder' | 'test'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any
  },
): Promise<{ ok: boolean; error?: string }> {
  const res = await pushMessage(args.token, args.groupId, [args.message])
  await admin.from('line_message_log').insert({
    agent_uid:   args.agentUid,
    contract_id: args.contractId,
    group_id:    args.groupId,
    kind:        args.kind,
    status:      res.ok ? 'sent' : 'failed',
    error:       res.ok ? null : (res.error ?? 'unknown'),
  })
  return { ok: res.ok, error: res.error }
}

export const LEASE_REMINDER_SELECT =
  'id, rent_price, payment_day_of_month, end_date, finalized_pdf_url, pdf_url, line_group_id, line_rent_reminder_enabled, line_expiry_reminder_enabled, line_last_rent_reminded_on, line_last_expiry_reminded_on, ' +
  'stock:stock(unit_no, project_name, project:projects(name_en, name_th)), ' +
  'owner:owners(prefix, first_name_th, last_name_th, nickname, bank_name, bank_account_no, bank_account_name), ' +
  'customer:customers(prefix, first_name_th, last_name_th, nickname)'
