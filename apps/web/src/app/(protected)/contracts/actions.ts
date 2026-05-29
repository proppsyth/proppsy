'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolvePlan, type ContractDocType, type ContractCategory, type ContractStatus } from '@/types'
import { getPlanLimitsByUserPlan } from '@/lib/planLimits'
import {
  setStockReserved, setStockPendingMoveIn, setStockRented, setStockAvailable,
  captureFinalizationSnapshot, appendTimelineEvent, docTypeToCategory,
} from '@/lib/contracts/lifecycleEngine'
import { createLeasePackage } from '@/lib/contracts/documentEngine'

// ─── Types ───────────────────────────────────────────────────

export type ContractInput = {
  doc_type: ContractDocType
  stock_id?: string | null
  owner_id?: string | null
  customer_id?: string | null
  language_version?: string | null
  template_slug?: string | null
  rent_price?: number | null
  deposit_months?: number | null
  deposit_amount?: number | null
  contract_months?: number | null
  move_in_date?: string | null
  end_date?: string | null
  cleaning_fee?: number | null
  ac_count?: number | null
  ac_wash_per_unit?: number | null
  penalty_amount?: number | null
  commission_net?: number | null
  vat_7: boolean
  wht_3: boolean
  occupant_count?: number | null
  water_unit_price?: number | null
  electric_unit_price?: number | null
  internet_fee?: number | null
  common_fee?: number | null
  parking_fee?: number | null
  payment_date?: string | null
  payment_method?: string
  bank_ref?: string | null
  reservation_expire_date?: string | null
  payment_grace_days?: number | null
  payment_day_of_month?: number | null
  commission_rate_pct?: number | null
  commission_from_owner?: number | null
  commission_from_customer?: number | null
  extra_vars?: Record<string, string> | null
  parent_contract_id?: string | null
  contract_relation_type?: string | null
}

// ─── ID Generators ────────────────────────────────────────────

// Prefix per doc type / category — keeps contract lists scannable
function docTypePrefix(docType: ContractDocType, category: ContractCategory): string {
  if (category === 'reservation') return 'B'
  if (category === 'lease')       return 'C'
  if (docType.startsWith('invoice_'))        return 'IV'
  if (docType.startsWith('receipt_'))        return 'RC'
  if (docType === 'warning')                 return 'WN'
  if (docType === 'termination')             return 'TM'
  if (docType === 'cancellation')            return 'CN'
  if (docType === 'notice')                  return 'NT'
  if (docType === 'end_contract')            return 'EC'
  if (docType === 'renewal')                 return 'RL'
  if (docType === 'commission' || docType === 'commission_confirm') return 'CM'
  if (docType === 'co_agent')                return 'CA'
  if (docType === 'installment_schedule')    return 'IS'
  if (docType === 'furniture_list')          return 'FL'
  return 'BK'
}

