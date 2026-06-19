// Compute all <<variable>> values for a contract template
// Maps DB fields + derived calculations → Record<string, string>

import type { Contract, Stock, Owner, Customer, Profile } from '@/types'
import {
  THAI_MONTHS, toThaiDate, toThaiDateFull, toEnDate, toEnDateLong,
  thaiYear, enYear, thaiMonthName, dayOfMonth,
  withCommas, formatNationalId, bahtText, bahtTextEn,
} from './formatters'
import type { TemplateDefinition } from './templateRegistry'
import { getEnglishAddress } from '@/lib/address'

const ROOM_TYPE_BILINGUAL: Record<string, { th: string; en: string }> = {
  'Studio':    { th: 'สตูดิโอ',    en: 'Studio' },
  '1BR':       { th: '1 ห้องนอน', en: '1 Bedroom' },
  '2BR':       { th: '2 ห้องนอน', en: '2 Bedrooms' },
  '3BR':       { th: '3 ห้องนอน', en: '3 Bedrooms' },
  'Penthouse': { th: 'เพนท์เฮาส์', en: 'Penthouse' },
  'อื่นๆ':    { th: 'อื่นๆ',      en: 'Other' },
}

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

  // Lease agreements are dated from the move-in date (effective tenancy start),
  // not from when the document was created in the system.
  const isLease = (contract as { contract_category?: string | null }).contract_category === 'lease'
  const effectiveDate = isLease && moveInDate ? moveInDate : contractDate

  v['thเมื่อวันที่']             = toThaiDate(contractDate)
  v['เมื่อวันที่']               = toThaiDate(contractDate)
  v['เมื่อวันที่ภาษาไทย']        = toThaiDate(contractDate)
  v['enเมื่อวันที่']             = toEnDate(contractDate)
  v['เมื่อวันที่ภาษาอังกฤษ']     = toEnDate(contractDate)
  v['ทำสัญญาวันที่ตัวอักษร']     = toThaiDateFull(effectiveDate)
  v['ทำสัญญาวันที่ภาษาไทย']      = toThaiDate(effectiveDate)
  v['ทำสัญญาวันที่ภาษาอังกฤษ']    = toEnDate(effectiveDate)
  v['ทำสัญญาวันที่ภาษาอังกฤษLong'] = toEnDateLong(effectiveDate)
  v['ปีที่ทำสัญญา']              = thaiYear(effectiveDate)
  v['ทำสัญญาเดือนอย่างเดียว']    = String(effectiveDate.getMonth() + 1)
  v['ทำสัญญาวันอย่างเดียว']      = String(effectiveDate.getDate())

  if (endDate) {
    v['ทำสัญญาวันที่สิ้นสุดตัวอักษร']   = toThaiDateFull(endDate)
    v['สิ้นสุดสัญญาวันที่']              = toThaiDate(endDate)
    v['ขยายเวลาสิ้นสุดเป็นวันที่']       = toThaiDate(endDate)
    v['enขยายเวลาสิ้นสุดเป็นวันที่']       = toEnDate(endDate)
    v['enขยายเวลาสิ้นสุดเป็นวันที่Long']  = toEnDateLong(endDate)
    v['enสิ้นสุดสัญญาวันที่']              = toEnDate(endDate)
    v['enสิ้นสุดสัญญาวันที่Long']          = toEnDateLong(endDate)
    v['ทำสัญญาวันที่สิ้นสุดภาษาไทย']    = toThaiDate(endDate)
    v['ทำสัญญาวันที่สิ้นสุดภาษาอังกฤษ'] = toEnDate(endDate)
    v['ทำสัญญาวันที่สิ้นสุดภาษาอังกฤษLong'] = toEnDateLong(endDate)
    v['ปีสิ้นสุด']                       = thaiYear(endDate)
    v['ปีที่สิ้นสุดไทย']                 = thaiYear(endDate)
    v['ปีที่สิ้นสุดอังกฤษ']              = enYear(endDate)
    v['เดือนที่สิ้นสุด']                 = thaiMonthName(endDate)
    v['เดือนสิ้นสุด']                    = thaiMonthName(endDate)
    v['วันที่สิ้นสุด']                   = dayOfMonth(endDate)
  }

  if (moveInDate) {
    v['เริ่มต่อสัญญา']       = toThaiDate(moveInDate)
    v['enเริ่มต่อสัญญา']     = toEnDate(moveInDate)
    v['enเริ่มต่อสัญญาLong'] = toEnDateLong(moveInDate)

    // Reservation Section 4: scheduled lease-signing / move-in date
    // Named distinctly from <<ทำสัญญาวันที่*>> (= contract.created_at) to avoid collision
    v['วันนัดทำสัญญาตัวอักษร']       = toThaiDateFull(moveInDate)
    v['วันนัดทำสัญญาภาษาไทย']        = toThaiDate(moveInDate)
    v['วันนัดทำสัญญาภาษาอังกฤษ']     = toEnDate(moveInDate)
    v['วันนัดทำสัญญาภาษาอังกฤษLong'] = toEnDateLong(moveInDate)
    v['วันเข้าอยู่ตัวอักษร']          = toThaiDateFull(moveInDate)
    v['วันเข้าอยู่ภาษาไทย']           = toThaiDate(moveInDate)
    v['วันเข้าอยู่ภาษาอังกฤษLong']   = toEnDateLong(moveInDate)
  }

  // Reservation expiry date (วันหมดอายุการจอง)
  const reservExpireDate = (contract as { reservation_expire_date?: string | null }).reservation_expire_date
  if (reservExpireDate) {
    const expDate = new Date(reservExpireDate)
    v['วันหมดอายุการจอง']                 = toThaiDate(expDate)
    v['วันหมดอายุการจองตัวอักษร']          = toThaiDateFull(expDate)
    v['วันหมดอายุการจองภาษาอังกฤษLong']   = toEnDateLong(expDate)
  }

  // Canonical renewal variables — original lease dates preserved in extra_vars at renewal creation
  const origLeaseStart = extra['orig_lease_start'] ? new Date(extra['orig_lease_start']) : null
  const origLeaseEnd   = extra['orig_lease_end']   ? new Date(extra['orig_lease_end'])   : null
  const origLeaseNo    = extra['orig_lease_no'] ?? ''

  v['old_lease_no']                 = origLeaseNo || '-'
  v['old_lease_start_date']         = origLeaseStart ? toThaiDate(origLeaseStart) : '-'
  v['old_lease_start_date_long_en'] = origLeaseStart ? toEnDateLong(origLeaseStart) : '-'
  v['old_lease_end_date']           = origLeaseEnd ? toThaiDate(origLeaseEnd) : '-'
  v['old_lease_end_date_long_en']   = origLeaseEnd ? toEnDateLong(origLeaseEnd) : '-'
  // Renewal period = contract.move_in_date / end_date (overwritten at renewal creation)
  v['renewal_start_date']           = moveInDate ? toThaiDate(moveInDate) : '-'
  v['renewal_start_date_long_en']   = moveInDate ? toEnDateLong(moveInDate) : '-'
  v['renewal_end_date']             = endDate ? toThaiDate(endDate) : '-'
  v['renewal_end_date_long_en']     = endDate ? toEnDateLong(endDate) : '-'
  // Backward-compat aliases for existing templates
  v['สัญญาเช่าฉบับเก่าลงวันที่']        = v['old_lease_start_date']!
  v['enสัญญาเช่าฉบับเก่าลงวันที่']      = origLeaseStart ? toEnDate(origLeaseStart) : '-'
  v['enสัญญาเช่าฉบับเก่าลงวันที่Long']  = v['old_lease_start_date_long_en']!

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
  v['พ้นกำหนดชำระได้']         = String(graceDays)

  // ─── Payment schedule ────────────────────────────────────────
  // <<1>>…<<12>> = Thai month names (for rental templates, fixed 12)
  // <<1+5>>…<<12+5>> = grace-period end labels
  // <<ตารางชำระ>> = full-term schedule rows (auto-expands to contract_months rows)

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
    v['ชื่อผู้ให้เช่า']              = ownerName
    v['ชื่อ - สกุล เจ้าของ']        = ownerName
    v['ฟอแมทบัตรประชาชนผู้ให้เช่า'] = formatNationalId(owner.national_id)
    v['ผู้ให้เช่าบัตรประชาชนเลขที่'] = owner.national_id?.replace(/\D/g, '') ?? '-'
    v['เลขเสียภาษี เจ้าของ']        = owner.national_id ?? '-'
    v['บ้านเลขที่ เจ้าของ']       = owner.address_no ?? '-'
    v['หมู่ที่ เจ้าของ']          = (owner.moo?.trim() || extra['หมู่ที่ เจ้าของ']?.trim()) || '-'
    v['ถนน เจ้าของ']             = owner.address_road?.trim() || '-'
    v['แขวงตำบล เจ้าของ']        = owner.subdistrict ?? '-'
    v['เขตอำเภอ เจ้าของ']        = owner.district ?? '-'
    v['จังหวัด เจ้าของ']         = owner.province ?? '-'
    v['รหัสไปรษณีย์ เจ้าของ']    = owner.zip ?? '-'
    // English address for owner (from CSV, not AI)
    const ownerEn = getEnglishAddress(owner.province ?? undefined, owner.district ?? undefined, owner.subdistrict ?? undefined)
    v['enแขวงตำบล เจ้าของ']  = ownerEn.subdistrict_en ?? owner.subdistrict ?? '-'
    v['enเขตอำเภอ เจ้าของ']  = ownerEn.district_en   ?? owner.district   ?? '-'
    v['enจังหวัด เจ้าของ']   = ownerEn.province_en   ?? owner.province   ?? '-'
    v['แขวงตำบลเจ้าของภาษาอังกฤษ'] = v['enแขวงตำบล เจ้าของ']!
    const _ownerEnName = [owner.first_name_en, owner.last_name_en].filter(Boolean).join(' ')
    v['ชื่อผู้ให้เช่าภาษาอังกฤษ'] = _ownerEnName || extra['ชื่อผู้ให้เช่าภาษาอังกฤษ'] || ownerName
    v['เขตอำเภอเจ้าของภาษาอังกฤษ'] = v['enเขตอำเภอ เจ้าของ']!
    v['จังหวัดเจ้าของภาษาอังกฤษ']  = v['enจังหวัด เจ้าของ']!

    // Bank info — prefer owner's then fall back to agent's
    v['บัญชีธนาคาร']             = owner.bank_name ?? agent?.bank_name ?? '-'
    v['บัญชีธนาคารภาษาอังกฤษ']  = extra['บัญชีธนาคารภาษาอังกฤษ'] ?? owner.bank_name ?? '-'
    v['เลขที่บัญชี']             = owner.bank_account_no ?? agent?.bank_account_no ?? '-'
    v['เลขบัญชี']                = v['เลขที่บัญชี']
    v['ชื่อบัญชีธนาคาร']         = owner.bank_account_name ?? '-'
    // Auto-computed bank logo token — use <<bankLogo>> in templates to embed logo inline.
    // Expands to {banklogo:BANKNAME} which inlineMd converts to <img>.
    const _bankName = v['บัญชีธนาคาร']
    v['bankLogo'] = (_bankName && _bankName !== '-') ? `{banklogo:${_bankName}}` : ''
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
    v['หมู่ที่ ลูกค้า']           = (customer.moo?.trim() || extra['หมู่ที่ ลูกค้า']?.trim()) || '-'
    v['ถนน ลูกค้า']              = customer.address_road?.trim() || '-'
    v['แขวงตำบล ลูกค้า']         = customer.subdistrict ?? '-'
    v['เขตอำเภอ ลูกค้า']         = customer.district ?? '-'
    v['จังหวัด ลูกค้า']          = customer.province ?? '-'
    v['รหัสไปรษณีย์ ลูกค้า']     = customer.zip ?? '-'
    // English address for customer
    const custEn = getEnglishAddress(customer.province ?? undefined, customer.district ?? undefined, customer.subdistrict ?? undefined)
    v['enแขวงตำบล ลูกค้า']  = custEn.subdistrict_en ?? customer.subdistrict ?? '-'
    v['enเขตอำเภอ ลูกค้า']  = custEn.district_en   ?? customer.district   ?? '-'
    v['enจังหวัด ลูกค้า']   = custEn.province_en   ?? customer.province   ?? '-'
    v['แขวงตำบลลูกค้าภาษาอังกฤษ'] = v['enแขวงตำบล ลูกค้า']!
    const _custEnName = [customer.first_name_en, customer.last_name_en].filter(Boolean).join(' ')
    v['ชื่อผู้เช่าภาษาอังกฤษ'] = _custEnName || extra['ชื่อผู้เช่าภาษาอังกฤษ'] || custName
    v['เขตอำเภอลูกค้าภาษาอังกฤษ'] = v['enเขตอำเภอ ลูกค้า']!
    v['จังหวัดลูกค้าภาษาอังกฤษ']  = v['enจังหวัด ลูกค้า']!
  }

  // ─── Stock / Unit ────────────────────────────────────────────

  if (stock) {
    v['project']               = stock.project_name ?? '-'
    v['view']                  = stock.project_name ?? '-'
    v['showp']                 = stock.project_name ?? '-'
    v['โครงการ']               = stock.project_name ?? '-'
    v['เลขที่ห้องชุด']         = stock.unit_no ?? '-'
    v['เลขที่ห้อง']            = stock.unit_no ?? '-'
    v['ขนาด']                  = stock.size_sqm != null ? String(stock.size_sqm) : '-'
    v['ชั้น']                  = stock.floor != null ? String(stock.floor) : '-'
    v['ตึก']                   = stock.building ?? extra['ตึก'] ?? '-'
    const _roomBilingual = ROOM_TYPE_BILINGUAL[stock.room_type ?? '']
    const _roomTh = _roomBilingual?.th ?? stock.room_type ?? '-'
    const _roomEn = _roomBilingual?.en ?? stock.room_type ?? '-'
    // ประเภทห้อง: Thai-only contract → Thai label; otherwise bilingual "EN / TH"
    const _thaiOnly = (template.language ?? contract.language_version) === 'th'
    v['ประเภทห้อง']            = _roomTh === '-' ? '-'
      : _thaiOnly ? _roomTh
      : _roomEn !== _roomTh ? `${_roomEn} / ${_roomTh}` : _roomTh
    v['ประเภทห้องภาษาไทย']    = _roomTh
    v['ประเภทห้องภาษาอังกฤษ'] = _roomEn
    // Address from linked project (joined as project?)
    const proj = (stock as Stock & { project?: { name_en?: string; address_road?: string; subdistrict?: string; district?: string; province?: string; zip?: string } }).project
    v['ชื่อโครงการภาษาอังกฤษ'] = proj?.name_en ?? stock.project_name ?? '-'
    v['ซอย']                   = extra['ซอย'] ?? '-'
    v['ถนนโครงการ']            = proj?.address_road ?? extra['ถนนโครงการ'] ?? '-'
    // Combined road + soi that drops a missing part instead of printing "-"
    // (avoids "ถนนเพชรเกษม -" when there is no soi).
    v['ถนนซอยโครงการ']        = [proj?.address_road?.trim(), (extra['ซอย'] ?? '').trim()]
      .filter(Boolean).join(' ') || '-'
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
    v['แขวงตำบลโครงการภาษาอังกฤษ'] = v['enแขวงตำบล']!
    v['เขตอำเภอโครงการภาษาอังกฤษ'] = v['enเขตอำเภอ']!
    v['จังหวัดโครงการภาษาอังกฤษ']  = v['enจังหวัด']!
  }

  // ─── Agent ───────────────────────────────────────────────────

  v['agent'] = agent?.company_name ?? agent?.name ?? '-'

  // ─── Contract reference ──────────────────────────────────────

  v['เลขที่สัญญา'] = (contract as { code?: string }).code ?? extra['เลขที่สัญญา'] ?? contract.id ?? '-'

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
  v['ค่าเช่าx12เติมลูกน้ำ']       = withCommas(rent * 12)

  // Dynamic full-term schedule block — expands to N rows matching contract_months.
  // substituteVars runs before parseBlocks so multi-line expansion into table rows works.
  if (template.hasPaymentSchedule && moveInDate && rent > 0) {
    const scheduleRows: string[] = []
    for (let n = 1; n <= months; n++) {
      const baseMonth = moveInDate.getMonth() + (n - 1)
      const year = moveInDate.getFullYear() + Math.floor(baseMonth / 12)
      const month = baseMonth % 12
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const day = Math.min(paymentDay, lastDayOfMonth)
      const dueDate = new Date(year, month, day)
      const payableUntil = new Date(dueDate.getTime())
      payableUntil.setDate(payableUntil.getDate() + graceDays)
      const dueCell = `${toEnDateLong(dueDate)} {th}(${toThaiDate(dueDate)}){/th}`
      const payCell = `${toEnDateLong(payableUntil)} {th}(${toThaiDate(payableUntil)}){/th}`
      scheduleRows.push(`| ${n} | ${dueCell} | ${payCell} | ${withCommas(rent)} |`)
    }
    v['ตารางชำระ']        = scheduleRows.join('\n')
    v['รวมค่าเช่าทั้งหมด'] = withCommas(rent * months)
  }

  // ─── Reservation financial model ─────────────────────────────
  // booking_amount  = เงินมัดจำจอง ที่ลูกค้าจ่ายจริงวันจอง (may be a partial amount)
  // deposit_amount  = เงินประกัน (security deposit, rent × deposit_months, default 2)
  // Full obligation at lease-signing = security deposit (deposit_months) +
  //   one-month booking/advance. Subtract whatever booking was already paid;
  //   any shortfall is collected on the lease-signing day.
  //   e.g. rent 8000, deposit 2mo, booking paid 3000 →
  //        8000×3 − 3000 = 21000
  const bookingAmt = (contract as { booking_amount?: number | null }).booking_amount ?? 0
  const depositMths = contract.deposit_months ?? 2
  // Reservation doc estimates the lease-day total (deposit + first month −
  // booking already paid). The LEASE document itself collects only the
  // security deposit on signing day = rent × deposit_months.
  const _isReservationDoc = contract.doc_type === 'reservation'
    || (contract as { contract_category?: string }).contract_category === 'reservation'
  const contractDayPayment = _isReservationDoc
    ? Math.max(0, rent * (depositMths + 1) - bookingAmt)
    : rent * depositMths

  v['เงินจอง']               = withCommas(bookingAmt)
  v['เงินจองตัวอักษร']        = bahtText(bookingAmt)
  v['เงินจองภาษาอังกฤษ']     = bahtTextEn(bookingAmt)
  v['booking_amount']         = withCommas(bookingAmt)

  v['เงินประกันสัญญา']              = withCommas(deposit)
  v['เงินประกันสัญญาตัวอักษร']       = bahtText(deposit)
  v['จำนวนเดือนเงินประกัน']          = String(depositMths)

  v['จำนวนเงินวันทำสัญญา']              = withCommas(contractDayPayment)
  v['จำนวนเงินวันทำสัญญาตัวอักษร']      = bahtText(contractDayPayment)
  v['จำนวนเงินวันทำสัญญาภาษาอังกฤษ']   = bahtTextEn(contractDayPayment)

  // ─── Standard monetary variables ─────────────────────────────
  const securityDepositAmt = (contract as { security_deposit?: number | null }).security_deposit ?? null
  const securityDepositMonths = rent > 0 && securityDepositAmt != null && securityDepositAmt > 0
    ? Math.round((securityDepositAmt / rent) * 10) / 10
    : depositMths

  v['security_deposit']        = securityDepositAmt != null ? withCommas(securityDepositAmt) : '-'
  v['security_deposit_months'] = String(securityDepositMonths)

  v['ค่าปรับเติมลูกน้ำ']   = withCommas(penalty)
  v['ค่าปรับตัวอักษร']     = bahtText(penalty)
  v['ค่าปรับตัวอักษรen']  = bahtTextEn(penalty)

  v['จำนวนแอร์']                  = String(acCount)
  v['ค่าล้างแอร์เติมลูกน้ำ']      = withCommas(acPerUnit)
  v['ค่าล้างแอร์ตัวอักษร']        = bahtText(acPerUnit)
  v['ค่าล้างแอร์ตัวอักษรen']      = bahtTextEn(acPerUnit)
  const totalAc = acCount * acPerUnit
  v['รวมค่าล้างแอร์เติมลูกน้ำ']  = withCommas(totalAc)
  v['รวมค่าล้างแอร์ตัวอักษร']    = bahtText(totalAc)
  v['รวมค่าล้างแอร์ตัวอักษรen']  = bahtTextEn(totalAc)
  v['รวมแอร์เติมลูกน้ำ']          = withCommas(totalAc)

  v['ค่าทำความสะอาดเติมลูกน้ำ']  = withCommas(cleaning)
  v['ค่าทำความสะอาดตัวอักษร']    = bahtText(cleaning)
  v['ค่าทำความสะอาดตัวอักษรen']  = bahtTextEn(cleaning)
  const grandTotal = cleaning + totalAc
  v['รวมทำความสะอาดและล้างแอร์เติมลูกน้ำ'] = withCommas(grandTotal)
  v['รวมทำความสะอาดและล้างแอร์ตัวอักษร']  = bahtText(grandTotal)
  v['รวมทำความสะอาดและล้างแอร์ตัวอักษรen'] = bahtTextEn(grandTotal)

  v['จำนวนผู้พักอาศัย'] = String(ctx.contract.occupant_count ?? 1)

  // Management fees (common + parking = ทคส + ลอ)
  const mgmt = (contract.common_fee ?? 0) + (contract.parking_fee ?? 0)
  v['รวมทคสอและลอเติมลูกน้ำ'] = withCommas(mgmt)
  v['รวมทคสอและลอตัวอักษร']   = bahtText(mgmt)

  // ─── VAT / WHT calculations ──────────────────────────────────
  // Invoice/receipt base amount depends on the document type:
  //   reservation → booking deposit, deposit → security deposit,
  //   commission  → commission_net (the only type where VAT/WHT applies).
  const _docTypeForInvoice = contract.doc_type ?? ''
  const _securityForInvoice = (contract as { security_deposit?: number | null }).security_deposit ?? deposit
  let invoiceBase: number
  if (_docTypeForInvoice.includes('reservation')) {
    invoiceBase = bookingAmt > 0 ? bookingAmt : rent
  } else if (_docTypeForInvoice.includes('deposit')) {
    invoiceBase = _securityForInvoice
  } else {
    invoiceBase = contract.commission_net ?? 0
  }
  // invoice_th_en.md is shared by invoice_reservation/receipt_reservation/
  // invoice_deposit/receipt_deposit and prints <<จำนวนเงินวันทำสัญญา>> as the
  // single line-item amount. For those 4 doc types it must equal the same
  // base used for the subtotal (invoiceBase) — NOT the lease-signing-day
  // estimate computed above (which only applies to the reservation contract
  // itself, doc_type === 'reservation').
  if (['invoice_reservation', 'receipt_reservation', 'invoice_deposit', 'receipt_deposit'].includes(_docTypeForInvoice)) {
    v['จำนวนเงินวันทำสัญญา']            = withCommas(invoiceBase)
    v['จำนวนเงินวันทำสัญญาตัวอักษร']    = bahtText(invoiceBase)
    v['จำนวนเงินวันทำสัญญาภาษาอังกฤษ'] = bahtTextEn(invoiceBase)
  }

  // VAT/WHT only applies to commission amounts — NEVER to deposit, rent, or tenant-facing amounts.
  const _isCommissionDoc = _docTypeForInvoice.includes('commission')
  const vat7Amt  = (_isCommissionDoc && contract.vat_7) ? Math.round(invoiceBase * 0.07 * 100) / 100 : 0
  const wht3Amt  = (_isCommissionDoc && contract.wht_3) ? Math.round(invoiceBase * 0.03 * 100) / 100 : 0
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

  // ─── Invoice / Receipt specific ──────────────────────────────
  const docType = contract.doc_type ?? ''
  const unitRef = [stock?.project_name, stock?.unit_no ? `(${stock.unit_no})` : ''].filter(Boolean).join(' ')
  if (docType.includes('reservation')) {
    const bmLabel = bookingAmt > 0 && rent > 0 ? `${Math.round((bookingAmt / rent) * 10) / 10} month(s)` : '1 month'
    v['รายละเอียดใบแจ้งหนี้'] = `ค่ามัดจำการจอง / Booking Deposit (${bmLabel}) — ${unitRef}`
  } else if (docType.includes('deposit')) {
    const sdAmt = securityDepositAmt ?? deposit
    const sdm = rent > 0 && sdAmt > 0 ? Math.round((sdAmt / rent) * 10) / 10 : securityDepositMonths
    const sdmLabel = sdm === 1 ? '1 month' : `${sdm} months`
    v['รายละเอียดใบแจ้งหนี้'] = `เงินประกันสัญญา ${sdm} เดือน / Security Deposit (${sdmLabel}) — ${unitRef}`
  } else {
    v['รายละเอียดใบแจ้งหนี้'] = extra['รายละเอียดใบแจ้งหนี้'] ?? `ค่าเช่า / Rental Fee — ${unitRef}`
  }

  const paymentMethodMap: Record<string, string> = {
    cash:     'เงินสด / Cash',
    transfer: 'โอนเงิน / Bank Transfer',
    cheque:   'เช็ค / Cheque',
    credit:   'บัตรเครดิต / Credit Card',
  }
  const rawMethod = (contract as { payment_method?: string }).payment_method ?? extra['วิธีชำระเงิน'] ?? ''
  v['วิธีชำระเงิน'] = paymentMethodMap[rawMethod] ?? (rawMethod || 'โอนเงิน / Bank Transfer')

  // ─── Notice / Warning specific ───────────────────────────────
  v['เหตุผล']           = extra['เหตุผล']    ?? '-'
  v['รายละเอียด']       = extra['รายละเอียด'] ?? '-'

  // ─── Co-Agent specific ───────────────────────────────────────
  // co_agent_info JSONB stores the profile snapshot saved at document creation.
  // Fall back to extra_vars for older documents created before this schema.
  const coAgentInfo: Record<string, string> =
    (contract as { co_agent_info?: Record<string, string> | null }).co_agent_info ?? {}
  const coiGet = (key: string) => coAgentInfo[key] ?? extra[key] ?? '-'
  const coiGetOpt = (key: string) => coAgentInfo[key] ?? extra[key] ?? ''

  v['ชื่อ']             = coiGet('ชื่อ')
  v['เลขเสียภาษี']     = coiGet('เลขเสียภาษี')
  v['บ้านเลขที่']      = coAgentInfo['บ้านเลขที่'] ?? coAgentInfo['ที่อยู่'] ?? extra['บ้านเลขที่'] ?? '-'
  v['หมู่ที่']         = coiGetOpt('หมู่ที่')
  v['ถนน']             = coiGet('ถนน')
  v['แขวงตำบล']        = coiGet('แขวงตำบล')
  v['เขตอำเภอ']        = coiGet('เขตอำเภอ')
  v['จังหวัด']         = coiGet('จังหวัด')
  v['บริษัท (ถ้ามี)'] = coiGetOpt('บริษัท (ถ้ามี)')
  v['/2']              = withCommas(rent / 2)
  v['ธนาคาร Co-Agent']      = coAgentInfo['ธนาคาร'] ?? extra['ธนาคาร Co-Agent'] ?? '-'
  v['ชื่อบัญชี Co-Agent']   = coAgentInfo['ชื่อบัญชี'] ?? extra['ชื่อบัญชี Co-Agent'] ?? '-'
  v['เลขบัญชี Co-Agent']    = coAgentInfo['เลขบัญชี'] ?? extra['เลขบัญชี Co-Agent'] ?? '-'
  v['คอมมิชชั่น%']          = (() => {
    const rp = (contract as { commission_rate_pct?: number | null }).commission_rate_pct
    return rp != null ? `${rp}%` : (extra['คอมมิชชั่น%'] ?? '-')
  })()
  v['ค่าธรรมเนียม Co-Agent'] = extra['ค่าธรรมเนียม Co-Agent'] || withCommas(rent / 2)

  // Payment direction: whose bank receives the commission payment
  const payDir = (contract as { co_agent_payment_direction?: string | null }).co_agent_payment_direction ?? ''
  const dirLabel = payDir === 'agent_to_co_agent'
    ? 'Agent → Co-Agent (Agent ชำระให้ Co-Agent)'
    : payDir === 'co_agent_to_agent'
    ? 'Co-Agent → Agent (Co-Agent ชำระให้ Agent)'
    : extra['ทิศทางชำระ'] ?? ''
  v['ทิศทางชำระ'] = dirLabel
  // Recipient bank: Co-Agent bank if Agent pays Co-Agent, Agent bank if Co-Agent pays Agent
  if (payDir === 'co_agent_to_agent') {
    v['ธนาคารผู้รับ']      = agent?.bank_name ?? '-'
    v['ชื่อบัญชีผู้รับ']  = agent?.bank_account_name ?? '-'
    v['เลขบัญชีผู้รับ']   = extra['เลขบัญชีผู้รับ'] ?? '-'
  } else {
    v['ธนาคารผู้รับ']      = v['ธนาคาร Co-Agent']!
    v['ชื่อบัญชีผู้รับ']  = v['ชื่อบัญชี Co-Agent']!
    v['เลขบัญชีผู้รับ']   = v['เลขบัญชี Co-Agent']!
  }

  // ─── Commission-specific ──────────────────────────────────────
  {
    const commFromOwner   = (contract as { commission_from_owner?: number | null }).commission_from_owner ?? null
    const commFromCust    = (contract as { commission_from_customer?: number | null }).commission_from_customer ?? null
    const commNetAmt      = (contract as { commission_net?: number | null }).commission_net ?? null
    const commOwnerBase   = commFromOwner ?? commNetAmt ?? 0

    v['commission_from_owner']         = commOwnerBase > 0 ? withCommas(commOwnerBase) : '-'
    v['commission_from_owner_text']    = commOwnerBase > 0 ? bahtText(commOwnerBase) : '-'
    v['commission_from_owner_en']      = commOwnerBase > 0 ? bahtTextEn(commOwnerBase) : '-'
    v['commission_from_customer']      = commFromCust != null && commFromCust > 0 ? withCommas(commFromCust) : '-'
    v['commission_from_customer_text'] = commFromCust != null && commFromCust > 0 ? bahtText(commFromCust) : '-'
    v['commission_net']                = commNetAmt != null ? withCommas(commNetAmt) : '-'

    const commVat7 = contract.vat_7 ? Math.round(commOwnerBase * 0.07 * 100) / 100 : 0
    const commWht3 = contract.wht_3 ? Math.round(commOwnerBase * 0.03 * 100) / 100 : 0
    const commTotal = commOwnerBase + commVat7 - commWht3

    v['commission_vat7']       = contract.vat_7 && commVat7 > 0 ? withCommas(commVat7) : '-'
    v['commission_wht3']       = contract.wht_3 && commWht3 > 0 ? withCommas(commWht3) : '-'
    v['commission_total']      = commTotal > 0 ? withCommas(commTotal) : '-'
    v['commission_total_text'] = commTotal > 0 ? bahtText(commTotal) : '-'
    v['commission_total_en']   = commTotal > 0 ? bahtTextEn(commTotal) : '-'
  }

  // ─── Agent bank — dedicated (never falls back to owner) ───────
  v['agent_bank']         = agent?.bank_name ?? '-'
  v['agent_account_name'] = agent?.bank_account_name ?? '-'
  v['agent_account_no']   = agent?.bank_account_no ?? '-'
  v['agent_name']         = agent?.name ?? agent?.company_name ?? '-'

  // ─── Image placeholders (left empty — no binary embedding) ───
  for (const imgVar of template.imageVars) {
    v[imgVar] = ''
  }

  // ─── extra_vars override (user-entered manual overrides) ─────
  // Merge last so user can override any computed value
  Object.assign(v, extra)

  return v
}
