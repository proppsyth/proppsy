// Compute all <<variable>> values for a contract template
// Maps DB fields + derived calculations → Record<string, string>

import type { Contract, Stock, Owner, Customer, Profile } from '@/types'
import {
  THAI_MONTHS, toThaiDate, toThaiDateFull, toEnDate,
  thaiYear, enYear, thaiMonthName, dayOfMonth,
  withCommas, formatNationalId, bahtText, bahtTextEn,
} from './formatters'
import type { TemplateDefinition } from './templateRegistry'
import { getEnglishAddress } from '@/lib/address'

export interface VariableContext {
  contract: Contract & {
    language_version?: string | null
    occupant_count?: number | null
    extra_vars?: Record<string, string> | null
  }
  stock: Stock | null
  owner: Owner | null
  customer: Customer | null
  agent: Profile | null
}

export function computeVariables(
  ctx: VariableContext,
  template: TemplateDefinition,
): Record<string, string> {
  const { contract, stock, owner, customer, agent } = ctx
  const extra: Record<string, string> = (contract.extra_vars as Record<string, string> | null) ?? {}
  const v: Record<string, string> = {}

  // ─── Dates ─────────────────────────────────────────────────

  const contractDate = contract.created_at ? new Date(contract.created_at) : new Date()
  const moveInDate   = contract.move_in_date ? new Date(contract.move_in_date) : null
  const endDate      = contract.end_date ? new Date(contract.end_date) : null

  v['thเมื่อวันที่']             = toThaiDate(contractDate)
  v['เมื่อวันที่']               = toThaiDate(contractDate)
  v['เมื่อวันที่ภาษาไทย']        = toThaiDate(contractDate)
  v['enเมื่อวันที่']             = toEnDate(contractDate)
  v['เมื่อวันที่ภาษาอังกฤษ']     = toEnDate(contractDate)
  v['ทำสัญญาวันที่ตัวอักษร']     = toThaiDateFull(contractDate)
  v['ทำสัญญาวันที่ภาษาไทย']      = toThaiDate(contractDate)
  v['ทำสัญญาวันที่ภาษาอังกฤษ']   = toEnDate(contractDate)
  v['ปีที่ทำสัญญา']              = thaiYear(contractDate)
  v['ทำสัญญาเดือนอย่างเดียว']    = String(contractDate.getMonth() + 1)

  if (endDate) {
    v['ทำสัญญาวันที่สิ้นสุดตัวอักษร']   = toThaiDateFull(endDate)
    v['สิ้นสุดสัญญาวันที่']              = toThaiDate(endDate)
    v['ขยายเวลาสิ้นสุดเป็นวันที่']       = toThaiDate(endDate)
    v['enขยายเวลาสิ้นสุดเป็นวันที่']     = toEnDate(endDate)
    v['enสิ้นสุดสัญญาวันที่']            = toEnDate(endDate)
    v['ปีสิ้นสุด']                       = thaiYear(endDate)
    v['ปีที่สิ้นสุดไทย']                 = thaiYear(endDate)
    v['ปีที่สิ้นสุดอังกฤษ']              = enYear(endDate)
    v['เดือนที่สิ้นสุด']                 = thaiMonthName(endDate)
    v['เดือนสิ้นสุด']                    = thaiMonthName(endDate)
    v['วันที่สิ้นสุด']                   = dayOfMonth(endDate)
  }

  if (moveInDate) {
    v['เริ่มต่อสัญญา']   = toThaiDate(moveInDate)
    v['enเริ่มต่อสัญญา'] = toEnDate(moveInDate)
  }

  // Original lease date for renewal (stored in extra_vars)
  v['สัญญาเช่าฉบับเก่าลงวันที่']   = extra['สัญญาเช่าฉบับเก่าลงวันที่'] ?? '-'
  v['enสัญญาเช่าฉบับเก่าลงวันที่'] = extra['enสัญญาเช่าฉบับเก่าลงวันที่'] ?? '-'

  // ─── Contract period & payment ───────────────────────────────

  const months     = contract.contract_months ?? 12
  const paymentDay = contract.payment_day_of_month ?? (moveInDate?.getDate() ?? 1)
  const graceDays  = contract.payment_grace_days ?? 5

  v['ระยะเวลาสัญญา']       = String(months)
  v['ระยะเวลาต่อสัญญา']    = String(months)
  v['ระยะเวลาสัญญาปี']     = months >= 12
    ? (months % 12 === 0 ? `${months / 12} ปี` : `${Math.floor(months / 12)} ปี ${months % 12} เดือน`)
    : `${months} เดือน`
  v['ทำสัญญาวันที่อย่างเดียว'] = String(paymentDay)
  v['พ้นกำหนดชำระได้ไม่เกิน'] = String(graceDays)

  // ─── 12-month payment schedule ────────────────────────────────
  // <<1>> = Thai month name, <<1+5>> = grace-period end label

  if (template.hasPaymentSchedule && moveInDate) {
    for (let n = 1; n <= 12; n++) {
      const d = new Date(moveInDate)
      d.setMonth(d.getMonth() + (n - 1))
      const monthName = THAI_MONTHS[d.getMonth()] ?? ''
      v[String(n)]    = monthName
      v[`${n}+5`]     = `${paymentDay + graceDays} ${monthName}`
    }
  }

  // ─── Owner ───────────────────────────────────────────────────

  if (owner) {
    const ownerName = [owner.prefix, owner.first_name_th, owner.last_name_th]
      .filter(Boolean).join(' ') || '-'
    v['ชื่อผู้ให้เช่า']            = ownerName
    v['ชื่อ - สกุล เจ้าของ']      = ownerName
    v['ฟอแมทบัตรประชาชนผู้ให้เช่า'] = formatNationalId(owner.national_id)
    v['เลขเสียภาษี เจ้าของ']      = owner.national_id ?? '-'
    v['บ้านเลขที่ เจ้าของ']       = owner.address_no ?? '-'
    v['หมู่ที่ เจ้าของ']          = extra['หมู่ที่ เจ้าของ'] ?? ''
    v['ถนน เจ้าของ']             = owner.address_road ?? '-'
    v['แขวงตำบล เจ้าของ']        = owner.subdistrict ?? '-'
    v['เขตอำเภอ เจ้าของ']        = owner.district ?? '-'
    v['จังหวัด เจ้าของ']         = owner.province ?? '-'
    v['รหัสไปรษณีย์ เจ้าของ']    = owner.zip ?? '-'
    // English address for owner (from CSV, not AI)
    const ownerEn = getEnglishAddress(owner.province ?? undefined, owner.district ?? undefined, owner.subdistrict ?? undefined)
    v['enแขวงตำบล เจ้าของ']  = ownerEn.subdistrict_en ?? owner.subdistrict ?? '-'
    v['enเขตอำเภอ เจ้าของ']  = ownerEn.district_en   ?? owner.district   ?? '-'
    v['enจังหวัด เจ้าของ']   = ownerEn.province_en   ?? owner.province   ?? '-'

    // Bank info — prefer owner's then fall back to agent's
    v['บัญชีธนาคาร']             = owner.bank_name ?? agent?.bank_name ?? '-'
    v['บัญชีธนาคารภาษาอังกฤษ']  = extra['บัญชีธนาคารภาษาอังกฤษ'] ?? owner.bank_name ?? '-'
    v['เลขที่บัญชี']             = owner.bank_account_no ?? agent?.bank_account_no ?? '-'
    v['เลขบัญชี']                = v['เลขที่บัญชี']
  }

  // ─── Customer / Tenant ───────────────────────────────────────

  if (customer) {
    const custName = [customer.prefix, customer.first_name_th, customer.last_name_th]
      .filter(Boolean).join(' ') || '-'
    v['ชื่อผู้เช่า']               = custName
    v['ชื่อ - สกุล ลูกค้า']        = custName
    v['ฟอแมทบัตรประชาชนผู้เช่า']   = formatNationalId(customer.national_id)
    v['ผู้เช่าบัตรประชาชนเลขที่']  = customer.national_id?.replace(/\D/g, '') ?? '-'
    v['เลขเสียภาษี ลูกค้า']       = customer.national_id ?? '-'
    v['บ้านเลขที่ ลูกค้า']        = customer.address_no ?? '-'
    v['หมู่ที่ ลูกค้า']           = extra['หมู่ที่ ลูกค้า'] ?? ''
    v['ถนน ลูกค้า']              = customer.address_road ?? '-'
    v['แขวงตำบล ลูกค้า']         = customer.subdistrict ?? '-'
    v['เขตอำเภอ ลูกค้า']         = customer.district ?? '-'
    v['จังหวัด ลูกค้า']          = customer.province ?? '-'
    v['รหัสไปรษณีย์ ลูกค้า']     = customer.zip ?? '-'
    // English address for customer
    const custEn = getEnglishAddress(customer.province ?? undefined, customer.district ?? undefined, customer.subdistrict ?? undefined)
    v['enแขวงตำบล ลูกค้า']  = custEn.subdistrict_en ?? customer.subdistrict ?? '-'
    v['enเขตอำเภอ ลูกค้า']  = custEn.district_en   ?? customer.district   ?? '-'
    v['enจังหวัด ลูกค้า']   = custEn.province_en   ?? customer.province   ?? '-'
  }

  // ─── Stock / Unit ────────────────────────────────────────────

  if (stock) {
    v['project']               = stock.project_name ?? '-'
    v['view']                  = stock.project_name ?? '-'
    v['showp']                 = stock.project_name ?? '-'
    v['เลขที่ห้องชุด']         = stock.unit_no ?? '-'
    v['เลขที่ห้อง']            = stock.unit_no ?? '-'
    v['ขนาด']                  = stock.size_sqm ? `${stock.size_sqm} ตร.ม.` : '-'
    v['ชั้น']                  = stock.floor != null ? String(stock.floor) : '-'
    v['ตึก']                   = stock.building ?? extra['ตึก'] ?? '-'
    v['ประเภทห้อง']            = stock.room_type ?? '-'
    // Address from linked project (joined as project?)
    const proj = (stock as Stock & { project?: { address_road?: string; subdistrict?: string; district?: string; province?: string; zip?: string } }).project
    v['ซอย']                   = extra['ซอย'] ?? '-'
    v['ถนนโครงการ']            = proj?.address_road ?? extra['ถนนโครงการ'] ?? '-'
    v['thถนน']                 = proj?.address_road ?? extra['thถนน'] ?? '-'
    v['แขวงตำบลห้องชุด']       = proj?.subdistrict ?? extra['แขวงตำบลห้องชุด'] ?? '-'
    v['thแขวงตำบล']            = proj?.subdistrict ?? extra['thแขวงตำบล'] ?? '-'
    v['เขตอำเภอห้องชุด']       = proj?.district ?? extra['เขตอำเภอห้องชุด'] ?? '-'
    v['thเขตอำเภอ']            = proj?.district ?? extra['thเขตอำเภอ'] ?? '-'
    v['จังหวัดห้องชุด']        = proj?.province ?? extra['จังหวัดห้องชุด'] ?? '-'
    v['thจังหวัด']             = proj?.province ?? extra['thจังหวัด'] ?? '-'
    v['รหัสไปรษณีย์ห้องชุด']  = proj?.zip ?? extra['รหัสไปรษณีย์ห้องชุด'] ?? '-'
    v['postcode']              = proj?.zip ?? extra['postcode'] ?? '-'
    // English address for stock's project (from CSV)
    const projEn = getEnglishAddress(proj?.province, proj?.district, proj?.subdistrict)
    v['enแขวงตำบล']  = projEn.subdistrict_en ?? proj?.subdistrict ?? '-'
    v['enเขตอำเภอ']  = projEn.district_en   ?? proj?.district   ?? '-'
    v['enจังหวัด']   = projEn.province_en   ?? proj?.province   ?? '-'
  }

  // ─── Agent ───────────────────────────────────────────────────

  v['agent'] = agent?.company_name ?? agent?.name ?? '-'

  // ─── Financials ──────────────────────────────────────────────

  const rent      = contract.rent_price ?? 0
  const deposit   = contract.deposit_amount ?? 0
  const penalty   = contract.penalty_amount ?? 0
  const acCount   = contract.ac_count ?? 0
  const acPerUnit = contract.ac_wash_per_unit ?? 0
  const cleaning  = contract.cleaning_fee ?? 0

  v['ค่าเช่า']                   = withCommas(rent)
  v['ค่าเช่าเติมลูกน้ำ']          = withCommas(rent)
  v['ค่าเช่าตัวอักษร']            = bahtText(rent)
  v['ค่าเช่าบาท']                 = bahtText(rent)
  v['ค่าเช่าภาษาอังกฤษ']          = bahtTextEn(rent)
  v['ค่าเช่าx3']                  = withCommas(rent * 3)

  v['จำนวนเงินวันทำสัญญา']              = withCommas(deposit)
  v['จำนวนเงินวันทำสัญญาตัวอักษร']      = bahtText(deposit)
  v['จำนวนเงินวันทำสัญญาภาษาอังกฤษ']   = bahtTextEn(deposit)

  v['ค่าปรับเติมลูกน้ำ']   = withCommas(penalty)
  v['ค่าปรับตัวอักษร']     = bahtText(penalty)
  v['ค่าปรับตัวอักษรen']  = bahtTextEn(penalty)

  v['จำนวนแอร์']                  = String(acCount)
  v['ค่าล้างแอร์เติมลูกน้ำ']      = withCommas(acPerUnit)
  v['ค่าล้างแอร์ตัวอักษร']        = bahtText(acPerUnit)
  const totalAc = acCount * acPerUnit
  v['รวมค่าล้างแอร์เติมลูกน้ำ']  = withCommas(totalAc)
  v['รวมค่าล้างแอร์ตัวอักษร']    = bahtText(totalAc)
  v['รวมแอร์เติมลูกน้ำ']          = withCommas(totalAc)

  v['ค่าทำความสะอาดเติมลูกน้ำ']  = withCommas(cleaning)
  v['ค่าทำความสะอาดตัวอักษร']    = bahtText(cleaning)

  v['จำนวนผู้พักอาศัย'] = String(ctx.contract.occupant_count ?? 1)

  // Management fees (common + parking = ทคส + ลอ)
  const mgmt = (contract.common_fee ?? 0) + (contract.parking_fee ?? 0)
  v['รวมทคสอและลอเติมลูกน้ำ'] = withCommas(mgmt)
  v['รวมทคสอและลอตัวอักษร']   = bahtText(mgmt)

  // ─── VAT / WHT calculations ──────────────────────────────────
  // Base amount: deposit for reservation/commission docs, otherwise rent
  const invoiceBase = deposit > 0 ? deposit : (contract.commission_net ?? rent)
  const vat7Amt  = contract.vat_7 ? Math.round(invoiceBase * 0.07 * 100) / 100 : 0
  const wht3Amt  = contract.wht_3 ? Math.round(invoiceBase * 0.03 * 100) / 100 : 0
  const netTotal = invoiceBase + vat7Amt - wht3Amt

  // Templates use both suffix-less and suffix "2" versions for same values
  for (const suffix of ['', '2'] as const) {
    v[`ก่อนvat7${suffix}`]             = withCommas(invoiceBase)
    v[`vat7${suffix}`]                 = withCommas(vat7Amt)
    v[`หัก3${suffix}`]                 = withCommas(wht3Amt)
    v[`ยอดรวมสุทธิ${suffix}`]          = withCommas(netTotal)
    v[`ยอดรวมสุทธิตัวอักษร${suffix}`] = bahtText(netTotal)
  }
  v['ยอดรวมสุทธิตัวอักษร2en'] = bahtTextEn(netTotal)
  v['ยอดรวมสุทธิตัวอักษรen']  = bahtTextEn(netTotal)
  v['รวมหัก']                 = withCommas(wht3Amt)
  v['รวมหักตัวอักษร']         = bahtText(wht3Amt)
  v['รวมหักตัวอักษรen']       = bahtTextEn(wht3Amt)

  // ─── Notice / Warning specific ───────────────────────────────
  v['เหตุผล']           = extra['เหตุผล']    ?? '-'
  v['รายละเอียด']       = extra['รายละเอียด'] ?? '-'

  // ─── Co-Agent specific ───────────────────────────────────────
  // These come from extra_vars entered by the agent in the wizard
  v['ชื่อ']             = extra['ชื่อ'] ?? '-'
  v['เลขเสียภาษี']     = extra['เลขเสียภาษี'] ?? '-'
  v['บ้านเลขที่']      = extra['บ้านเลขที่'] ?? '-'
  v['หมู่ที่']         = extra['หมู่ที่'] ?? ''
  v['ถนน']             = extra['ถนน'] ?? '-'
  v['แขวงตำบล']        = extra['แขวงตำบล'] ?? '-'
  v['เขตอำเภอ']        = extra['เขตอำเภอ'] ?? '-'
  v['จังหวัด']         = extra['จังหวัด'] ?? '-'
  v['บริษัท (ถ้ามี)'] = extra['บริษัท (ถ้ามี)'] ?? ''
  v['/2']              = withCommas(rent / 2)

  // ─── Image placeholders (left empty — no binary embedding) ───
  for (const imgVar of template.imageVars) {
    v[imgVar] = ''
  }

  // ─── extra_vars override (user-entered manual overrides) ─────
  // Merge last so user can override any computed value
  Object.assign(v, extra)

  return v
}