async function nextId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prefix: string,
): Promise<string> {
  const { data } = await supabase
    .from('contracts')
    .select('id')
    .like('id', `${prefix}-%`)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(prefix.length + 1)) || 0) : 0
  return `${prefix}-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createContract(
  input: ContractInput
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [{ data: profile }, { count: contractsThisMonth }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).gte('created_at', startOfMonth),
  ])
  const limits = await getPlanLimitsByUserPlan(profile?.plan)
  if (limits.maxContractsPerMonth !== null && (contractsThisMonth ?? 0) >= limits.maxContractsPerMonth) {
    return { error: `ถึงขีดจำกัดแพ็กเกจแล้ว (สูงสุด ${limits.maxContractsPerMonth} ฉบับ/เดือน)` }
  }

  const contract_category = docTypeToCategory(input.doc_type)

  // ── Overlap check: LEASES ONLY ───────────────────────────────
  if (contract_category === 'lease' && input.stock_id && input.move_in_date) {
    const { data: conflicts } = await supabase
      .from('contracts')
      .select('id, move_in_date, end_date, effective_end_date')
      .eq('agent_uid', user.id)
      .eq('stock_id', input.stock_id)
      .eq('contract_category', 'lease')
      .not('status', 'in', '("cancelled","completed","terminated","renewed")')

    const newStart = new Date(input.move_in_date).getTime()
    const newEnd   = input.end_date ? new Date(input.end_date).getTime() : null

    for (const c of conflicts ?? []) {
      if (!c.move_in_date) continue
      const existStart  = new Date(c.move_in_date).getTime()
      const effectiveEnd = (c as { effective_end_date?: string | null }).effective_end_date || c.end_date
      const existEnd    = effectiveEnd ? new Date(effectiveEnd).getTime() : null
      const overlaps =
        (newEnd   === null || newEnd   >= existStart) &&
        (existEnd === null || existEnd >= newStart)
      if (overlaps) {
        return {
          error: `ทรัพย์นี้มีสัญญาเช่าที่ทับซ้อนกันอยู่แล้ว (${c.id}) ช่วง ${c.move_in_date}${effectiveEnd ? ' – ' + effectiveEnd : ''}`,
        }
      }
    }
  }

  // ── Enforce hierarchy: only reservations via this path ───────
  if (contract_category === 'lease') {
    return { error: 'สัญญาเช่าต้องสร้างจากใบจอง (ใช้ปุ่ม "สร้างสัญญาเช่า" บนหน้าใบจอง)' }
  }
  if (contract_category === 'child') {
    return { error: 'เอกสารนี้ต้องสร้างจากสัญญาเช่า (ใช้ปุ่มบนหน้าสัญญาเช่า)' }
  }

  const id = await nextId(supabase, docTypePrefix(input.doc_type, contract_category))

  const { error } = await supabase.from('contracts').insert({
    id,
    agent_uid: user.id,
    status: 'draft',
    contract_category,
    master_contract_id: null,
    ...input,
    stock_id:    input.stock_id    || null,
    owner_id:    input.owner_id    || null,
    customer_id: input.customer_id || null,
    extra_vars:  input.extra_vars  || {},
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  // ── Reservation → stock: reserved ────────────────────────────
  if (input.stock_id) {
    await setStockReserved(supabase, input.stock_id, user.id)
    await appendTimelineEvent(supabase, id, null, user.id, 'reservation_created', 'สร้างใบจอง')
  }

  revalidatePath('/contracts')
  return { id }
}

// ─── One-Click: Create Lease From Reservation ────────────────

export type LeaseExtras = {
  move_in_date?: string | null
  contract_months?: number | null
  rent_price?: number | null
  deposit_months?: number | null
  deposit_amount?: number | null
  cleaning_fee?: number | null
  ac_count?: number | null
  ac_wash_per_unit?: number | null
  occupant_count?: number | null
  payment_grace_days?: number | null
  payment_day_of_month?: number | null
  penalty_amount?: number | null
  water_unit_price?: number | null
  electric_unit_price?: number | null
  internet_fee?: number | null
  common_fee?: number | null
  parking_fee?: number | null
  language_version?: string | null
  template_slug?: string | null
}

export async function createLeaseFromReservation(
  reservationId: string,
  extras: LeaseExtras = {}
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: reservation }, { data: profile }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*')
      .eq('id', reservationId)
      .eq('agent_uid', user.id)
      .eq('contract_category', 'reservation')
      .single(),
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
  ])

  if (!reservation) return { error: 'ไม่พบใบจอง หรือสถานะไม่ถูกต้อง' }
  if (['cancelled', 'completed'].includes(reservation.status)) {
    return { error: 'ใบจองนี้ถูกยกเลิก/เสร็จสมบูรณ์แล้ว' }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: contractsThisMonth } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('agent_uid', user.id)
    .gte('created_at', startOfMonth)

  const limits = await getPlanLimitsByUserPlan(profile?.plan)
  if (limits.maxContractsPerMonth !== null && (contractsThisMonth ?? 0) >= limits.maxContractsPerMonth) {
    return { error: `ถึงขีดจำกัดแพ็กเกจแล้ว (สูงสุด ${limits.maxContractsPerMonth} ฉบับ/เดือน)` }
  }

  const id = await nextId(supabase, 'C')

  // Compute end_date from move_in_date + contract_months if both provided
  const moveIn = extras.move_in_date ?? null
  const contractMonths = extras.contract_months ?? 12
  let endDate: string | null = null
  if (moveIn) {
    const d = new Date(moveIn)
    d.setMonth(d.getMonth() + contractMonths)
    endDate = d.toISOString().split('T')[0]!
  }

  const { error } = await supabase.from('contracts').insert({
    id,
    agent_uid: user.id,
    status: 'draft',
    contract_category: 'lease' as ContractCategory,
    parent_contract_id: reservationId,
    reservation_id: reservationId,
    master_contract_id: id,
    contract_relation_type: 'created_from_reservation',
    stock_id:             reservation.stock_id,
    owner_id:             reservation.owner_id,
    customer_id:          reservation.customer_id,
    doc_type:             'rental' as ContractDocType,
    language_version:     extras.language_version ?? reservation.language_version ?? 'th',
    template_slug:        extras.template_slug ?? null,
    rent_price:           extras.rent_price ?? reservation.rent_price,
    deposit_months:       extras.deposit_months ?? reservation.deposit_months ?? 2,
    deposit_amount:       extras.deposit_amount ?? reservation.deposit_amount,
    contract_months:      contractMonths,
    move_in_date:         moveIn,
    end_date:             endDate,
    cleaning_fee:         extras.cleaning_fee ?? reservation.cleaning_fee,
    ac_count:             extras.ac_count ?? reservation.ac_count,
    ac_wash_per_unit:     extras.ac_wash_per_unit ?? reservation.ac_wash_per_unit,
    penalty_amount:       extras.penalty_amount ?? null,
    commission_net:       reservation.commission_net,
    vat_7:                reservation.vat_7 ?? false,
    wht_3:                reservation.wht_3 ?? false,
    occupant_count:       extras.occupant_count ?? reservation.occupant_count ?? 1,
    water_unit_price:     extras.water_unit_price ?? reservation.water_unit_price,
    electric_unit_price:  extras.electric_unit_price ?? reservation.electric_unit_price,
    internet_fee:         extras.internet_fee ?? reservation.internet_fee,
    common_fee:           extras.common_fee ?? reservation.common_fee,
    parking_fee:          extras.parking_fee ?? reservation.parking_fee,
    payment_grace_days:   extras.payment_grace_days ?? reservation.payment_grace_days ?? 5,
    payment_day_of_month: extras.payment_day_of_month ?? reservation.payment_day_of_month,
    commission_rate_pct:  reservation.commission_rate_pct,
    commission_from_owner: reservation.commission_from_owner,
    commission_from_customer: reservation.commission_from_customer,
    extra_vars:           {},
  })

  if (error) return { error: 'สร้างสัญญาเช่าไม่สำเร็จ: ' + error.message }

  if (reservation.stock_id) {
    await setStockPendingMoveIn(supabase, reservation.stock_id, user.id)
  }

  // Mark reservation as converted — prevents duplicate lease creation
  await supabase
    .from('contracts')
    .update({ status: 'converted_to_lease' })
    .eq('id', reservationId)
    .eq('agent_uid', user.id)

  await appendTimelineEvent(supabase, id, id, user.id, 'lease_created',
    `สัญญาเช่าสร้างจากใบจอง ${reservationId}`, reservationId)

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${reservationId}`)
  return { id }
}

// ─── Create Child Document From Lease ────────────────────────

