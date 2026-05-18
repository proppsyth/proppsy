import path from 'path'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import type { ContractDocType } from '@/types'

// ─── Font Registration ────────────────────────────────────────

const fontsDir = path.join(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(fontsDir, 'Sarabun-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'Sarabun-Bold.ttf'), fontWeight: 700 },
  ],
})

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: 'Sarabun', fontSize: 9.5, paddingTop: 36, paddingBottom: 68, paddingHorizontal: 45, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: '#2563EB' },
  logo: { width: 56, height: 56, objectFit: 'contain' },
  docTitle: { fontSize: 14, fontWeight: 700, color: '#2563EB', textAlign: 'right' },
  docMeta: { fontSize: 8.5, color: '#555', marginTop: 2, textAlign: 'right' },
  agentName: { fontSize: 9.5, fontWeight: 700, marginTop: 3 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 9.5, fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '3 7', marginBottom: 5 },
  row: { flexDirection: 'row', marginBottom: 2.5 },
  label: { width: '36%', color: '#555', fontSize: 8.5 },
  value: { flex: 1, fontWeight: 700 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#ddd', marginVertical: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  finLabel: { color: '#555', fontSize: 8.5, flex: 1 },
  finValue: { fontWeight: 700, textAlign: 'right' },
  clause: { fontSize: 8.5, color: '#333', lineHeight: 1.5, marginBottom: 2 },
  clauseIndent: { fontSize: 8.5, color: '#333', lineHeight: 1.5, marginBottom: 1.5, marginLeft: 10 },
  sigSection: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24 },
  sigBox: { alignItems: 'center', width: '28%' },
  sigLine: { width: '100%', borderBottomWidth: 0.8, borderBottomColor: '#333', marginBottom: 3, marginTop: 24 },
  sigLabel: { fontSize: 8.5, color: '#555', textAlign: 'center' },
  sigImage: { width: 72, height: 28, objectFit: 'contain', marginTop: 6 },
  stamp: { fontSize: 7.5, color: '#aaa', textAlign: 'center', marginTop: 20 },
  highlight: { color: '#1D4ED8', fontWeight: 700 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#EFF6FF', paddingVertical: 4, paddingHorizontal: 6, marginBottom: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.3, borderBottomColor: '#eee' },
  tableCell: { flex: 1, fontSize: 8.5 },
  tableCellCenter: { flex: 1, fontSize: 8.5, textAlign: 'center' },
  tableCellRight: { flex: 1, fontSize: 8.5, textAlign: 'right' },
  bold: { fontWeight: 700 },
  totRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4, borderTopWidth: 0.8, borderTopColor: '#333', marginTop: 4 },
})

// ─── Types ────────────────────────────────────────────────────

export interface ContractData {
  id: string
  doc_type: ContractDocType
  created_at: string
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
  vat_7?: boolean
  wht_3?: boolean
  water_unit_price?: number | null
  electric_unit_price?: number | null
  internet_fee?: number | null
  common_fee?: number | null
  parking_fee?: number | null
  payment_date?: string | null
  payment_method?: string | null
  bank_ref?: string | null
  reservation_expire_date?: string | null
  payment_grace_days?: number | null
  payment_day_of_month?: number | null
  commission_rate_pct?: number | null
  commission_from_owner?: number | null
  commission_from_customer?: number | null
}

export interface StockData {
  project_name?: string | null
  unit_no?: string | null
  building?: string | null
  floor?: number | null
  room_type?: string | null
  size_sqm?: number | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
}

export interface PersonData {
  prefix?: string | null
  first_name_th?: string | null
  last_name_th?: string | null
  national_id?: string | null
  phone?: string | null
  address_no?: string | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
  signature_url?: string | null
  bank_name?: string | null
  bank_account_no?: string | null
  bank_account_name?: string | null
}

