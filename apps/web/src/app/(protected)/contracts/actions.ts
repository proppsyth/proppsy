'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolvePlan, type ContractDocType, type ContractCategory, type ContractStatus } from '@/types'
import { getPlanLimitsByUserPlan } from '@/lib/planLimits'
import {
  setStockReserved, setStockPendingMoveIn, setStockRented, setStockAvailable,
  captureFinalizationSnapshot, appendTimelineEvent, docTypeToCategory,
} from '@/lib/contracts/lifecycleEngine'
import { logActivity } from '@/lib/activity/log'
import { createLeasePackage } from '@/lib/contracts/documentEngine'
import { computeLeaseEndDate } from '@/lib/contracts/leaseFromReservation'

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
  booking_amount?: number | null
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
  security_deposit?: number | null
  co_agent_id?: string | null
  co_agent_info?: Record<string, string> | null
  co_agent_split_pct?: number | null
  co_agent_commission?: number | null
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
    supabase.from('profiles').select('plan, account_status').eq('id', user.id).single(),
    // Count ALL contracts created this month, including soft-deleted ones —
    // issuing then deleting a contract still consumes a monthly slot.
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).gte('created_at', startOfMonth),
  ])

  // Block contract creation for pending users — must be approved first
  if (profile?.account_status === 'pending') {
    return { error: 'บัญชีของคุณยังอยู่ระหว่างรอการอนุมัติจากแอดมิน ยังไม่สามารถออกเอกสารสัญญาได้' }
  }

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

    // Auto-link owner to stock if stock has no owner yet
    if (input.owner_id) {
      const { data: stockRow } = await supabase
        .from('stock')
        .select('owner_id')
        .eq('id', input.stock_id)
        .eq('agent_uid', user.id)
        .single()
      if (stockRow && !stockRow.owner_id) {
        await supabase
          .from('stock')
          .update({ owner_id: input.owner_id })
          .eq('id', input.stock_id)
          .eq('agent_uid', user.id)
      }
    }
  }

  // ── Commission pipeline record ────────────────────────────────
  if (contract_category === 'reservation' && input.commission_net && input.commission_net > 0) {
    await supabase.from('commission_records').insert({
      agent_uid: user.id,
      reservation_id: id,
      amount: input.commission_net,
      commission_type: 'new_lease',
      status: 'pipeline',
    })
    await logActivity({
      userId: user.id,
      entityType: 'commission',
      entityId: id,
      action: 'pipeline_created',
      title: `Commission Pipeline ฿${Math.round(input.commission_net).toLocaleString('th-TH')}`,
      metadata: { amount: input.commission_net },
    })
  }

  await logActivity({
    userId: user.id,
    entityType: 'booking',
    entityId: id,
    action: 'created',
    title: `สร้างใบจอง ${id}`,
    metadata: { doc_type: input.doc_type, stock_id: input.stock_id ?? undefined },
  })

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
  security_deposit?: number | null
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

  // Compute end_date: last day within the paid term (moveIn + N months − 1 day)
  const moveIn = extras.move_in_date ?? reservation.move_in_date ?? null
  const contractMonths = extras.contract_months ?? reservation.contract_months ?? 12
  const endDate = moveIn ? computeLeaseEndDate(moveIn, contractMonths) : null

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
    // booking_amount is reservation-only; leases don't carry it forward
    booking_amount:       null,
    security_deposit:     extras.security_deposit ?? null,
    contract_months:      contractMonths,
    move_in_date:         moveIn,
    end_date:             endDate,
    cleaning_fee:         extras.cleaning_fee ?? reservation.cleaning_fee,
    ac_count:             extras.ac_count ?? reservation.ac_count,
    ac_wash_per_unit:     extras.ac_wash_per_unit ?? reservation.ac_wash_per_unit,
    penalty_amount:       extras.penalty_amount ?? reservation.penalty_amount ?? null,
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

  // ── Commission: pipeline → earned ────────────────────────────
  const commissionAmount = reservation.commission_net as number | null
  if (commissionAmount && commissionAmount > 0) {
    const now = new Date().toISOString()
    const { data: updated } = await supabase
      .from('commission_records')
      .update({ status: 'earned', lease_id: id, earned_at: now, updated_at: now })
      .eq('reservation_id', reservationId)
      .eq('agent_uid', user.id)
      .eq('status', 'pipeline')
      .select('id')

    if (!updated || updated.length === 0) {
      // No pipeline record (reservation was created before this feature); create earned record
      await supabase.from('commission_records').insert({
        agent_uid: user.id,
        reservation_id: reservationId,
        lease_id: id,
        amount: commissionAmount,
        commission_type: 'new_lease',
        status: 'earned',
        earned_at: now,
      })
    }

    await logActivity({
      userId: user.id,
      entityType: 'commission',
      entityId: id,
      action: 'earned',
      title: `Commission Earned ฿${Math.round(commissionAmount).toLocaleString('th-TH')}`,
      metadata: { amount: commissionAmount, reservation_id: reservationId },
    })
  }

  await logActivity({
    userId: user.id,
    entityType: 'lease',
    entityId: id,
    action: 'created',
    title: `สร้างสัญญาเช่า ${id}`,
    description: `จากใบจอง ${reservationId}`,
    metadata: { reservation_id: reservationId, stock_id: reservation.stock_id ?? undefined },
  })

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
  co_agent:            'co_agent_th_en',
  installment_schedule:'installment_schedule_th_en',
  commission_confirm:  'commission_confirm_th_en',
  commission:          'commission_th_en',
}