const AUTO_TEMPLATE_SLUGS: Partial<Record<ContractDocType, string>> = {
  invoice_reservation: 'invoice_reservation_th_en',
  receipt_reservation: 'receipt_reservation_th_en',
  invoice_deposit:     'invoice_deposit_th_en',
  receipt_deposit:     'receipt_deposit_th_en',
  notice:              'notice_th_en',
  warning:             'warning_th_en',
  termination:         'termination_th_en',
  cancellation:        'cancellation_th_en',
  end_contract:        'end_contract_th_en',
}

// Reference/financial doc types always use the universal bilingual TH-EN MD templates
// regardless of the parent contract's language selection.
const REFERENCE_DOC_TYPES = new Set<ContractDocType>([
  'invoice_reservation', 'receipt_reservation',
  'invoice_deposit', 'receipt_deposit',
  'notice', 'warning',
  'termination', 'cancellation', 'end_contract',
])

export type ChildDocInput = {
  amount?: number | null
  paymentDate?: string | null
  paymentMethod?: string
  bankRef?: string | null
  periodDate?: string | null
  commissionNet?: number | null
  vat7?: boolean
  wht3?: boolean
  newRentPrice?: number | null
  newContractMonths?: number | null
  newMoveInDate?: string | null
  newEndDate?: string | null
  effectiveEndDate?: string | null
  penaltyAmount?: number | null
  issueDate?: string | null
  extraVars?: Record<string, string>
}