export interface AgentData {
  name?: string | null
  company_name?: string | null
  phone?: string | null
  logo_url?: string | null
  signature_url?: string | null
  bank_name?: string | null
  bank_account_no?: string | null
  bank_account_name?: string | null
  tax_id?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const DOC_LABELS: Record<ContractDocType, string> = {
  rental: 'สัญญาเช่าที่พักอาศัย',
  reservation: 'สัญญาจองที่พัก',
  renewal: 'สัญญาต่ออายุการเช่า',
  cancellation: 'หนังสือยกเลิกสัญญา',
  termination: 'หนังสือบอกเลิกสัญญา',
  notice: 'หนังสือแจ้งความประสงค์',
  receipt_book: 'ใบเสร็จรับเงิน',
  receipt_rent: 'ใบเสร็จค่าเช่า',
  commission: 'ใบเสร็จค่านายหน้า',
  invoice_reservation: 'ใบแจ้งหนี้เงินจอง',
  receipt_reservation: 'ใบเสร็จเงินจอง',
  invoice_deposit: 'ใบแจ้งหนี้เงินประกัน',
  receipt_deposit: 'ใบเสร็จเงินประกัน',
  commission_confirm: 'เอกสารยืนยันค่าคอมมิชชัน',
  co_agent: 'สัญญา Co-Agent',
  end_contract: 'หนังสือสิ้นสุดสัญญา',
  warning: 'หนังสือเตือน',
}

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`
}

// Thai number-to-words (บาทถ้วน)
function bahtText(amount: number): string {
  if (!amount || amount === 0) return 'ศูนย์บาทถ้วน'
  const ones = ['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า']
  const units = ['','สิบ','ร้อย','พัน','หมื่น','แสน']

  function chunk(n: number): string {
    if (n === 0) return ''
    const digits = String(n).padStart(6, '0').split('').map(Number)
    let res = ''
    for (let i = 0; i < 6; i++) {
      const d = digits[i]!
      const pos = 5 - i
      if (d === 0) continue
      if (pos === 1) {
        if (d === 1) res += 'สิบ'
        else if (d === 2) res += 'ยี่สิบ'
        else res += (ones[d] ?? '') + 'สิบ'
      } else if (pos === 0 && d === 1 && n > 1) {
        res += 'เอ็ด'
      } else {
        res += (ones[d] ?? '') + (units[pos] ?? '')
      }
    }
    return res
  }

  const baht = Math.floor(amount)
  const satang = Math.round((amount - baht) * 100)
  let result = ''
  if (baht >= 1000000) {
    result += chunk(Math.floor(baht / 1000000)) + 'ล้าน'
    const rest = baht % 1000000
    if (rest > 0) result += chunk(rest)
  } else {
    result += chunk(baht)
  }
  result += 'บาท'
  result += satang > 0 ? chunk(satang) + 'สตางค์' : 'ถ้วน'
  return result
}

function formatNationalId(id?: string | null): string {
  if (!id) return '-'
  const d = id.replace(/\D/g, '')
  if (d.length !== 13) return id
  return `${d[0]}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10,12)}-${d[12]}`
}

function fullName(p: PersonData): string {
  return [p.prefix, p.first_name_th, p.last_name_th].filter(Boolean).join(' ') || '-'
}

function fullAddr(p: PersonData): string {
  return [
    p.address_no && `${p.address_no}`,
    p.subdistrict && `แขวง/ตำบล ${p.subdistrict}`,
    p.district && `เขต/อำเภอ ${p.district}`,
    p.province && `จังหวัด ${p.province}`,
    p.zip,
  ].filter(Boolean).join(' ') || '-'
}

function generatePaymentSchedule(
  moveInDate: string,
  months: number,
  payDay: number,
  graceDays: number,
): { seq: number; monthName: string; due: string }[] {
  const result = []
  const base = new Date(moveInDate)
  for (let i = 0; i < months; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
    const monthName = `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
    result.push({ seq: i + 1, monthName, due: `${payDay} - ${payDay + graceDays}` })
  }
  return result
}

function paymentMethodLabel(m?: string | null): string {
  if (m === 'cash') return 'เงินสด'
  if (m === 'cheque') return 'เช็ค'
  return 'โอนเงิน'
}

// ─── Sub-components ───────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  )
}

function FinRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.finRow}>
      <Text style={s.finLabel}>{label}</Text>
      <Text style={s.finValue}>{value}</Text>
    </View>
  )
}

interface HeaderProps {
  title: string
  id: string
  date: string
  agent: AgentData
}

function DocHeader({ title, id, date, agent }: HeaderProps) {
  return (
    <View style={s.header}>
      <View>
        {agent.logo_url && <Image src={agent.logo_url} style={s.logo} />}
        <Text style={s.agentName}>{agent.company_name ?? agent.name ?? 'Proppsy'}</Text>
        {agent.phone && <Text style={s.docMeta}>{agent.phone}</Text>}
      </View>
      <View>
        <Text style={s.docTitle}>{title}</Text>
        <Text style={s.docMeta}>เลขที่: <Text style={s.highlight}>{id}</Text></Text>
        <Text style={s.docMeta}>วันที่: {date}</Text>
      </View>
    </View>
  )
}

interface PartyBlockProps {
  person: PersonData
  label: string
  role: string
}

function PartyBlock({ person, label, role }: PartyBlockProps) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{label}</Text>
      <Row label="ชื่อ-นามสกุล" value={fullName(person)} />
      <Row label="เลขบัตรประชาชน" value={formatNationalId(person.national_id)} />
      {person.phone && <Row label="โทรศัพท์" value={person.phone} />}
      <Row label="ที่อยู่" value={fullAddr(person)} />
      <Text style={{ ...s.clause, marginTop: 2 }}>
        ซึ่งต่อไปนี้เรียกว่า "{role}"
      </Text>
    </View>
  )
}

interface SigProps {
  owner?: PersonData | null
  customer?: PersonData | null
  agent: AgentData
  ownerLabel?: string
  customerLabel?: string
  showAgent?: boolean
}

function SigSection({ owner, customer, agent, ownerLabel = 'ผู้ให้เช่า', customerLabel = 'ผู้เช่า', showAgent = false }: SigProps) {
  return (
    <View style={s.sigSection}>
      {owner && (
        <View style={s.sigBox}>
          {owner.signature_url && <Image src={owner.signature_url} style={s.sigImage} />}
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>{ownerLabel}</Text>
          <Text style={{ ...s.sigLabel, fontWeight: 700 }}>{fullName(owner)}</Text>
        </View>
      )}
      {customer && (
        <View style={s.sigBox}>
          {customer.signature_url && <Image src={customer.signature_url} style={s.sigImage} />}
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>{customerLabel}</Text>
          <Text style={{ ...s.sigLabel, fontWeight: 700 }}>{fullName(customer)}</Text>
        </View>
      )}
      {showAgent && (
        <View style={s.sigBox}>
          {agent.signature_url && <Image src={agent.signature_url} style={s.sigImage} />}
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>ตัวแทน / นายหน้า</Text>
          <Text style={{ ...s.sigLabel, fontWeight: 700 }}>{agent.name ?? '-'}</Text>
        </View>
      )}
    </View>
  )
}