// Reference/financial doc types always use the universal bilingual TH-EN MD templates
// regardless of the parent contract's language selection.
const REFERENCE_DOC_TYPES = new Set<ContractDocType>([
  'invoice_reservation', 'receipt_reservation',
  'invoice_deposit', 'receipt_deposit',
  'notice', 'warning',
  'termination', 'cancellation', 'end_contract',
  'commission_confirm', 'commission',
])

export type ChildDocInput = {
  amount?: number | null
  paymentDate?: string | null
  paymentMethod?: string
  bankRef?: string | null
  periodDate?: string | null
  commissionNet?: number | null
  coAgentSplitPct?: number | null
  coAgentCommission?: number | null
  coAgentInfo?: Record<string, string> | null
  coAgentId?: string | null
  coAgentPaymentDirection?: string | null
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
  const langVer = REFERENCE_DOC_TYPES.has(docType) ? 'th_en' : (lease.language_version ?? 'th')
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
    language_version:    langVer,
    // Renewal has 3 language variants — resolve slug from language; others use static map
    template_slug:       AUTO_TEMPLATE_SLUGS[docType] ?? (docType === 'renewal' ? `renewal_${langVer}` : null),
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
    security_deposit:    (lease as { security_deposit?: number | null }).security_deposit ?? null,
    co_agent_split_pct:  (lease as { co_agent_split_pct?: number | null }).co_agent_split_pct ?? null,
    co_agent_commission: (lease as { co_agent_commission?: number | null }).co_agent_commission ?? null,
    co_agent_info:       (lease as { co_agent_info?: Record<string, string> | null }).co_agent_info ?? null,
    occupant_count:      lease.occupant_count,
    extra_vars:          {},
  }

  // Apply doc-type specific overrides
  if (docType === 'renewal') {
    // Snapshot original lease dates before overriding — templates read these from extra_vars
    row.extra_vars = {
      orig_lease_start: lease.move_in_date ?? '',
      orig_lease_end:   lease.end_date ?? '',
      orig_lease_no:    (lease as { code?: string }).code ?? lease.id ?? '',
    }
    if (input.newRentPrice != null)      row.rent_price     = input.newRentPrice
    if (input.newContractMonths != null) row.contract_months = input.newContractMonths
    if (input.newMoveInDate)             row.move_in_date   = input.newMoveInDate
    if (input.newEndDate)                row.end_date       = input.newEndDate
  }

  if (['invoice_reservation','receipt_reservation','invoice_deposit','receipt_deposit'].includes(docType)) {
    if (input.amount != null) {
      row.deposit_amount = input.amount
    } else if (docType === 'invoice_reservation' || docType === 'receipt_reservation') {
      // Booking fee: use booking_amount field; fall back to deposit_amount, then 1 month rent
      const storedBooking = (lease as { booking_amount?: number | null }).booking_amount
      row.deposit_amount = storedBooking ?? lease.deposit_amount ?? (lease.rent_price ?? 0)
      row.booking_amount = storedBooking ?? lease.deposit_amount ?? (lease.rent_price ?? 0)
    } else {
      // Security deposit: prefer stored security_deposit field, then deposit_amount,
      // then compute from deposit_months (never hardcode 2 months)
      const storedSecurity = (lease as { security_deposit?: number | null }).security_deposit
      row.deposit_amount = storedSecurity
        ?? lease.deposit_amount
        ?? ((lease.deposit_months ?? 2) * (lease.rent_price ?? 0))
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
    if (input.commissionNet != null)    row.commission_net = input.commissionNet
    if (input.vat7 !== undefined)       row.vat_7 = input.vat7
    if (input.wht3 !== undefined)       row.wht_3 = input.wht3
    if (input.coAgentSplitPct != null)  row.co_agent_split_pct = input.coAgentSplitPct
    if (input.coAgentCommission != null) row.co_agent_commission = input.coAgentCommission
  }

  if (docType === 'co_agent') {
    if (input.commissionNet != null)         row.commission_net = input.commissionNet
    if (input.coAgentSplitPct != null)       row.co_agent_split_pct = input.coAgentSplitPct
    if (input.coAgentCommission != null)     row.co_agent_commission = input.coAgentCommission
    if (input.coAgentInfo)                   row.co_agent_info = input.coAgentInfo
    if (input.coAgentId)                     row.co_agent_id = input.coAgentId
    if (input.coAgentPaymentDirection)       row.co_agent_payment_direction = input.coAgentPaymentDirection
    if (input.vat7 !== undefined)            row.vat_7 = input.vat7
    if (input.wht3 !== undefined)            row.wht_3 = input.wht3
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

  if (input.extraVars) row.extra_vars = { ...(row.extra_vars as Record<string,string> ?? {}), ...input.extraVars }

  const { error } = await supabase.from('contracts').insert(row)
  if (error) return { error: 'สร้างเอกสารไม่สำเร็จ: ' + error.message }

  // ── Renewal commission (0.5 month rent) ──────────────────────
  if (docType === 'renewal') {
    const renewalRent = (row.rent_price as number | null | undefined) ?? 0
    if (renewalRent > 0) {
      const renewalCommission = Math.round(renewalRent * 0.5)
      const now = new Date().toISOString()
      await supabase.from('commission_records').insert({
        agent_uid: user.id,
        lease_id: id,
        amount: renewalCommission,
        commission_type: 'renewal',
        status: 'earned',
        earned_at: now,
      })
      await logActivity({
        userId: user.id,
        entityType: 'commission',
        entityId: id,
        action: 'renewal_earned',
        title: `Renewal Commission ฿${renewalCommission.toLocaleString('th-TH')}`,
        metadata: { amount: renewalCommission, rent_price: renewalRent, lease_id: leaseId },
      })
    }
  }

  // Ending docs: snapshot the lease's furniture inventory for move-out inspection.
  // The signed lease's items are NEVER modified — we copy them into the new
  // ending document so the agent can record move-out condition separately.
  const endingTypes = ['termination', 'cancellation', 'end_contract']
  if (endingTypes.includes(docType)) {
    const { data: leaseItems } = await supabase
      .from('contract_furniture_items')
      .select('item_name, item_name_en, quantity, condition, notes, serial_no, sort_order')
      .eq('contract_id', masterId)
      .order('sort_order', { ascending: true })
    if (leaseItems && leaseItems.length > 0) {
      const snapshot = leaseItems.map(it => ({
        contract_id: id,
        agent_uid: user.id,
        item_name: it.item_name,
        item_name_en: it.item_name_en,
        quantity: it.quantity,
        condition: it.condition,        // move-in condition (read-only reference)
        notes: it.notes,
        serial_no: it.serial_no,
        sort_order: it.sort_order,
        move_out_condition: null,
        move_out_notes: null,
      }))
      await supabase.from('contract_furniture_items').insert(snapshot)
    }
  }

  // Ending docs: do NOT terminate the master lease at draft creation. Store the
  // intended effective date on the ending document; the master lease is only
  // terminated (and the stock released) when this document is finalized/locked.
  // This lets the agent delete a draft ending doc without leaving the lease and
  // stock stuck in a terminated state.
  if (endingTypes.includes(docType)) {
    if (input.effectiveEndDate) {
      await supabase.from('contracts')
        .update({ effective_end_date: input.effectiveEndDate })
        .eq('id', id).eq('agent_uid', user.id)
    }
    await appendTimelineEvent(supabase, id, masterId, user.id, docType,
      `สร้างร่างเอกสาร${docType === 'cancellation' ? 'ยกเลิก' : 'สิ้นสุด'}สัญญา (จะมีผลเมื่อกดล็อก)`, id)
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
  booking_amount?: number | null
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
  security_deposit?: number | null
  co_agent_split_pct?: number | null
  co_agent_commission?: number | null
  co_agent_info?: Record<string, string> | null
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
    .select('is_finalized, status, docx_url, pdf_url, contract_category, stock_id, doc_type, master_contract_id, effective_end_date')
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

  // Ending docs take effect only now (on lock): terminate the master lease and
  // release the stock. Done here — not at draft creation — so a draft can be
  // deleted without stranding the lease/stock.
  const endingTypes = ['termination', 'cancellation', 'end_contract']
  const cDocType = (contract as { doc_type?: string }).doc_type ?? ''
  if (endingTypes.includes(cDocType)) {
    const masterId = (contract as { master_contract_id?: string | null }).master_contract_id
    const effectiveEnd = (contract as { effective_end_date?: string | null }).effective_end_date
    if (masterId) {
      const newStatus = cDocType === 'cancellation' ? 'cancelled' : 'terminated'
      const { data: master } = await supabase
        .from('contracts')
        .select('stock_id')
        .eq('id', masterId).eq('agent_uid', user.id).single()
      await supabase.from('contracts')
        .update({ effective_end_date: effectiveEnd ?? now, terminated_at: now, status: newStatus })
        .eq('id', masterId).eq('agent_uid', user.id)
      const today = new Date().toISOString().split('T')[0]!
      const masterStockId = (master as { stock_id?: string | null } | null)?.stock_id
      if (masterStockId && (!effectiveEnd || effectiveEnd <= today)) {
        await setStockAvailable(supabase, masterStockId, user.id)
      }
    }
  }

  await addTimelineEvent(contractId, 'finalized_manually',
    isLease ? 'ล็อกและเปิดใช้งานสัญญาเช่า (ลงนามออฟไลน์)'
      : endingTypes.includes(cDocType) ? 'ล็อกเอกสารสิ้นสุดสัญญา — สัญญาเช่าสิ้นสุดแล้ว'
      : 'ล็อกสัญญาด้วยตนเอง (ลงนามออฟไลน์)')

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

  const releasesStock = status === 'cancelled' || status === 'terminated' || status === 'completed' || status === 'renewed'
  if (releasesStock && stockId) {
    // Any terminal status on a reservation or lease → release the unit back to available
    if (category === 'reservation' || category === 'lease') {
      await setStockAvailable(supabase, stockId, user.id)
    }
  }

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Document cross-reference ─────────────────────────────────
// Resolves the document a given contract references:
//   lease/invoice → its parent (reservation / lease)
//   receipt       → the matching invoice (sibling under the same parent)
//   reservation   → none
async function resolveReferenceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contract: { doc_type?: string | null; parent_contract_id?: string | null; master_contract_id?: string | null },
): Promise<string | null> {
  const dt = contract.doc_type ?? ''
  const parent = contract.parent_contract_id ?? contract.master_contract_id ?? null
  if (dt === 'reservation') return null
  if (dt === 'receipt_reservation' || dt === 'receipt_deposit') {
    const invType = dt === 'receipt_reservation' ? 'invoice_reservation' : 'invoice_deposit'
    if (parent) {
      const { data } = await supabase
        .from('contracts')
        .select('id')
        .eq('parent_contract_id', parent)
        .eq('doc_type', invType)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.id ?? parent
    }
    return null
  }
  return parent
}

// Injects the cross-reference variables into a computed variable map.
async function injectReferenceVars(
  variables: Record<string, string>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  contract: { doc_type?: string | null; parent_contract_id?: string | null; master_contract_id?: string | null },
): Promise<void> {
  const refId = await resolveReferenceId(supabase, contract)
  variables['เลขที่อ้างอิง'] = refId ?? '-'
  variables['บรรทัดอ้างอิง'] = refId ? `เอกสารอ้างอิงเลขที่ / Ref. No.: ${refId}` : ''
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
    await injectReferenceVars(variables, supabase, contract as Record<string, unknown>)

    const validation = validateVariables(variables, template)
    if (!validation.valid) {
      return {
        error: `ข้อมูลไม่ครบ: ${validation.missing.map(m => m.label).join(', ')}`,
        missing: validation.missing.map(m => m.label),
      }
    }

    const isCoAgentDoc     = contract.doc_type === 'co_agent'
    const isCommissionDoc  = contract.doc_type === 'commission_confirm'
    const isAgentDoc       = isCoAgentDoc || isCommissionDoc
    const ownerFullName = contract.owner
      ? [contract.owner.prefix, contract.owner.first_name_th, contract.owner.last_name_th].filter(Boolean).join(' ') || null
      : undefined
    const customerFullName = contract.customer
      ? [contract.customer.prefix, contract.customer.first_name_th, contract.customer.last_name_th].filter(Boolean).join(' ') || null
      : undefined

    const signatures = {
      ownerName:      isCoAgentDoc ? undefined : ownerFullName,
      ownerRole:      isCommissionDoc ? 'เจ้าของทรัพย์สิน' : 'ผู้ให้เช่า',
      ownerSigUrl:    isCoAgentDoc ? undefined : (contract.owner as { signature_url?: string | null } | null)?.signature_url,
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
    await injectReferenceVars(variables, supabase, contract as Record<string, unknown>)

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
    let _slug = (contract as { template_slug?: string | null }).template_slug ?? null

    // Auto-resolve: contracts created before AUTO_TEMPLATE_SLUGS was added have template_slug=null.
    // For any doc type with a known MD template, resolve it now so Route B-md is used.
    if (!_slug) {
      const resolved = AUTO_TEMPLATE_SLUGS[contract.doc_type as ContractDocType]
      if (resolved) {
        _slug = resolved
        console.log(`[PDF:ROUTE ${new Date().toISOString()}] auto-slug doc_type=${contract.doc_type} → ${_slug}`)
      } else if (contract.doc_type === 'renewal') {
        // Renewal has 3 language variants — resolve from the contract's language_version
        const renewalLang = (contract as { language_version?: string | null }).language_version ?? 'th'
        _slug = `renewal_${renewalLang}`
        console.log(`[PDF:ROUTE ${new Date().toISOString()}] auto-slug doc_type=renewal lang=${renewalLang} → ${_slug}`)
      }
    }

    console.log(`[PDF:ROUTE ${new Date().toISOString()}] start`, JSON.stringify({ contractId, doc_type: contract.doc_type, template_slug: _slug }))

    // ─── Route A: legacy navy renderer (only fires when no template_slug AND not a known reference type) ───
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
        vat7:  false,  // invoice/receipt docs are tenant-facing — VAT/WHT never applies
        wht3:  false,
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
      await injectReferenceVars(variables, supabase, contract as Record<string, unknown>)

      const ownerName = [contract.owner?.prefix, contract.owner?.first_name_th, contract.owner?.last_name_th]
        .filter(Boolean).join(' ') || ''
      const customerName = [contract.customer?.prefix, contract.customer?.first_name_th, contract.customer?.last_name_th]
        .filter(Boolean).join(' ') || ''

      const ownerSigUrl    = (contract.owner    as { signature_url?: string | null } | null)?.signature_url ?? undefined
      const customerSigUrl = (contract.customer as { signature_url?: string | null } | null)?.signature_url ?? undefined

      // Witness signatures live on contract_signers (no profile), so pull them
      // in and append so they render in the {signature-final} block.
      const { data: witnessRows } = await supabase
        .from('contract_signers')
        .select('signed_name, signer_name, signature_url')
        .eq('contract_id', contractId)
        .eq('signer_role', 'witness')
        .eq('status', 'signed')
        .order('sort_order', { ascending: true })
      const witnessSigners = (witnessRows ?? [])
        .filter(w => w.signature_url)
        .map((w, i) => ({
          label: (witnessRows!.length > 1 ? `พยาน ${i + 1}` : 'พยาน'),
          name: w.signed_name ?? w.signer_name ?? '',
          signatureUrl: w.signature_url ?? undefined,
          signedAt: null,
        }))

      const baseSigners = [
        { label: 'ผู้ให้เช่า', name: ownerName,    signatureUrl: ownerSigUrl,    signedAt: null },
        { label: 'ผู้เช่า',    name: customerName, signatureUrl: customerSigUrl, signedAt: null },
        ...witnessSigners,
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

// ─── Lease Agreement Attachments PDF (separate document) ─────
//
// Generates a standalone "Lease Agreement Attachments" PDF, separate from
// the rental contract itself. The user explicitly triggers this (e.g. via
// "สร้างเอกสารแนบ" button on the contract page).
//
// Data sources:
//   inventory  ← contract_furniture_items (already in DB)
//   id-cards   ← owner.id_card_url + customer.id_card_url
//   photos     ← stock.photo_thumb_urls
//   facilities ← Phase 3: project facilities (DB table TBD)
//   keys       ← Phase 4: contract key records (DB table TBD)

export async function generateLeaseAttachmentsPdf(
  contractId: string
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: contract }, { data: profile }, { data: furnitureRows }, { data: keyRows }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*, project:projects(*)), owner:owners(*), customer:customers(*)')
      .eq('id', contractId)
      .eq('agent_uid', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('contract_furniture_items')
      .select('*')
      .eq('contract_id', contractId)
      .eq('agent_uid', user.id)
      .order('sort_order'),
    supabase
      .from('contract_key_items')
      .select('*')
      .eq('contract_id', contractId)
      .eq('agent_uid', user.id)
      .order('sort_order'),
  ])

  if (!contract) return { error: 'ไม่พบสัญญา' }
  if (contract.doc_type !== 'rental') return { error: 'เอกสารแนบใช้ได้เฉพาะสัญญาเช่า' }

  try {
    const { buildAttachmentHtml } = await import('@/lib/pdf/attachments/buildAttachments')
    const { htmlToPdfBuffer }     = await import('@/lib/pdf/contract/htmlToPdf')
    const { toThaiDateFull }      = await import('@/lib/contracts/formatters')

    const stock = contract.stock as (typeof contract.stock & {
      photo_thumb_urls?: string[] | null
      photo_urls?:       string[] | null
      unit_no?:          string | null
      project_name?:     string | null
    }) | null

    const ownerName = [contract.owner?.prefix, contract.owner?.first_name_th, contract.owner?.last_name_th]
      .filter(Boolean).join(' ') || ''
    const customerName = [contract.customer?.prefix, contract.customer?.first_name_th, contract.customer?.last_name_th]
      .filter(Boolean).join(' ') || ''

    const contractDate = toThaiDateFull(
      new Date(contract.move_in_date ?? contract.created_at ?? new Date())
    )

    const photoUrls: string[] = (
      stock?.photo_thumb_urls?.length ? stock.photo_thumb_urls : stock?.photo_urls
    ) ?? []

    // ID cards are stored in the private secure-documents bucket as relative paths.
    // Generate 1-hour signed URLs so fetchAsDataUrl() can actually download them.
    async function signedIdCardUrl(rawPath: string | null | undefined): Promise<string | null> {
      if (!rawPath) return null
      if (rawPath.startsWith('https://')) return rawPath
      const { data } = await supabase.storage.from('secure-documents').createSignedUrl(rawPath, 3600)
      return data?.signedUrl ?? null
    }

    const ownerIdCardRaw    = (contract.owner    as { id_card_url?: string | null } | null)?.id_card_url
    const customerIdCardRaw = (contract.customer as { id_card_url?: string | null } | null)?.id_card_url
    const ownerSigUrl       = (contract.owner    as { signature_url?: string | null } | null)?.signature_url
    const customerSigUrl    = (contract.customer as { signature_url?: string | null } | null)?.signature_url

    const [ownerIdCardUrl, customerIdCardUrl] = await Promise.all([
      signedIdCardUrl(ownerIdCardRaw),
      signedIdCardUrl(customerIdCardRaw),
    ])

    console.log(`[ATT ${new Date().toISOString()}] start`, JSON.stringify({
      contractId,
      furnitureItems: furnitureRows?.length ?? 0,
      keyItems: keyRows?.length ?? 0,
      photos: photoUrls.length,
      ownerIdCard: !!ownerIdCardUrl,
      customerIdCard: !!customerIdCardUrl,
    }))

    const attachmentHtml = await buildAttachmentHtml({
      contractId,
      contractDate,
      ownerName,
      ownerNationalId:    contract.owner?.national_id ?? '',
      ownerIdCardUrl,
      customerName,
      customerNationalId: contract.customer?.national_id ?? '',
      customerIdCardUrl,
      ownerSignatureUrl:    ownerSigUrl ?? null,
      customerSignatureUrl: customerSigUrl ?? null,
      stockUnitNo:        stock?.unit_no      ?? '',
      stockProjectName:   stock?.project_name ?? '',
      stockPhotoUrls:     photoUrls,
      agentName:          profile?.company_name ?? profile?.name ?? '',
      sections:           ['id-cards', 'inventory', 'photos', 'keys'],
      furnitureItems: (furnitureRows ?? []) as Parameters<typeof buildAttachmentHtml>[0]['furnitureItems'],
      keyItems: (keyRows ?? []).map(r => ({
        id:             r.id,
        name:           (r as { item_name_th: string }).item_name_th,
        nameEn:         (r as { item_name_en: string }).item_name_en,
        quantity:       (r as { quantity: number }).quantity,
        penalty_amount: (r as { penalty_amount: number }).penalty_amount,
      })),
      // projectFacilities: Phase 3 — no table yet
    })

    console.log(`[ATT ${new Date().toISOString()}] html built`, JSON.stringify({
      htmlBytes: Buffer.byteLength(attachmentHtml, 'utf8'),
    }))

    const buffer = await htmlToPdfBuffer({
      bodyHtml:     attachmentHtml,
      contractId,
      docTypeLabel: 'เอกสารแนบประกอบสัญญาเช่า',
      agentName:    profile?.company_name ?? profile?.name ?? '',
      agentPhone:   (profile as { phone?: string | null } | null)?.phone ?? '',
      statusText:   'เอกสารแนบ',
      signers:      [],
      features:     { pageNumbers: true, miniSignatures: false, finalSignature: false },
    })

    // Upload with `_att` suffix to distinguish from the contract PDF
    const uploadResult = await uploadPdfToStorage(supabase, user.id, `${contractId}_att`, buffer)
    if ('error' in uploadResult) return uploadResult

    await supabase
      .from('contracts')
      .update({ attachment_pdf_url: uploadResult.url } as Record<string, unknown>)
      .eq('id', contractId)

    revalidatePath(`/contracts/${contractId}`)
    console.log(`[ATT ${new Date().toISOString()}] done url=${uploadResult.url}`)
    return { url: uploadResult.url }
  } catch (err) {
    console.error('[ATT] generateLeaseAttachmentsPdf error:', err)
    return { error: 'สร้างเอกสารแนบไม่สำเร็จ กรุณาลองใหม่' }
  }
}

// ─── Move-out Inspection Attachment PDF ───────────────────────
// Standalone document for ending contracts (termination/cancellation/
// end_contract) comparing the move-in condition with the move-out condition.

export async function generateMoveOutAttachmentPdf(
  contractId: string
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: contract }, { data: profile }, { data: items }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*, project:projects(*)), owner:owners(*), customer:customers(*)')
      .eq('id', contractId).eq('agent_uid', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('contract_furniture_items').select('*')
      .eq('contract_id', contractId).eq('agent_uid', user.id).order('sort_order'),
  ])

  if (!contract) return { error: 'ไม่พบเอกสาร' }
  if (!['termination', 'cancellation', 'end_contract'].includes(contract.doc_type)) {
    return { error: 'เอกสารตรวจขาออกใช้ได้เฉพาะเอกสารบอกเลิก/สิ้นสุด/ยกเลิก' }
  }

  try {
    const { htmlToPdfBuffer } = await import('@/lib/pdf/contract/htmlToPdf')
    const { toThaiDateFull }  = await import('@/lib/contracts/formatters')

    const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const condLabel: Record<string, string> = {
      good: 'ปกติ / Good', fair: 'เสื่อมสภาพ / Fair',
      damaged: 'ชำรุด / Damaged', missing: 'สูญหาย / Missing', '': '—',
    }
    const stock = contract.stock as { unit_no?: string | null; project_name?: string | null } | null
    const ownerName = [contract.owner?.prefix, contract.owner?.first_name_th, contract.owner?.last_name_th].filter(Boolean).join(' ') || '-'
    const customerName = [contract.customer?.prefix, contract.customer?.first_name_th, contract.customer?.last_name_th].filter(Boolean).join(' ') || '-'
    const dateStr = toThaiDateFull(new Date((contract as { effective_end_date?: string | null }).effective_end_date ?? contract.created_at ?? new Date()))

    const rows = (items ?? []).map((it, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(it.item_name)}${it.item_name_en ? `<br><span style="color:#888;font-size:9pt">${esc(it.item_name_en)}</span>` : ''}</td>
        <td style="text-align:center">${esc(it.quantity ?? 1)}</td>
        <td style="text-align:center">${esc(condLabel[it.condition ?? ''] ?? it.condition)}</td>
        <td style="text-align:center">${esc(condLabel[(it as { move_out_condition?: string | null }).move_out_condition ?? ''] ?? (it as { move_out_condition?: string }).move_out_condition)}</td>
        <td>${esc((it as { move_out_notes?: string | null }).move_out_notes ?? '')}</td>
      </tr>`).join('')

    const bodyHtml = `
      <h1 style="text-align:center;font-size:16pt;margin:0 0 4pt">เอกสารตรวจสภาพทรัพย์สิน (ขาออก)</h1>
      <p style="text-align:center;color:#666;margin:0 0 12pt">Move-out Inspection Report</p>
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10pt">
        <tr><td style="width:25%;color:#666">เลขที่เอกสาร / No.</td><td>${esc(contract.id)}</td>
            <td style="width:18%;color:#666">วันที่ / Date</td><td>${esc(dateStr)}</td></tr>
        <tr><td style="color:#666">ทรัพย์ / Property</td><td colspan="3">${esc([stock?.project_name, stock?.unit_no].filter(Boolean).join(' · ') || '-')}</td></tr>
        <tr><td style="color:#666">ผู้ให้เช่า / Lessor</td><td>${esc(ownerName)}</td>
            <td style="color:#666">ผู้เช่า / Lessee</td><td>${esc(customerName)}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:10pt" border="1">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:5pt;width:6%">#</th>
            <th style="padding:5pt;text-align:left">รายการ / Item</th>
            <th style="padding:5pt;width:9%">จำนวน</th>
            <th style="padding:5pt;width:18%">สภาพเข้าอยู่</th>
            <th style="padding:5pt;width:18%">สภาพขาออก</th>
            <th style="padding:5pt;width:22%;text-align:left">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:10pt;color:#888">ไม่มีรายการทรัพย์สิน</td></tr>'}</tbody>
      </table>
      <table style="width:100%;margin-top:36pt;font-size:10pt"><tr>
        <td style="text-align:center;width:50%">..................................................<br>ผู้ให้เช่า / Lessor<br>(${esc(ownerName)})</td>
        <td style="text-align:center;width:50%">..................................................<br>ผู้เช่า / Lessee<br>(${esc(customerName)})</td>
      </tr></table>`

    const buffer = await htmlToPdfBuffer({
      bodyHtml,
      contractId,
      docTypeLabel: 'เอกสารตรวจสภาพทรัพย์สิน (ขาออก)',
      agentName:    profile?.company_name ?? profile?.name ?? '',
      agentPhone:   (profile as { phone?: string | null } | null)?.phone ?? '',
      statusText:   'ตรวจขาออก',
      signers:      [],
      features:     { pageNumbers: true, miniSignatures: false, finalSignature: false },
    })

    const uploadResult = await uploadPdfToStorage(supabase, user.id, `${contractId}_moveout`, buffer)
    if ('error' in uploadResult) return uploadResult
    await supabase.from('contracts').update({ attachment_pdf_url: uploadResult.url } as Record<string, unknown>).eq('id', contractId)
    revalidatePath(`/contracts/${contractId}`)
    return { url: uploadResult.url }
  } catch (err) {
    console.error('[MOVEOUT] error:', err)
    return { error: 'สร้างเอกสารตรวจขาออกไม่สำเร็จ กรุณาลองใหม่' }
  }
}

// ─── Furniture Items ──────────────────────────────────────────

export type FurnitureItemInput = {
  item_name: string
  item_name_en?: string | null
  quantity: number
  condition: 'good' | 'fair' | 'damaged' | 'missing'
  notes?: string | null
  serial_no?: string | null
  sort_order?: number
  move_out_condition?: string | null
  move_out_notes?: string | null
}

// Translate Thai furniture names → English in one AI call (counts as 1 AI use).
export async function translateFurnitureNames(
  names: string[]
): Promise<{ error?: string; translations?: string[]; quota?: { used: number; limit: number } }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const clean = names.map(n => (n ?? '').trim())
  if (clean.every(n => !n)) return { translations: clean }

  const { checkAiQuota, incrementAiUsage } = await import('@/lib/aiQuota')
  const quota = await checkAiQuota()
  if (!quota.allowed) return { error: quota.error ?? 'เกินโควต้า AI', quota: { used: quota.used, limit: quota.limit } }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  try {
    const prompt = `แปลรายการเฟอร์นิเจอร์/อุปกรณ์ภายในห้องเช่าต่อไปนี้จากภาษาไทยเป็นภาษาอังกฤษ สั้นกระชับเป็นคำนาม
ตอบเป็น JSON เท่านั้น รูปแบบ {"translations": ["...", "..."]} เรียงตามลำดับเดิม ถ้ารายการใดว่างให้ใส่ "" :
${JSON.stringify(clean)}`
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      }
    )
    if (!res.ok) return { error: `แปลไม่สำเร็จ (Gemini ${res.status})` }
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    const translations: string[] = Array.isArray(parsed?.translations) ? parsed.translations : []

    const inc = await incrementAiUsage()
    return {
      translations: clean.map((_, i) => translations[i] ?? ''),
      quota: { used: inc.used ?? quota.used + 1, limit: inc.limit ?? quota.limit },
    }
  } catch {
    return { error: 'แปลไม่สำเร็จ กรุณาลองใหม่' }
  }
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
    contract_id:  contractId,
    agent_uid:    user.id,
    item_name:    item.item_name,
    item_name_en: item.item_name_en ?? null,
    quantity:     item.quantity,
    condition:    item.condition,
    notes:        item.notes ?? null,
    serial_no:    item.serial_no ?? null,
    sort_order:   item.sort_order ?? i,
    move_out_condition: item.move_out_condition ?? null,
    move_out_notes:     item.move_out_notes ?? null,
  }))

  const { error } = await supabase.from('contract_furniture_items').insert(rows)
  if (error) return { error: 'บันทึกรายการไม่สำเร็จ: ' + error.message }

  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Key & Equipment Items ────────────────────────────────────

export type KeyItemInput = {
  item_name_th: string
  item_name_en: string
  quantity: number
  penalty_amount: number
  sort_order?: number
}

export async function saveKeyItems(
  contractId: string,
  items: KeyItemInput[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error: delErr } = await supabase
    .from('contract_key_items')
    .delete()
    .eq('contract_id', contractId)
    .eq('agent_uid', user.id)

  if (delErr) return { error: 'ลบรายการเดิมไม่สำเร็จ: ' + delErr.message }

  if (items.length === 0) return {}

  const rows = items.map((item, i) => ({
    contract_id:    contractId,
    agent_uid:      user.id,
    item_name_th:   item.item_name_th,
    item_name_en:   item.item_name_en,
    quantity:       item.quantity,
    penalty_amount: item.penalty_amount,
    sort_order:     item.sort_order ?? i,
  }))

  const { error } = await supabase.from('contract_key_items').insert(rows)
  if (error) return { error: 'บันทึกรายการไม่สำเร็จ: ' + error.message }

  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Stock Photos ─────────────────────────────────────────────

export async function updateStockPhotos(
  stockId: string,
  photoUrls: string[],
  thumbUrls: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('stock')
    .update({ photo_urls: photoUrls, photo_thumb_urls: thumbUrls })
    .eq('id', stockId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'บันทึกรูปไม่สำเร็จ: ' + error.message }

  revalidatePath(`/stock/${stockId}`)
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

// ─── Soft Delete ──────────────────────────────────────────────

const DELETABLE_STATUSES = new Set(['draft', 'cancelled', 'terminated', 'converted_to_lease'])

export async function deleteContract(
  contractId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: contract } = await supabase
    .from('contracts')
    .select('status, is_finalized, contract_category')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .is('deleted_at', null)
    .single()

  if (!contract) return { error: 'ไม่พบสัญญา' }
  if (contract.is_finalized) return { error: 'ไม่สามารถลบสัญญาที่ล็อกแล้ว' }
  if (!DELETABLE_STATUSES.has(contract.status)) {
    return { error: `ลบได้เฉพาะสัญญาสถานะ ร่าง / ยกเลิก / บอกเลิก / แปลงเป็นสัญญาเช่าแล้ว เท่านั้น (ปัจจุบัน: ${contract.status})` }
  }

  const { error } = await supabase
    .from('contracts')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'ลบสัญญาไม่สำเร็จ: ' + error.message }

  revalidatePath('/contracts')
  return {}
}