export async function createChildDocument(
  leaseId: string,
  docType: ContractDocType,
  input: ChildDocInput = {}
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: lease } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', leaseId)
    .eq('agent_uid', user.id)
    .in('contract_category', ['lease', 'reservation'])
    .single()

  if (!lease) return { error: 'ไม่พบสัญญา/ใบจอง' }

  const parentCategory = (lease as { contract_category?: string }).contract_category
  if (parentCategory === 'lease' && ['cancelled', 'terminated', 'completed'].includes(lease.status)) {
    return { error: 'สัญญาเช่านี้สิ้นสุดแล้ว ไม่สามารถสร้างเอกสารเพิ่มได้' }
  }
  if (parentCategory === 'reservation') {
    // Only reservation-specific docs allowed from a reservation parent
    const reservationAllowed = ['invoice_reservation', 'receipt_reservation']
    if (!reservationAllowed.includes(docType)) {
      return { error: 'เอกสารประเภทนี้ต้องสร้างจากสัญญาเช่า ไม่ใช่ใบจอง' }
    }
    if (['cancelled', 'completed', 'converted_to_lease'].includes(lease.status)) {
      return { error: 'ใบจองนี้สิ้นสุด/ถูกแปลงแล้ว ไม่สามารถสร้างเอกสารเพิ่มได้' }
    }
  }

  const [{ data: profile }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
  ])
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: contractsThisMonth } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('agent_uid', user.id)
    .gte('created_at', startOfMonth)

  const limits = await getPlanLimitsByUserPlan(profile?.plan)
  if (limits.maxContractsPerMonth !== null && (contractsThisMonth ?? 0) >= limits.maxContractsPerMonth) {
    return { error: `ถึงขีดจำกัดแพ็กเกจแล้ว (สูงสุด ${limits.maxContractsPerMonth} ฉบับ/เดือน)` }
  }

  const prefix = docTypePrefix(docType, 'child')
  const id = await nextId(supabase, prefix)
  // For reservation parents the reservation itself is the "master"
  const masterId = parentCategory === 'reservation'
    ? leaseId
    : ((lease as { master_contract_id?: string | null }).master_contract_id ?? leaseId)

  // Build row with full lease inheritance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {
    id,
    agent_uid: user.id,
    status: 'draft',
    contract_category: 'child' as ContractCategory,
    doc_type: docType,
    parent_contract_id: leaseId,
    master_contract_id: masterId,
    stock_id:            lease.stock_id,
    owner_id:            lease.owner_id,
    customer_id:         lease.customer_id,
    // Reference docs always use th_en bilingual layout regardless of parent language
    language_version:    REFERENCE_DOC_TYPES.has(docType) ? 'th_en' : (lease.language_version ?? 'th'),
    template_slug:       AUTO_TEMPLATE_SLUGS[docType] ?? null,
    rent_price:          lease.rent_price,
    deposit_months:      lease.deposit_months,
    deposit_amount:      lease.deposit_amount,
    contract_months:     lease.contract_months,
    move_in_date:        lease.move_in_date,
    end_date:            lease.end_date,
    vat_7:               lease.vat_7 ?? false,
    wht_3:               lease.wht_3 ?? false,
    water_unit_price:    lease.water_unit_price,
    electric_unit_price: lease.electric_unit_price,
    internet_fee:        lease.internet_fee,
    common_fee:          lease.common_fee,
    parking_fee:         lease.parking_fee,
    payment_grace_days:  lease.payment_grace_days,
    payment_day_of_month: lease.payment_day_of_month,
    cleaning_fee:        lease.cleaning_fee,
    ac_count:            lease.ac_count,
    ac_wash_per_unit:    lease.ac_wash_per_unit,
    penalty_amount:      lease.penalty_amount,
    commission_net:      lease.commission_net,
    commission_rate_pct: lease.commission_rate_pct,
    commission_from_owner: lease.commission_from_owner,
    commission_from_customer: lease.commission_from_customer,
    occupant_count:      lease.occupant_count,
    extra_vars:          {},
  }

  // Apply doc-type specific overrides
  if (docType === 'renewal') {
    if (input.newRentPrice != null)     row.rent_price = input.newRentPrice
    if (input.newContractMonths != null) row.contract_months = input.newContractMonths
    if (input.newMoveInDate)            row.move_in_date = input.newMoveInDate
    if (input.newEndDate)               row.end_date = input.newEndDate
  }

  if (['invoice_reservation','receipt_reservation','invoice_deposit','receipt_deposit'].includes(docType)) {
    if (input.amount != null) {
      row.deposit_amount = input.amount
    } else if (docType === 'invoice_reservation' || docType === 'receipt_reservation') {
      // Booking fee = 1 month rent (business rule)
      row.deposit_amount = lease.rent_price ?? 0
    } else {
      // Security deposit = deposit_months × rent (business rule, typically 2 months)
      row.deposit_amount = (lease.deposit_months ?? 2) * (lease.rent_price ?? 0)
    }
    if (input.paymentDate)   row.payment_date = input.paymentDate
    if (input.paymentMethod) row.payment_method = input.paymentMethod
    if (input.bankRef)       row.bank_ref = input.bankRef
  }

  if (docType === 'receipt_rent') {
    if (input.amount != null)    row.rent_price = input.amount
    if (input.periodDate)        row.move_in_date = input.periodDate
    if (input.paymentMethod)     row.payment_method = input.paymentMethod
    if (input.bankRef)           row.bank_ref = input.bankRef
  }

  if (docType === 'receipt_book') {
    if (input.amount != null)    row.rent_price = input.amount
    if (input.paymentDate)       row.move_in_date = input.paymentDate
  }

  if (docType === 'commission' || docType === 'commission_confirm') {
    if (input.commissionNet != null) row.commission_net = input.commissionNet
    if (input.vat7 !== undefined)    row.vat_7 = input.vat7
    if (input.wht3 !== undefined)    row.wht_3 = input.wht3
  }

  if (['termination','cancellation','end_contract'].includes(docType)) {
    if (input.effectiveEndDate) row.end_date = input.effectiveEndDate
    if (input.penaltyAmount != null) row.penalty_amount = input.penaltyAmount
    if (input.issueDate)        row.move_in_date = input.issueDate
  }

  if (docType === 'notice' || docType === 'warning') {
    if (input.issueDate)        row.move_in_date = input.issueDate
    if (input.effectiveEndDate) row.end_date = input.effectiveEndDate
  }

  if (input.extraVars) row.extra_vars = input.extraVars

  const { error } = await supabase.from('contracts').insert(row)
  if (error) return { error: 'สร้างเอกสารไม่สำเร็จ: ' + error.message }

  // Ending docs: update master lease status + stock
  const endingTypes = ['termination', 'cancellation', 'end_contract']
  if (endingTypes.includes(docType) && input.effectiveEndDate) {
    const newStatus = docType === 'cancellation' ? 'cancelled' : 'terminated'
    await supabase.from('contracts')
      .update({ effective_end_date: input.effectiveEndDate, terminated_at: new Date().toISOString(), status: newStatus })
      .eq('id', masterId)
      .eq('agent_uid', user.id)

    const today = new Date().toISOString().split('T')[0]!
    if (input.effectiveEndDate <= today && (lease as { stock_id?: string | null }).stock_id) {
      await setStockAvailable(supabase, (lease as { stock_id: string }).stock_id, user.id)
    }
    await appendTimelineEvent(supabase, id, masterId, user.id, docType,
      `${docType === 'cancellation' ? 'ยกเลิก' : 'บอกเลิก/สิ้นสุด'}สัญญา มีผลวันที่ ${input.effectiveEndDate}`, id)
  } else {
    await appendTimelineEvent(supabase, id, masterId, user.id, docType, `สร้างเอกสาร ${docType}`)
  }

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${leaseId}`)
  return { id }
}

// ─── Update Draft Fields ──────────────────────────────────────

export type DraftFields = {
  rent_price?: number | null
  deposit_months?: number | null
  deposit_amount?: number | null
  contract_months?: number | null
  move_in_date?: string | null
  end_date?: string | null
  reservation_expire_date?: string | null
  payment_date?: string | null
  payment_grace_days?: number | null
  payment_day_of_month?: number | null
  penalty_amount?: number | null
  cleaning_fee?: number | null
  ac_count?: number | null
  ac_wash_per_unit?: number | null
  occupant_count?: number | null
  water_unit_price?: number | null
  electric_unit_price?: number | null
  internet_fee?: number | null
  common_fee?: number | null
  parking_fee?: number | null
  vat_7?: boolean
  wht_3?: boolean
  commission_net?: number | null
  commission_rate_pct?: number | null
  commission_from_owner?: number | null
  commission_from_customer?: number | null
  extra_vars?: Record<string, string> | null
}

export async function updateContractDraft(
  contractId: string,
  fields: DraftFields,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: existing } = await supabase
    .from('contracts')
    .select('is_finalized')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .single()

  if (!existing) return { error: 'ไม่พบสัญญา' }
  if (existing.is_finalized) return { error: 'สัญญานี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้' }

  const { error } = await supabase
    .from('contracts')
    .update(fields)
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }
  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Activate Lease (after finalization) ─────────────────────

export async function activateLease(
  contractId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: contract } = await supabase
    .from('contracts')
    .select('status, contract_category, stock_id, is_finalized')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) return { error: 'ไม่พบสัญญา' }
  if ((contract as { contract_category?: string }).contract_category !== 'lease') {
    return { error: 'เฉพาะสัญญาเช่าเท่านั้น' }
  }

  const { error } = await supabase
    .from('contracts')
    .update({ status: 'active' })
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: error.message }

  if ((contract as { stock_id?: string | null }).stock_id) {
    await setStockRented(supabase, (contract as { stock_id: string }).stock_id, user.id)
  }

  await appendTimelineEvent(supabase, contractId, contractId, user.id, 'lease_activated', 'เปิดใช้งานสัญญาเช่าแล้ว')

  revalidatePath(`/contracts/${contractId}`)
  revalidatePath('/contracts')
  return {}
}

// ─── Add Timeline Event ───────────────────────────────────────

export async function addTimelineEvent(
  contractId: string,
  eventType: string,
  description?: string,
  relatedContractId?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: contract } = await supabase
    .from('contracts')
    .select('master_contract_id, contract_category')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) return { error: 'ไม่พบสัญญา' }

  const masterId = (contract as { master_contract_id?: string | null; contract_category?: string }).master_contract_id
    ?? (contract.contract_category === 'lease' ? contractId : null)

  await appendTimelineEvent(supabase, contractId, masterId, user.id, eventType, description, relatedContractId)
  return {}
}

// ─── Manual Finalization ──────────────────────────────────────

export async function finalizeManually(
  contractId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: contract } = await supabase
    .from('contracts')
    .select('is_finalized, status, docx_url, pdf_url, contract_category, stock_id')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) return { error: 'ไม่พบสัญญา' }
  if (contract.is_finalized) return { error: 'สัญญานี้ถูกล็อกแล้ว' }

  const isLease = (contract as { contract_category?: string }).contract_category === 'lease'
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('contracts')
    .update({
      is_finalized: true,
      finalized_at: now,
      status: isLease ? 'active' : 'signed',
      finalized_docx_url: (contract as { docx_url?: string | null }).docx_url ?? null,
      finalized_pdf_url:  (contract as { pdf_url?: string | null }).pdf_url ?? null,
    })
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'ล็อกสัญญาไม่สำเร็จ: ' + error.message }

  // Capture snapshot before mutating further
  await captureFinalizationSnapshot(supabase, contractId, user.id)

  // Lease activation: set stock to rented and create lease package
  if (isLease && (contract as { stock_id?: string | null }).stock_id) {
    await setStockRented(supabase, (contract as { stock_id: string }).stock_id, user.id)
    await createLeasePackage(supabase, contractId, user.id)
  }

  await addTimelineEvent(contractId, 'finalized_manually',
    isLease ? 'ล็อกและเปิดใช้งานสัญญาเช่า (ลงนามออฟไลน์)' : 'ล็อกสัญญาด้วยตนเอง (ลงนามออฟไลน์)')

  revalidatePath(`/contracts/${contractId}`)
  revalidatePath('/contracts')
  return {}
}

// ─── Update Status ────────────────────────────────────────────

export async function updateContractStatus(
  contractId: string,
  status: ContractStatus
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: existing } = await supabase
    .from('contracts')
    .select('is_finalized, stock_id, contract_category, doc_type')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .single()

  if (existing?.is_finalized) {
    return { error: 'สัญญานี้ถูกล็อกแล้ว ไม่สามารถเปลี่ยนสถานะได้' }
  }

  const { error } = await supabase
    .from('contracts')
    .update({ status })
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'อัปเดตไม่สำเร็จ: ' + error.message }

  const stockId = (existing as { stock_id?: string | null } | null)?.stock_id
  const category = (existing as { contract_category?: string | null } | null)?.contract_category

  if ((status === 'cancelled' || status === 'terminated') && stockId) {
    // Reservation cancel → available; Lease cancel/terminate → available
    if (category === 'reservation' || category === 'lease') {
      await setStockAvailable(supabase, stockId, user.id)
    }
  }

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Generate .docx ───────────────────────────────────────────

export async function generateContractDocx(
  contractId: string
): Promise<{ error?: string; url?: string; missing?: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: contract }, { data: profile }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*, project:projects(*)), owner:owners(*), customer:customers(*)')
      .eq('id', contractId)
      .eq('agent_uid', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!contract) return { error: 'ไม่พบสัญญา' }
  if (contract.is_finalized) {
    return { error: 'สัญญานี้ถูกล็อกแล้ว (ลงนามครบ) ไม่สามารถสร้างเอกสารใหม่ได้' }
  }

  const templateSlug = contract.template_slug
  if (!templateSlug) {
    return { error: 'ยังไม่ได้เลือก template — กรุณาสร้างสัญญาใหม่โดยเลือกภาษา' }
  }

  try {
    const { getTemplateBySlug } = await import('@/lib/contracts/templateRegistry')
    const { computeVariables } = await import('@/lib/contracts/variableCompute')
    const { validateVariables } = await import('@/lib/contracts/validation')
    const { generateDocx } = await import('@/lib/contracts/docxGenerator')

    const template = getTemplateBySlug(templateSlug)
    if (!template) return { error: `ไม่พบ template: ${templateSlug}` }

    const variables = computeVariables({
      contract: contract as Parameters<typeof computeVariables>[0]['contract'],
      stock:    contract.stock ?? null,
      owner:    contract.owner ?? null,
      customer: contract.customer ?? null,
      agent:    profile ?? null,
    }, template)

    const validation = validateVariables(variables, template)
    if (!validation.valid) {
      return {
        error: `ข้อมูลไม่ครบ: ${validation.missing.map(m => m.label).join(', ')}`,
        missing: validation.missing.map(m => m.label),
      }
    }

    const isAgentDoc = ['commission_confirm', 'co_agent'].includes(contract.doc_type)
    const ownerFullName = contract.owner
      ? [contract.owner.prefix, contract.owner.first_name_th, contract.owner.last_name_th].filter(Boolean).join(' ') || null
      : undefined
    const customerFullName = contract.customer
      ? [contract.customer.prefix, contract.customer.first_name_th, contract.customer.last_name_th].filter(Boolean).join(' ') || null
      : undefined

    const signatures = {
      ownerName:      isAgentDoc ? undefined : ownerFullName,
      ownerRole:      'ผู้ให้เช่า',
      ownerSigUrl:    isAgentDoc ? undefined : (contract.owner as { signature_url?: string | null } | null)?.signature_url,
      customerName:   isAgentDoc ? undefined : customerFullName,
      customerRole:   'ผู้เช่า',
      customerSigUrl: isAgentDoc ? undefined : (contract.customer as { signature_url?: string | null } | null)?.signature_url,
      agentName:      profile?.name ?? null,
      agentSigUrl:    isAgentDoc ? (profile?.signature_url ?? null) : undefined,
      showAgent:      isAgentDoc,
    }

    const docxBuffer = await generateDocx(
      template.filename,
      variables,
      template.hasBuiltInSignatures ? undefined : signatures,
    )

    const path = `${user.id}/${contractId}.docx`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) return { error: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + uploadError.message }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('contracts').update({ docx_url: publicUrl }).eq('id', contractId)

    revalidatePath(`/contracts/${contractId}`)
    return { url: publicUrl }
  } catch (err) {
    console.error('docx generation error:', err)
    return { error: 'สร้างเอกสารไม่สำเร็จ: ' + String(err) }
  }
}

// ─── Generate HTML Preview ────────────────────────────────────

export async function getContractPreviewHtml(
  contractId: string
): Promise<{ error?: string; html?: string; missing?: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: contract }, { data: profile }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*, project:projects(*)), owner:owners(*), customer:customers(*)')
      .eq('id', contractId)
      .eq('agent_uid', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!contract) return { error: 'ไม่พบสัญญา' }

  const templateSlug = contract.template_slug
  if (!templateSlug) {
    return { error: 'ยังไม่ได้เลือก template' }
  }

  try {
    const { getTemplateBySlug } = await import('@/lib/contracts/templateRegistry')
    const { computeVariables } = await import('@/lib/contracts/variableCompute')
    const { validateVariables } = await import('@/lib/contracts/validation')
    const { generateDocx } = await import('@/lib/contracts/docxGenerator')
    const mammoth = await import('mammoth')

    const template = getTemplateBySlug(templateSlug)
    if (!template) return { error: `ไม่พบ template: ${templateSlug}` }

    const variables = computeVariables({
      contract: contract as Parameters<typeof computeVariables>[0]['contract'],
      stock:    contract.stock ?? null,
      owner:    contract.owner ?? null,
      customer: contract.customer ?? null,
      agent:    profile ?? null,
    }, template)

    const validation = validateVariables(variables, template)
    if (!validation.valid) {
      return {
        error: `ข้อมูลไม่ครบสำหรับ preview`,
        missing: validation.missing.map(m => m.label),
      }
    }

    const docxBuffer = await generateDocx(template.filename, variables)
    const result = await mammoth.convertToHtml({ buffer: docxBuffer })

    return { html: result.value }
  } catch (err) {
    console.error('preview error:', err)
    return { error: 'สร้าง preview ไม่สำเร็จ: ' + String(err) }
  }
}

// ─── PDF upload helper ─────────────────────────────────────────
// Uploads a PDF buffer to Supabase storage with one automatic retry on failure.
// Logs duration and each attempt with [UPLOAD] prefix.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadPdfToStorage(
  supabase: any,
  userId: string,
  contractId: string,
  buffer: Buffer,
): Promise<{ url: string } | { error: string }> {
  const ts = Date.now()
  const storagePath = `${userId}/${contractId}-${ts}.pdf`
  console.log(`[UPLOAD ${new Date().toISOString()}] start`, JSON.stringify({ contractId, bytes: buffer.length, path: storagePath }))
  const t0 = Date.now()

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      await new Promise(r => setTimeout(r, 2000))
      console.log(`[UPLOAD ${new Date().toISOString()}] retry`, JSON.stringify({ attempt, contractId }))
    }
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })
    if (!uploadError && uploadData) {
      const durationMs = Date.now() - t0
      console.log(`[UPLOAD ${new Date().toISOString()}] done`, JSON.stringify({ attempt, durationMs, path: storagePath }))
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath)
      return { url: publicUrl }
    }
    const errMsg = uploadError?.message ?? 'unknown'
    console.error(`[UPLOAD ${new Date().toISOString()}] attempt.failed`, JSON.stringify({ attempt, error: errMsg }))
  }

  return { error: 'อัปโหลด PDF ไม่สำเร็จ กรุณาลองใหม่' }
}

// ─── Generate PDF ─────────────────────────────────────────────

export async function generateContractPdf(
  contractId: string
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: contract }, { data: profile }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*, project:projects(*)), owner:owners(*), customer:customers(*)')
      .eq('id', contractId)
      .eq('agent_uid', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!contract) return { error: 'ไม่พบสัญญา' }
  if (contract.is_finalized) {
    return { error: 'สัญญานี้ถูกล็อกแล้ว (ลงนามครบ) ไม่สามารถสร้างเอกสารใหม่ได้' }
  }

  try {
    let buffer: Buffer
    const _slug = (contract as { template_slug?: string | null }).template_slug ?? null
    console.log(`[PDF:ROUTE ${new Date().toISOString()}] start`, JSON.stringify({ contractId, doc_type: contract.doc_type, template_slug: _slug }))

    // ─── Route: invoice / receipt → legacy navy renderer (only for old contracts without template_slug) ───
    const invoiceLikeTypes = ['invoice_reservation', 'receipt_reservation', 'invoice_deposit', 'receipt_deposit']
    if (invoiceLikeTypes.includes(contract.doc_type) && !_slug) {
      console.log(`[PDF:ROUTE ${new Date().toISOString()}] route=A (legacy-invoice) doc_type=${contract.doc_type}`)
      const { renderInvoiceReceiptPdf } = await import('@/lib/pdf/contract/invoiceReceiptPdf')
      const isReceipt = contract.doc_type === 'receipt_reservation' || contract.doc_type === 'receipt_deposit'

      const docTitleMap: Record<string, string> = {
        invoice_reservation: 'ใบแจ้งหนี้เงินจอง',
        receipt_reservation: 'ใบเสร็จรับเงิน (เงินจอง)',
        invoice_deposit:     'ใบแจ้งหนี้เงินประกัน',
        receipt_deposit:     'ใบเสร็จรับเงิน (เงินประกัน)',
      }

      // Amount: reservation invoice uses rent_price (1 month deposit); deposit uses deposit_amount
      const isReservationDoc = contract.doc_type.includes('reservation')
      const amount = isReservationDoc
        ? (contract.rent_price ?? 0)
        : (contract.deposit_amount ?? 0)

      const stockDesc = contract.stock
        ? `โครงการ ${contract.stock.project_name ?? ''} ห้อง ${contract.stock.unit_no ?? ''}` +
          (contract.contract_months ? ` สัญญา ${contract.contract_months} เดือน` : '') +
          (contract.rent_price      ? ` ราคาเช่า ${contract.rent_price.toLocaleString()} บาท/เดือน` : '')
        : '-'

      const ownerName = [contract.owner?.prefix, contract.owner?.first_name_th, contract.owner?.last_name_th]
        .filter(Boolean).join(' ') || ''
      const customerName = [contract.customer?.prefix, contract.customer?.first_name_th, contract.customer?.last_name_th]
        .filter(Boolean).join(' ') || ''

      const ownerAddr = contract.owner
        ? [contract.owner.address_no, contract.owner.address_road, contract.owner.subdistrict,
           contract.owner.district, contract.owner.province, contract.owner.zip]
          .filter(Boolean).join(' ')
        : ''
      const customerAddr = contract.customer
        ? [contract.customer.address_no, contract.customer.address_road, contract.customer.subdistrict,
           contract.customer.district, contract.customer.province, contract.customer.zip]
          .filter(Boolean).join(' ')
        : ''

      const statusText = contract.is_finalized
        ? 'FINALIZED'
        : ((contract as { status?: string }).status ?? 'draft').toUpperCase().replace(/_/g, ' ')

      buffer = await renderInvoiceReceiptPdf({
        docTitle:   docTitleMap[contract.doc_type] ?? contract.doc_type,
        docId:      contract.id,
        date:       new Date(contract.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        agentName:  profile?.company_name ?? profile?.name ?? undefined,
        agentPhone: (profile as { phone?: string | null } | null)?.phone ?? undefined,
        statusText,
        owner: contract.owner ? {
          name:                ownerName,
          address:             ownerAddr,
          national_id:         contract.owner.national_id ?? undefined,
          bank_name:           (contract.owner as { bank_name?: string | null }).bank_name ?? undefined,
          bank_account_no:     (contract.owner as { bank_account_no?: string | null }).bank_account_no ?? undefined,
          bank_account_name:   (contract.owner as { bank_account_name?: string | null }).bank_account_name ?? undefined,
        } : null,
        customer: contract.customer ? {
          name:        customerName,
          address:     customerAddr,
          national_id: contract.customer.national_id ?? undefined,
        } : null,
        stockDesc,
        amount,
        vat7:  contract.vat_7 ?? false,
        wht3:  contract.wht_3 ?? false,
        isReceipt,
        paymentMethod: (contract as { payment_method?: string | null }).payment_method ?? null,
        bankRef:       (contract as { bank_ref?: string | null }).bank_ref ?? null,
        ownerSignatureUrl:    (contract.owner    as { signature_url?: string | null } | null)?.signature_url ?? null,
        customerSignatureUrl: (contract.customer as { signature_url?: string | null } | null)?.signature_url ?? null,
      })

      const uploadResult = await uploadPdfToStorage(supabase, user.id, contract.id, buffer)
      if ('error' in uploadResult) return uploadResult
      await supabase.from('contracts').update({ pdf_url: uploadResult.url }).eq('id', contractId)
      return { url: uploadResult.url }
    }

    const templateSlugForPdf = _slug
    if (templateSlugForPdf) {
      console.log(`[PDF:ROUTE ${new Date().toISOString()}] route=B slug=${templateSlugForPdf}`)
      const { getTemplateBySlug } = await import('@/lib/contracts/templateRegistry')
      const { computeVariables } = await import('@/lib/contracts/variableCompute')
      const { generateDocx } = await import('@/lib/contracts/docxGenerator')
      const mammoth = await import('mammoth')
      const { renderMammothHtmlAsPdf } = await import('@/lib/pdf/mammothToPdf')

      const template = getTemplateBySlug(templateSlugForPdf)
      if (!template) return { error: `ไม่พบ template: ${templateSlugForPdf}` }

      const variables = computeVariables({
        contract: contract as Parameters<typeof computeVariables>[0]['contract'],
        stock:    contract.stock ?? null,
        owner:    contract.owner ?? null,
        customer: contract.customer ?? null,
        agent:    profile ?? null,
      }, template)

      const ownerName = [contract.owner?.prefix, contract.owner?.first_name_th, contract.owner?.last_name_th]
        .filter(Boolean).join(' ') || ''
      const customerName = [contract.customer?.prefix, contract.customer?.first_name_th, contract.customer?.last_name_th]
        .filter(Boolean).join(' ') || ''

      const ownerSigUrl    = (contract.owner    as { signature_url?: string | null } | null)?.signature_url ?? undefined
      const customerSigUrl = (contract.customer as { signature_url?: string | null } | null)?.signature_url ?? undefined

      const baseSigners = [
        { label: 'ผู้ให้เช่า', name: ownerName,    signatureUrl: ownerSigUrl,    signedAt: null },
        { label: 'ผู้เช่า',    name: customerName, signatureUrl: customerSigUrl, signedAt: null },
      ]
      const pdfMeta = {
        contractId:   contract.id,
        docTypeLabel: template.label,
        status:       (contract as { status?: string }).status ?? 'draft',
        isFinalized:  contract.is_finalized ?? false,
        generatedAt:  new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        agentName:    profile?.company_name ?? profile?.name ?? undefined,
        agentPhone:   (profile as { phone?: string | null } | null)?.phone ?? undefined,
        signers:      baseSigners,
        contractDate: variables['ทำสัญญาวันที่ตัวอักษร'] ?? '',
      }

      if (template.mdFilename) {
        // Preferred: Markdown→PDF pipeline
        const { readFileSync } = await import('fs')
        const { join } = await import('path')
        const { renderMarkdownAsPdf } = await import('@/lib/pdf/markdownToPdf')
        const mdPath = join(process.cwd(), 'public', 'template-md', template.mdFilename)
        console.log(`[PDF:ROUTE ${new Date().toISOString()}] route=B-md file=${template.mdFilename} path=${mdPath}`)
        const mdContent = readFileSync(mdPath, 'utf-8')
        buffer = await renderMarkdownAsPdf(mdContent, variables, pdfMeta)
      } else {
        // Fallback: DOCX→mammoth→HTML→PDF pipeline
        console.log(`[PDF:ROUTE ${new Date().toISOString()}] route=B-docx file=${template.filename}`)
        const docxBuffer = await generateDocx(template.filename, variables)
        const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer })
        buffer = await renderMammothHtmlAsPdf(html, pdfMeta)
      }
    } else {
      console.log(`[PDF:ROUTE ${new Date().toISOString()}] route=C (legacy-react-pdf) doc_type=${contract.doc_type}`)
      const { renderToBuffer } = await import('@react-pdf/renderer')
      const { ContractDocument } = await import('@/lib/pdf/ContractDocument')
      const { createElement } = await import('react')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = createElement(ContractDocument as any, {
        contract: {
          id: contract.id,
          doc_type: contract.doc_type,
          created_at: contract.created_at,
          rent_price: contract.rent_price,
          deposit_months: contract.deposit_months,
          deposit_amount: contract.deposit_amount,
          contract_months: contract.contract_months,
          move_in_date: contract.move_in_date,
          end_date: contract.end_date,
          cleaning_fee: contract.cleaning_fee,
          ac_count: contract.ac_count,
          ac_wash_per_unit: contract.ac_wash_per_unit,
          penalty_amount: contract.penalty_amount,
          commission_net: contract.commission_net,
          vat_7: contract.vat_7 ?? false,
          wht_3: contract.wht_3 ?? false,
          water_unit_price: contract.water_unit_price,
          electric_unit_price: contract.electric_unit_price,
          internet_fee: contract.internet_fee,
          common_fee: contract.common_fee,
          parking_fee: contract.parking_fee,
          payment_date: contract.payment_date,
          payment_method: contract.payment_method,
          bank_ref: contract.bank_ref,
          reservation_expire_date: contract.reservation_expire_date,
          payment_grace_days: contract.payment_grace_days,
          payment_day_of_month: contract.payment_day_of_month,
          commission_rate_pct: contract.commission_rate_pct,
          commission_from_owner: contract.commission_from_owner,
          commission_from_customer: contract.commission_from_customer,
        },
        stock: contract.stock ?? null,
        owner: contract.owner ?? null,
        customer: contract.customer ?? null,
        agent: {
          name: profile?.name,
          company_name: profile?.company_name,
          phone: profile?.phone,
          logo_url: profile?.logo_url,
          signature_url: profile?.signature_url,
          bank_name: profile?.bank_name,
          bank_account_no: profile?.bank_account_no,
          bank_account_name: profile?.bank_account_name,
          tax_id: profile?.tax_id,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buffer = await renderToBuffer(element as any)
    }

    const mainUpload = await uploadPdfToStorage(supabase, user.id, contractId, buffer)
    if ('error' in mainUpload) return mainUpload
    await supabase.from('contracts').update({ pdf_url: mainUpload.url }).eq('id', contractId)
    return { url: mainUpload.url }
  } catch (err) {
    console.error('[PDF] generateContractPdf error:', err)
    return { error: 'สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่' }
  }
}

// ─── Furniture Items ──────────────────────────────────────────

export type FurnitureItemInput = {
  item_name: string
  quantity: number
  condition: 'good' | 'fair' | 'damaged' | 'missing'
  notes?: string | null
  serial_no?: string | null
  sort_order?: number
}

export async function saveFurnitureItems(
  contractId: string,
  items: FurnitureItemInput[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error: delErr } = await supabase
    .from('contract_furniture_items')
    .delete()
    .eq('contract_id', contractId)
    .eq('agent_uid', user.id)

  if (delErr) return { error: 'ลบรายการเดิมไม่สำเร็จ: ' + delErr.message }

  if (items.length === 0) return {}

  const rows = items.map((item, i) => ({
    contract_id: contractId,
    agent_uid:   user.id,
    item_name:   item.item_name,
    quantity:    item.quantity,
    condition:   item.condition,
    notes:       item.notes ?? null,
    serial_no:   item.serial_no ?? null,
    sort_order:  item.sort_order ?? i,
  }))

  const { error } = await supabase.from('contract_furniture_items').insert(rows)
  if (error) return { error: 'บันทึกรายการไม่สำเร็จ: ' + error.message }

  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── E-sign token ─────────────────────────────────────────────

export async function generateSignToken(
  contractId: string
): Promise<{ error?: string; token?: string; link?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const token = crypto.randomUUID()

  const { error } = await supabase
    .from('contracts')
    .update({ sign_token: token })
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'สร้าง sign link ไม่สำเร็จ: ' + error.message }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link = `${baseUrl}/sign/${token}`

  revalidatePath(`/contracts/${contractId}`)
  return { token, link }
}