interface SigFooterProps {
  owner?: PersonData | null
  customer?: PersonData | null
  agent: AgentData
  agentOnly?: boolean
}

interface FooterSlot {
  sigUrl?: string | null
  name: string
  role: string
}

function SigFooter({ owner, customer, agent, agentOnly = false }: SigFooterProps) {
  const slots: FooterSlot[] = agentOnly
    ? [{ sigUrl: agent.signature_url, name: agent.name ?? '-', role: 'ตัวแทน / นายหน้า' }]
    : ([
        owner    ? { sigUrl: owner.signature_url,    name: fullName(owner),    role: 'ผู้ให้เช่า' } : null,
        customer ? { sigUrl: customer.signature_url, name: fullName(customer), role: 'ผู้เช่า'    } : null,
      ] as Array<FooterSlot | null>).filter((s): s is FooterSlot => s !== null)

  if (slots.length === 0) return null

  return (
    <View
      fixed
      style={{
        position: 'absolute',
        bottom: 8,
        left: 45,
        right: 45,
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 0.5,
        borderTopColor: '#ccc',
        paddingTop: 4,
      }}
    >
      {slots.map((slot, i) => (
        <View key={i} style={{ alignItems: 'center', minWidth: 90 }}>
          {slot.sigUrl
            ? <Image src={slot.sigUrl} style={{ width: 80, height: 26, objectFit: 'contain', marginBottom: 2 }} />
            : <View style={{ height: 26, marginBottom: 2 }} />
          }
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: '#222', textAlign: 'center' }}>{slot.name}</Text>
          <Text style={{ fontSize: 6.5, color: '#999', textAlign: 'center' }}>({slot.role})</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Invoice / Receipt page (reusable) ───────────────────────

interface InvoiceProps {
  docTitle: string
  id: string
  date: string
  agent: AgentData
  owner?: PersonData | null
  customer?: PersonData | null
  stock?: StockData | null
  amount: number
  description: string
  vat_7?: boolean
  wht_3?: boolean
  isReceipt?: boolean
  paymentMethod?: string | null
  bankRef?: string | null
}

function InvoiceReceiptPage({
  docTitle, id, date, agent, owner, customer, stock,
  amount, description, vat_7, wht_3, isReceipt, paymentMethod, bankRef,
}: InvoiceProps) {
  const vatAmt = vat_7 ? amount * 0.07 : 0
  const whtAmt = wht_3 ? amount * 0.03 : 0
  const total = amount + vatAmt - whtAmt

  return (
    <Page size="A4" style={s.page}>
      <DocHeader title={docTitle} id={id} date={date} agent={agent} />

      <View style={s.section}>
        {customer && <Row label="ชื่อลูกค้า" value={fullName(customer)} />}
        {customer && <Row label="ที่อยู่ลูกค้า" value={fullAddr(customer)} />}
        {owner && <Row label="ผู้ออก" value={fullName(owner)} />}
        {owner && <Row label="เลขประจำตัว" value={formatNationalId(owner.national_id)} />}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>รายละเอียด</Text>
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableCell, flex: 0.5 }}>ลำดับ</Text>
          <Text style={{ ...s.tableCell, flex: 3 }}>รายละเอียด</Text>
          <Text style={{ ...s.tableCellRight, flex: 1 }}>จำนวนเงิน</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={{ ...s.tableCell, flex: 0.5 }}>1</Text>
          <Text style={{ ...s.tableCell, flex: 3 }}>{description}</Text>
          <Text style={{ ...s.tableCellRight, flex: 1 }}>{fmt(amount)}</Text>
        </View>
        <View style={{ ...s.finRow, marginTop: 6 }}>
          <Text style={s.finLabel}>รวม</Text>
          <Text style={s.finValue}>{fmt(amount)} บาท</Text>
        </View>
        {vat_7 && <FinRow label="ภาษีมูลค่าเพิ่ม 7%" value={`${fmt(vatAmt)} บาท`} />}
        {wht_3 && <FinRow label="หักภาษี ณ ที่จ่าย 3%" value={`(${fmt(whtAmt)}) บาท`} />}
        <View style={s.totRow}>
          <Text style={{ ...s.finValue, fontSize: 10.5 }}>
            จำนวนเงินรวมทั้งสิ้น {fmt(total)} บาท ({bahtText(total)})
          </Text>
        </View>
      </View>

      {isReceipt && (
        <View style={{ ...s.section, marginTop: 4 }}>
          <Text style={s.sectionTitle}>ช่องทางการชำระเงิน</Text>
          <Row label="วิธีชำระ" value={paymentMethodLabel(paymentMethod)} />
          {bankRef && <Row label="เลขอ้างอิง / เลขเช็ค" value={bankRef} />}
        </View>
      )}

      {!isReceipt && (
        <View style={{ ...s.section, marginTop: 4 }}>
          <Text style={s.sectionTitle}>ช่องทางการชำระเงิน</Text>
          {owner?.bank_name && <Row label="ธนาคาร" value={owner.bank_name} />}
          {owner?.bank_account_no && <Row label="เลขบัญชี" value={owner.bank_account_no} />}
          {owner?.bank_account_name && <Row label="ชื่อบัญชี" value={owner.bank_account_name} />}
        </View>
      )}

      <SigSection owner={owner} customer={customer} agent={agent}
        ownerLabel={isReceipt ? 'ผู้ออกใบเสร็จ' : 'ผู้ออกใบแจ้งหนี้'}
        customerLabel="ผู้ชำระเงิน"
      />
      <Text style={s.stamp}>{docTitle} • {id} • {date}</Text>
      <SigFooter owner={owner} customer={customer} agent={agent} />
    </Page>
  )
}

// ─── สัญญาจอง page ────────────────────────────────────────────

interface PageProps {
  c: ContractData
  stock?: StockData | null
  owner?: PersonData | null
  customer?: PersonData | null
  agent: AgentData
}

function ReservationContractPage({ c, stock, owner, customer, agent }: PageProps) {
  const date = c.move_in_date ? fmtDate(c.move_in_date) : fmtDate(c.created_at)
  const reserveAmt = c.rent_price ?? 0
  const remainAmt = (c.deposit_amount ?? 0)

  return (
    <Page size="A4" style={s.page}>
      <DocHeader title="สัญญาจองห้องชุด" id={c.id} date={fmtDate(c.created_at)} agent={agent} />

      <Text style={{ ...s.clause, marginBottom: 6 }}>
        ทำที่ {stock?.project_name ?? ''} วันที่ {date}
      </Text>

      {owner && <PartyBlock person={owner} label="ผู้ให้เช่า" role="ผู้ให้เช่า" />}
      {customer && <PartyBlock person={customer} label="ผู้เช่า / ผู้จะเช่า" role="ผู้จะเช่า" />}

      {stock && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>ทรัพย์ที่จอง</Text>
          {stock.project_name && <Row label="โครงการ" value={stock.project_name} />}
          {stock.unit_no && <Row label="เลขที่ห้อง" value={stock.unit_no} />}
          {stock.building && <Row label="อาคาร" value={stock.building} />}
          {stock.room_type && <Row label="ประเภท" value={stock.room_type} />}
          {stock.size_sqm != null && <Row label="ขนาด" value={`${stock.size_sqm} ตร.ม.`} />}
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>เงื่อนไขการจอง</Text>
        {c.rent_price != null && (
          <FinRow label="ค่าเช่า / เดือน" value={`${fmt(c.rent_price)} บาท (${bahtText(c.rent_price)})`} />
        )}
        {c.contract_months != null && (
          <FinRow label="ระยะเวลาเช่า" value={`${c.contract_months} เดือน`} />
        )}
        <FinRow
          label="ข้อ 3. เงินมัดจำในวันนี้"
          value={`${fmt(reserveAmt)} บาท (${bahtText(reserveAmt)})`}
        />
        <FinRow
          label="ข้อ 4. ส่วนที่เหลือชำระวันทำสัญญา"
          value={`${fmt(remainAmt)} บาท (${bahtText(remainAmt)})`}
        />
        {c.reservation_expire_date && (
          <FinRow label="วันสิ้นสุดการจอง" value={fmtDate(c.reservation_expire_date)} />
        )}
        {c.penalty_amount != null && c.penalty_amount > 0 && (
          <FinRow label="ค่าปรับกรณีผิดสัญญา" value={`${fmt(c.penalty_amount)} บาท`} />
        )}
      </View>

      <View style={s.section}>
        <Text style={s.clause}>ข้อ 5. หากผู้จะเช่าผิดสัญญา ยอมให้ผู้ให้เช่าริบเงินมัดจำตามข้อ 3 หากผู้ให้เช่าผิดสัญญา ผู้ให้เช่าต้องคืนเงินที่ได้รับทั้งหมด</Text>
        <Text style={s.clause}>ข้อ 6. สัญญานี้สิ้นสุดเมื่อทั้งสองฝ่ายได้ตกลงทำสัญญาเช่าภายในวันที่กำหนดเรียบร้อยแล้ว</Text>
      </View>

      <SigSection owner={owner} customer={customer} agent={agent}
        ownerLabel="ผู้ให้เช่า" customerLabel="ผู้จะเช่า"
      />
      <Text style={s.stamp}>สัญญาจองห้องชุด • {c.id} • {fmtDate(c.created_at)}</Text>
      <SigFooter owner={owner} customer={customer} agent={agent} />
    </Page>
  )
}

// ─── สัญญาเช่า page ───────────────────────────────────────────

function RentalContractPage({ c, stock, owner, customer, agent }: PageProps) {
  const docDate = fmtDate(c.created_at)
  const payDay = c.payment_day_of_month ?? (c.move_in_date ? new Date(c.move_in_date).getDate() : 1)
  const graceDays = c.payment_grace_days ?? 5
  const penaltyAmt = c.penalty_amount ?? 0
  const cleanFee = c.cleaning_fee ?? 0
  const acTotal = (c.ac_count ?? 0) * (c.ac_wash_per_unit ?? 0)

  return (
    <Page size="A4" style={s.page}>
      <DocHeader title="สัญญาเช่าที่พักอาศัย" id={c.id} date={docDate} agent={agent} />

      <Text style={{ ...s.clause, marginBottom: 6 }}>
        ทำที่ {stock?.project_name ?? ''} วันที่ {docDate}
      </Text>

      {owner && <PartyBlock person={owner} label="ผู้ให้เช่า" role="ผู้ให้เช่า" />}
      {customer && <PartyBlock person={customer} label="ผู้เช่า" role="ผู้เช่า" />}

      {stock && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>ทรัพย์สินที่เช่า</Text>
          {stock.project_name && <Row label="โครงการ" value={stock.project_name} />}
          {stock.unit_no && <Row label="เลขที่ห้อง" value={stock.unit_no} />}
          {stock.building && <Row label="อาคาร" value={stock.building} />}
          {stock.floor != null && <Row label="ชั้น" value={String(stock.floor)} />}
          {stock.room_type && <Row label="ประเภท" value={stock.room_type} />}
          {stock.size_sqm != null && <Row label="ขนาด" value={`${stock.size_sqm} ตร.ม.`} />}
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>ข้อ 1. ระยะเวลาสัญญา</Text>
        {c.contract_months != null && <FinRow label="ระยะเวลา" value={`${c.contract_months} เดือน`} />}
        {c.move_in_date && <FinRow label="เริ่มสัญญา" value={fmtDate(c.move_in_date)} />}
        {c.end_date && <FinRow label="สิ้นสุดสัญญา" value={fmtDate(c.end_date)} />}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>ข้อ 2. ค่าเช่าและการชำระ</Text>
        {c.rent_price != null && (
          <FinRow label="ค่าเช่า / เดือน" value={`${fmt(c.rent_price)} บาท (${bahtText(c.rent_price)})`} />
        )}
        <FinRow label="ชำระทุกวันที่" value={`${payDay} ของทุกเดือน ไม่เกินวันที่ ${payDay + graceDays}`} />
        {penaltyAmt > 0 && (
          <FinRow label="ค่าปรับผิดนัด" value={`${fmt(penaltyAmt)} บาท / วัน (${bahtText(penaltyAmt)})`} />
        )}
        {c.vat_7 && <FinRow label="VAT 7%" value="รวมในค่าเช่า" />}
        {c.wht_3 && <FinRow label="หัก ณ ที่จ่าย 3%" value="หักจากค่าเช่า" />}
        {owner?.bank_name && (
          <View style={{ marginTop: 4 }}>
            <Text style={s.clause}>โอนเงินเข้าบัญชี: {owner.bank_name} • {owner.bank_account_no} • ชื่อ {owner.bank_account_name ?? fullName(owner)}</Text>
          </View>
        )}
      </View>

      {(c.water_unit_price || c.electric_unit_price || c.internet_fee || c.common_fee || c.parking_fee) && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>ค่าใช้จ่ายรายเดือน</Text>
          {c.water_unit_price != null && c.water_unit_price > 0 && <FinRow label="ค่าน้ำ / หน่วย" value={`${fmt(c.water_unit_price)} บาท`} />}
          {c.electric_unit_price != null && c.electric_unit_price > 0 && <FinRow label="ค่าไฟ / หน่วย" value={`${fmt(c.electric_unit_price)} บาท`} />}
          {c.internet_fee != null && c.internet_fee > 0 && <FinRow label="ค่าอินเตอร์เน็ต / เดือน" value={`${fmt(c.internet_fee)} บาท`} />}
          {c.common_fee != null && c.common_fee > 0 && <FinRow label="ค่าส่วนกลาง / เดือน" value={`${fmt(c.common_fee)} บาท`} />}
          {c.parking_fee != null && c.parking_fee > 0 && <FinRow label="ค่าจอดรถ / เดือน" value={`${fmt(c.parking_fee)} บาท`} />}
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>ข้อ 3. เงินประกันสัญญา</Text>
        {c.deposit_amount != null && (
          <FinRow
            label={`เงินประกัน${c.deposit_months ? ` (${c.deposit_months} เดือน)` : ''}`}
            value={`${fmt(c.deposit_amount)} บาท (${bahtText(c.deposit_amount)})`}
          />
        )}
        <Text style={{ ...s.clause, marginTop: 4 }}>
          ผู้ให้เช่าจะคืนเงินประกันหลังหักหนี้ค้างชำระภายใน 30 วัน นับจากวันสิ้นสุดสัญญา
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>ข้อ 9. ค่าใช้จ่ายเมื่อสิ้นสุดสัญญา</Text>
        {cleanFee > 0 && <FinRow label="ค่าทำความสะอาด" value={`${fmt(cleanFee)} บาท (${bahtText(cleanFee)})`} />}
        {c.ac_count != null && c.ac_count > 0 && (
          <FinRow
            label={`ค่าล้างแอร์ ${c.ac_count} เครื่อง × ${fmt(c.ac_wash_per_unit ?? 0)}`}
            value={`${fmt(acTotal)} บาท (${bahtText(acTotal)})`}
          />
        )}
        {(cleanFee > 0 || acTotal > 0) && (
          <FinRow label="รวมทั้งสิ้น" value={`${fmt(cleanFee + acTotal)} บาท`} />
        )}
        <Text style={{ ...s.clause, marginTop: 4 }}>
          ข้อ 4-8: ผู้เช่าต้องปฏิบัติตามข้อกำหนดของโครงการ ใช้ทรัพย์เพื่ออยู่อาศัยเท่านั้น ไม่ต่อเติมหรือโอนสิทธิ์โดยไม่ได้รับอนุญาต แจ้งความเสียหายภายใน 7 วัน และส่งมอบทรัพย์ในสภาพเรียบร้อยเมื่อครบสัญญา สัญญาฉบับนี้อยู่ภายใต้กฎหมายไทย
        </Text>
      </View>

      <Text style={{ ...s.clause, marginTop: 4 }}>
        สัญญาฉบับนี้ทำขึ้น 2 ฉบับ มีข้อความตรงกัน ผู้ให้เช่าและผู้เช่าถือไว้คนละฉบับ ทั้งสองฝ่ายได้อ่านและเห็นว่าถูกต้องตามวัตถุประสงค์ จึงลงลายมือชื่อไว้ต่อหน้าพยาน
      </Text>

      <SigSection owner={owner} customer={customer} agent={agent} />
      <Text style={s.stamp}>สัญญาเช่าที่พักอาศัย • {c.id} • {docDate}</Text>
      <SigFooter owner={owner} customer={customer} agent={agent} />
    </Page>
  )
}

// ─── ตารางค่าเช่า page ───────────────────────────────────────

function PaymentSchedulePage({ c, stock, owner, customer, agent }: PageProps) {
  if (!c.move_in_date || !c.contract_months) return null
  const payDay = c.payment_day_of_month ?? new Date(c.move_in_date).getDate()
  const graceDays = c.payment_grace_days ?? 5
  const schedule = generatePaymentSchedule(c.move_in_date, c.contract_months, payDay, graceDays)

  return (
    <Page size="A4" style={s.page}>
      <DocHeader title="ตารางชำระค่าเช่า" id={c.id} date={fmtDate(c.created_at)} agent={agent} />

      <View style={s.section}>
        {stock?.project_name && <Row label="โครงการ" value={stock.project_name} />}
        {stock?.unit_no && <Row label="ห้อง" value={stock.unit_no} />}
        {c.rent_price != null && <Row label="ค่าเช่า / เดือน" value={`${fmt(c.rent_price)} บาท`} />}
        {c.move_in_date && <Row label="เริ่มสัญญา" value={fmtDate(c.move_in_date)} />}
        {c.end_date && <Row label="สิ้นสุด" value={fmtDate(c.end_date)} />}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>ตารางชำระค่าเช่า — {c.contract_months} เดือน</Text>
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableCellCenter, flex: 0.5 }}>ลำดับ</Text>
          <Text style={{ ...s.tableCell, flex: 2 }}>เดือนที่พักอาศัย</Text>
          <Text style={{ ...s.tableCellCenter, flex: 2 }}>วันที่ชำระ (วันที่ {payDay} – {payDay + graceDays})</Text>
          <Text style={{ ...s.tableCellRight, flex: 1.5 }}>จำนวนเงิน</Text>
        </View>
        {schedule.map(({ seq, monthName, due }) => (
          <View key={seq} style={[s.tableRow, seq % 2 === 0 ? { backgroundColor: '#f9fafb' } : {}]}>
            <Text style={{ ...s.tableCellCenter, flex: 0.5 }}>{seq}</Text>
            <Text style={{ ...s.tableCell, flex: 2 }}>{monthName}</Text>
            <Text style={{ ...s.tableCellCenter, flex: 2 }}>{due}</Text>
            <Text style={{ ...s.tableCellRight, flex: 1.5 }}>{fmt(c.rent_price ?? 0)} บาท</Text>
          </View>
        ))}
        <View style={s.totRow}>
          <Text style={s.finValue}>
            รวม {c.contract_months} เดือน = {fmt((c.rent_price ?? 0) * c.contract_months)} บาท
          </Text>
        </View>
      </View>

      <Text style={{ ...s.clause, marginTop: 6 }}>
        หมายเหตุ: หากพ้นกำหนด {graceDays} วัน นับจากวันที่ครบกำหนดชำระ คิดเบี้ยปรับ {c.penalty_amount ? `${fmt(c.penalty_amount)} บาท / วัน` : 'ตามที่ระบุในสัญญา'}
      </Text>
      <Text style={s.stamp}>ตารางค่าเช่า • {c.id} • {fmtDate(c.created_at)}</Text>
      <SigFooter owner={owner} customer={customer} agent={agent} />
    </Page>
  )
}

// ─── ยืนยันค่าคอมมิชชัน page ─────────────────────────────────

function CommissionConfirmPage({ c, stock, owner, customer, agent }: PageProps) {
  const commAmt = c.commission_from_owner ?? c.commission_net ?? 0
  const docDate = fmtDate(c.created_at)

  return (
    <Page size="A4" style={s.page}>
      <DocHeader title="ยืนยันค่านายหน้าจากการให้เช่าทรัพย์สิน" id={c.id} date={docDate} agent={agent} />

      <View style={{ ...s.section, marginBottom: 6 }}>
        <Text style={s.clause}>วันที่ {docDate}</Text>
        <Text style={s.clause}>เรียน {owner ? fullName(owner) : '-'} เจ้าของทรัพย์</Text>
      </View>

      <Text style={{ ...s.clause, marginBottom: 8 }}>ยืนยันข้อกำหนดและเงื่อนไขการเช่าดังต่อไปนี้</Text>

      <View style={s.section}>
        <Text style={s.sectionTitle}>ข้อมูลทรัพย์และการเช่า</Text>
        {stock?.project_name && <Row label="โครงการ" value={stock.project_name} />}
        {stock?.unit_no && <Row label="เลขที่ห้อง" value={stock.unit_no} />}
        {customer && <Row label="ผู้เช่า" value={fullName(customer)} />}
        {c.rent_price != null && <Row label="ค่าเช่า / เดือน" value={`${fmt(c.rent_price)} บาท (${bahtText(c.rent_price)})`} />}
        {c.contract_months != null && <Row label="ระยะเวลา" value={`${c.contract_months} เดือน`} />}
        {c.move_in_date && <Row label="เริ่ม" value={fmtDate(c.move_in_date)} />}
        {c.end_date && <Row label="จนถึง" value={fmtDate(c.end_date)} />}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>ค่าธรรมเนียมตัวแทนอสังหาริมทรัพย์</Text>
        {c.commission_rate_pct != null && <FinRow label="อัตราค่าคอม" value={`${c.commission_rate_pct}%`} />}
        {commAmt > 0 && (
          <FinRow label="ค่าธรรมเนียม (รวม VAT 7%)" value={`${fmt(commAmt)} บาท (${bahtText(commAmt)})`} />
        )}
        {c.commission_from_customer != null && c.commission_from_customer > 0 && (
          <FinRow label="ค่าคอมจากผู้เช่า" value={`${fmt(c.commission_from_customer)} บาท`} />
        )}
        {agent.bank_name && <FinRow label="ธนาคาร" value={agent.bank_name} />}
        {agent.bank_account_no && <FinRow label="เลขบัญชี" value={agent.bank_account_no} />}
        {agent.bank_account_name && <FinRow label="ชื่อบัญชี" value={agent.bank_account_name} />}
      </View>

      <View style={s.section}>
        <Text style={s.clause}>
          เจ้าของทรัพย์ต้องชำระค่าบริการภายใน 1 วัน หลังจากได้รับเงินค่าเช่าล่วงหน้าและเงินประกันจากผู้เช่า ค่าบริการนี้ไม่สามารถเรียกคืนได้ไม่ว่ากรณีใดก็ตาม
        </Text>
        <Text style={{ ...s.clause, marginTop: 4, color: '#666' }}>
          * ในกรณีที่ท่านได้รับเงินมัดจำแล้ว หากไม่สามารถทำตามสัญญาได้ ตัวแทนฯจะคิดค่าดำเนินการ 50% ของเงินที่ได้รับ แต่ไม่เกินค่านายหน้าที่ระบุไว้
        </Text>
      </View>

      <SigSection owner={owner} customer={null} agent={agent}
        ownerLabel="เจ้าของทรัพย์ (ยืนยันและยอมรับ)"
        showAgent
      />
      <Text style={s.stamp}>ยืนยันค่าคอมมิชชัน • {c.id} • {docDate}</Text>
      <SigFooter agent={agent} agentOnly />
    </Page>
  )
}

// ─── Legacy single-page (non-bundle) ─────────────────────────

function LegacySinglePage({ c, stock, owner, customer, agent }: PageProps) {
  const docDate = fmtDate(c.created_at)
  const isReceipt = c.doc_type === 'receipt_rent' || c.doc_type === 'receipt_book'
  const isCommission = c.doc_type === 'commission'

  return (
    <Page size="A4" style={s.page}>
      <DocHeader title={DOC_LABELS[c.doc_type]} id={c.id} date={docDate} agent={agent} />

      {stock && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>ทรัพย์สิน</Text>
          {stock.project_name && <Row label="โครงการ" value={stock.project_name} />}
          {stock.unit_no && <Row label="ห้อง" value={stock.unit_no} />}
          {stock.room_type && <Row label="ประเภท" value={stock.room_type} />}
        </View>
      )}
      {owner && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isReceipt || isCommission ? 'ผู้รับเงิน' : 'ผู้ให้เช่า'}</Text>
          <Row label="ชื่อ-นามสกุล" value={fullName(owner)} />
          {owner.national_id && <Row label="เลขบัตร" value={formatNationalId(owner.national_id)} />}
        </View>
      )}
      {customer && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isReceipt ? 'ผู้ชำระ' : isCommission ? 'ผู้ว่าจ้าง' : 'ผู้เช่า'}</Text>
          <Row label="ชื่อ-นามสกุล" value={fullName(customer)} />
        </View>
      )}
      {isCommission && c.commission_net != null && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>ค่านายหน้า</Text>
          <FinRow label="ค่านายหน้าสุทธิ" value={`${fmt(c.commission_net)} บาท`} />
          {c.vat_7 && <FinRow label="VAT 7%" value={`${fmt(c.commission_net * 0.07)} บาท`} />}
          {c.wht_3 && <FinRow label="หัก ณ ที่จ่าย 3%" value={`(${fmt(c.commission_net * 0.03)}) บาท`} />}
          <FinRow label="ยอดสุทธิ" value={`${fmt(c.commission_net * (1 + (c.vat_7 ? 0.07 : 0) - (c.wht_3 ? 0.03 : 0)))} บาท`} />
        </View>
      )}
      {isReceipt && c.rent_price != null && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>รายละเอียด</Text>
          <FinRow label="จำนวนเงิน" value={`${fmt(c.rent_price)} บาท`} />
          {c.move_in_date && <FinRow label="ประจำเดือน" value={fmtDate(c.move_in_date)} />}
        </View>
      )}
      {!isCommission && !isReceipt && c.penalty_amount != null && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>รายละเอียด</Text>
          <FinRow label="ค่าปรับ" value={`${fmt(c.penalty_amount)} บาท`} />
          {c.move_in_date && <FinRow label="วันที่มีผล" value={fmtDate(c.move_in_date)} />}
        </View>
      )}
      <SigSection owner={owner} customer={customer} agent={agent} showAgent={isCommission} />
      <Text style={s.stamp}>{DOC_LABELS[c.doc_type]} • {c.id} • {docDate}</Text>
      <SigFooter owner={owner} customer={customer} agent={agent} agentOnly={isCommission} />
    </Page>
  )
}

// ─── Main Document Component ──────────────────────────────────

interface Props {
  contract: ContractData
  stock?: StockData | null
  owner?: PersonData | null
  customer?: PersonData | null
  agent: AgentData
}

export function ContractDocument({ contract: c, stock, owner, customer, agent }: Props) {
  const isBundle = c.doc_type === 'rental' || c.doc_type === 'renewal'
  const depositAmt = c.deposit_amount ?? 0
  const reserveAmt = c.rent_price ?? 0 // booking deposit = 1 month rent
  const docDate = fmtDate(c.created_at)

  const stockDesc = stock
    ? `โครงการ ${stock.project_name ?? ''} ห้อง ${stock.unit_no ?? ''} สัญญา ${c.contract_months ?? ''} เดือน ราคาเช่า ${fmt(c.rent_price ?? 0)} บาท/เดือน`
    : '-'

  if (isBundle) {
    return (
      <Document title={`ชุดเอกสาร ${c.id}`}>
        {/* 1. สัญญาจอง */}
        <ReservationContractPage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />

        {/* 2. ใบแจ้งหนี้เงินจอง */}
        <InvoiceReceiptPage
          docTitle="ใบแจ้งหนี้เงินจอง" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={reserveAmt} description={`เงินมัดจำจอง ${stockDesc}`}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt={false}
        />

        {/* 3. ใบเสร็จเงินจอง */}
        <InvoiceReceiptPage
          docTitle="ใบเสร็จรับเงิน (เงินจอง)" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={reserveAmt} description={`เงินมัดจำจอง ${stockDesc}`}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt paymentMethod={c.payment_method} bankRef={c.bank_ref}
        />

        {/* 4. สัญญาเช่า */}
        <RentalContractPage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />

        {/* 5. ตารางค่าเช่า */}
        <PaymentSchedulePage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />

        {/* 6. ใบแจ้งหนี้เงินประกัน */}
        <InvoiceReceiptPage
          docTitle="ใบแจ้งหนี้เงินประกัน" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={depositAmt} description={`เงินประกันคอนโด ${stockDesc}`}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt={false}
        />

        {/* 7. ใบเสร็จเงินประกัน */}
        <InvoiceReceiptPage
          docTitle="ใบเสร็จรับเงิน (เงินประกัน)" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={depositAmt} description={`เงินประกันคอนโด ${stockDesc}`}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt paymentMethod={c.payment_method} bankRef={c.bank_ref}
        />

        {/* 8. ยืนยันค่าคอมมิชชัน */}
        <CommissionConfirmPage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />
      </Document>
    )
  }

  // Single-document pages
  if (c.doc_type === 'reservation') {
    return (
      <Document title={`สัญญาจอง ${c.id}`}>
        <ReservationContractPage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />
      </Document>
    )
  }

  if (c.doc_type === 'invoice_reservation') {
    return (
      <Document title={`ใบแจ้งหนี้เงินจอง ${c.id}`}>
        <InvoiceReceiptPage
          docTitle="ใบแจ้งหนี้เงินจอง" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={c.deposit_amount ?? 0} description={stockDesc}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt={false}
        />
      </Document>
    )
  }

  if (c.doc_type === 'receipt_reservation') {
    return (
      <Document title={`ใบเสร็จเงินจอง ${c.id}`}>
        <InvoiceReceiptPage
          docTitle="ใบเสร็จรับเงิน (เงินจอง)" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={c.deposit_amount ?? 0} description={stockDesc}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt paymentMethod={c.payment_method} bankRef={c.bank_ref}
        />
      </Document>
    )
  }

  if (c.doc_type === 'invoice_deposit') {
    return (
      <Document title={`ใบแจ้งหนี้เงินประกัน ${c.id}`}>
        <InvoiceReceiptPage
          docTitle="ใบแจ้งหนี้เงินประกัน" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={c.deposit_amount ?? 0} description={stockDesc}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt={false}
        />
      </Document>
    )
  }

  if (c.doc_type === 'receipt_deposit') {
    return (
      <Document title={`ใบเสร็จเงินประกัน ${c.id}`}>
        <InvoiceReceiptPage
          docTitle="ใบเสร็จรับเงิน (เงินประกัน)" id={c.id} date={docDate}
          agent={agent} owner={owner} customer={customer} stock={stock}
          amount={c.deposit_amount ?? 0} description={stockDesc}
          vat_7={c.vat_7} wht_3={c.wht_3} isReceipt paymentMethod={c.payment_method} bankRef={c.bank_ref}
        />
      </Document>
    )
  }

  if (c.doc_type === 'commission_confirm') {
    return (
      <Document title={`ยืนยันค่าคอมมิชชัน ${c.id}`}>
        <CommissionConfirmPage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />
      </Document>
    )
  }

  // Fallback: cancellation, termination, notice, receipt_rent, receipt_book, commission
  return (
    <Document title={`${DOC_LABELS[c.doc_type]} ${c.id}`}>
      <LegacySinglePage c={c} stock={stock} owner={owner} customer={customer} agent={agent} />
    </Document>
  )
}
