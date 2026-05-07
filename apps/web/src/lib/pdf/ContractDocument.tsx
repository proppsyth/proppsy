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

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: `${BASE}/fonts/Sarabun-Regular.ttf`, fontWeight: 400 },
    { src: `${BASE}/fonts/Sarabun-Bold.ttf`, fontWeight: 700 },
  ],
})

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 50,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563EB',
  },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 700, color: '#2563EB' },
  docMeta: { fontSize: 9, color: '#666', marginTop: 2 },
  agentName: { fontSize: 10, fontWeight: 700, marginTop: 4 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    padding: '4 8',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: '35%', color: '#555', fontSize: 9 },
  value: { flex: 1, fontWeight: 700 },
  valueWide: { flex: 1 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#ddd', marginVertical: 10 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  finLabel: { color: '#555', fontSize: 9 },
  finValue: { fontWeight: 700 },
  clause: { fontSize: 9, color: '#555', lineHeight: 1.5, marginBottom: 3 },
  sigSection: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 },
  sigBox: { alignItems: 'center', width: '28%' },
  sigLine: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 4, marginTop: 30 },
  sigLabel: { fontSize: 9, color: '#555' },
  sigImage: { width: 80, height: 30, objectFit: 'contain', marginTop: 8 },
  stamp: { fontSize: 8, color: '#aaa', textAlign: 'center', marginTop: 24 },
  highlight: { color: '#1D4ED8', fontWeight: 700 },
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
}

export interface AgentData {
  name?: string | null
  company_name?: string | null
  phone?: string | null
  logo_url?: string | null
  signature_url?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────

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
}

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fullName(p: PersonData): string {
  return [p.prefix, p.first_name_th, p.last_name_th].filter(Boolean).join(' ') || '-'
}

function fullAddress(p: PersonData): string {
  return [p.address_no, p.address_road, p.subdistrict && `แขวง${p.subdistrict}`,
    p.district && `เขต${p.district}`, p.province, p.zip].filter(Boolean).join(' ') || '-'
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

// ─── Document Component ───────────────────────────────────────

interface Props {
  contract: ContractData
  stock?: StockData | null
  owner?: PersonData | null
  customer?: PersonData | null
  agent: AgentData
}

export function ContractDocument({ contract: c, stock, owner, customer, agent }: Props) {
  const docDate = fmtDate(c.created_at)
  const isRental = c.doc_type === 'rental' || c.doc_type === 'renewal'
  const isReceipt = c.doc_type === 'receipt_rent' || c.doc_type === 'receipt_book'
  const isCommission = c.doc_type === 'commission'

  return (
    <Document title={`${DOC_LABELS[c.doc_type]} ${c.id}`}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            {agent.logo_url && (
              <Image src={agent.logo_url} style={s.logo} />
            )}
            <Text style={s.agentName}>{agent.company_name ?? agent.name ?? 'Proppsy'}</Text>
            {agent.phone && <Text style={s.docMeta}>{agent.phone}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{DOC_LABELS[c.doc_type]}</Text>
            <Text style={s.docMeta}>เลขที่: <Text style={s.highlight}>{c.id}</Text></Text>
            <Text style={s.docMeta}>วันที่: {docDate}</Text>
          </View>
        </View>

        {/* ── Property ── */}
        {stock && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ทรัพย์สินที่เช่า</Text>
            {stock.project_name && <Row label="โครงการ" value={stock.project_name} />}
            {stock.unit_no && <Row label="ห้อง / ยูนิต" value={stock.unit_no} />}
            {stock.building && <Row label="อาคาร" value={stock.building} />}
            {stock.floor != null && <Row label="ชั้น" value={`${stock.floor}`} />}
            {stock.room_type && <Row label="ประเภทห้อง" value={stock.room_type} />}
            {stock.size_sqm != null && <Row label="ขนาด" value={`${stock.size_sqm} ตร.ม.`} />}
          </View>
        )}

        {/* ── Owner ── */}
        {owner && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isReceipt || isCommission ? 'ผู้รับเงิน' : 'ผู้ให้เช่า (เจ้าของ)'}</Text>
            <Row label="ชื่อ-นามสกุล" value={fullName(owner)} />
            {owner.national_id && <Row label="เลขบัตรประชาชน" value={owner.national_id.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, '$1-$2-$3-$4-$5')} />}
            {owner.phone && <Row label="เบอร์โทรศัพท์" value={owner.phone} />}
            <Row label="ที่อยู่" value={fullAddress(owner)} />
          </View>
        )}

        {/* ── Customer ── */}
        {customer && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isReceipt ? 'ผู้ชำระเงิน' : isCommission ? 'ผู้ว่าจ้าง' : 'ผู้เช่า'}</Text>
            <Row label="ชื่อ-นามสกุล" value={fullName(customer)} />
            {customer.national_id && <Row label="เลขบัตรประชาชน" value={customer.national_id.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, '$1-$2-$3-$4-$5')} />}
            {customer.phone && <Row label="เบอร์โทรศัพท์" value={customer.phone} />}
            <Row label="ที่อยู่" value={fullAddress(customer)} />
          </View>
        )}

        {/* ── Financial ── */}
        {isRental && (c.rent_price || c.deposit_amount || c.contract_months) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>เงื่อนไขการเช่า</Text>
            {c.rent_price != null && <FinRow label="ค่าเช่า / เดือน" value={`${fmt(c.rent_price)} บาท`} />}
            {c.deposit_amount != null && (
              <FinRow
                label={`เงินมัดจำ${c.deposit_months ? ` (${c.deposit_months} เดือน)` : ''}`}
                value={`${fmt(c.deposit_amount)} บาท`}
              />
            )}
            {c.contract_months != null && <FinRow label="ระยะสัญญา" value={`${c.contract_months} เดือน`} />}
            {c.move_in_date && <FinRow label="วันเข้าอยู่" value={fmtDate(c.move_in_date)} />}
            {c.end_date && <FinRow label="วันสิ้นสุดสัญญา" value={fmtDate(c.end_date)} />}
            {c.cleaning_fee != null && c.cleaning_fee > 0 && (
              <FinRow label="ค่าทำความสะอาด" value={`${fmt(c.cleaning_fee)} บาท`} />
            )}
            {c.ac_count != null && c.ac_count > 0 && (
              <FinRow
                label="ค่าล้างแอร์"
                value={`${c.ac_count} เครื่อง × ${fmt(c.ac_wash_per_unit ?? 0)} = ${fmt(c.ac_count * (c.ac_wash_per_unit ?? 0))} บาท`}
              />
            )}
            {c.penalty_amount != null && c.penalty_amount > 0 && (
              <FinRow label="ค่าปรับผิดนัด" value={`${fmt(c.penalty_amount)} บาท`} />
            )}
            {c.vat_7 && <FinRow label="ภาษีมูลค่าเพิ่ม 7%" value="รวมอยู่ในค่าเช่า" />}
            {c.wht_3 && <FinRow label="หัก ณ ที่จ่าย 3%" value="หักจากค่าเช่า" />}
          </View>
        )}

        {c.doc_type === 'commission' && c.commission_net != null && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ค่านายหน้า</Text>
            <FinRow label="ค่านายหน้าสุทธิ" value={`${fmt(c.commission_net)} บาท`} />
            {c.vat_7 && <FinRow label="VAT 7%" value={`${fmt(c.commission_net * 0.07)} บาท`} />}
            {c.wht_3 && <FinRow label="หัก ณ ที่จ่าย 3%" value={`${fmt(c.commission_net * 0.03)} บาท`} />}
            <FinRow
              label="ยอดสุทธิที่ได้รับ"
              value={`${fmt(c.commission_net * (1 + (c.vat_7 ? 0.07 : 0) - (c.wht_3 ? 0.03 : 0)))} บาท`}
            />
          </View>
        )}

        {(c.doc_type === 'reservation') && (c.deposit_amount || c.penalty_amount) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>เงื่อนไขการจอง</Text>
            {c.deposit_amount != null && <FinRow label="เงินจอง" value={`${fmt(c.deposit_amount)} บาท`} />}
            {c.penalty_amount != null && <FinRow label="ค่าปรับกรณียกเลิก" value={`${fmt(c.penalty_amount)} บาท`} />}
          </View>
        )}

        {(c.doc_type === 'receipt_rent' || c.doc_type === 'receipt_book') && c.rent_price != null && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>รายละเอียดการชำระเงิน</Text>
            <FinRow label="จำนวนเงิน" value={`${fmt(c.rent_price)} บาท`} />
            {c.move_in_date && <FinRow label="ประจำเดือน" value={fmtDate(c.move_in_date)} />}
          </View>
        )}

        {/* ── General Conditions (Rental only) ── */}
        {isRental && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ข้อกำหนดทั่วไป</Text>
            <Text style={s.clause}>1. ผู้เช่าจะต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน หากเกินกำหนดจะมีค่าปรับตามที่ระบุในสัญญา</Text>
            <Text style={s.clause}>2. ผู้เช่าต้องรักษาทรัพย์สินให้อยู่ในสภาพที่ดี และรับผิดชอบค่าซ่อมแซมความเสียหายที่เกิดจากการใช้งาน</Text>
            <Text style={s.clause}>3. ห้ามผู้เช่าโอนสิทธิ์การเช่า หรือนำทรัพย์สินไปให้ผู้อื่นเช่าช่วงโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</Text>
            <Text style={s.clause}>4. เมื่อสัญญาสิ้นสุด ผู้เช่าต้องส่งมอบทรัพย์สินในสภาพเรียบร้อย และจะได้รับเงินมัดจำคืนภายใน 30 วัน</Text>
            <Text style={s.clause}>5. คู่สัญญาทั้งสองฝ่ายตกลงปฏิบัติตามเงื่อนไขในสัญญาฉบับนี้ทุกประการ</Text>
          </View>
        )}

        {/* ── Signatures ── */}
        <View style={s.sigSection}>
          {owner && (
            <View style={s.sigBox}>
              {owner.signature_url && (
                <Image src={owner.signature_url} style={s.sigImage} />
              )}
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{isReceipt || isCommission ? 'ผู้รับเงิน' : 'ผู้ให้เช่า'}</Text>
              <Text style={{ ...s.sigLabel, fontWeight: 700 }}>{fullName(owner)}</Text>
            </View>
          )}
          {customer && (
            <View style={s.sigBox}>
              {customer.signature_url && (
                <Image src={customer.signature_url} style={s.sigImage} />
              )}
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{isReceipt ? 'ผู้ชำระเงิน' : isCommission ? 'ผู้ว่าจ้าง' : 'ผู้เช่า'}</Text>
              <Text style={{ ...s.sigLabel, fontWeight: 700 }}>{fullName(customer)}</Text>
            </View>
          )}
          <View style={s.sigBox}>
            {agent.signature_url && (
              <Image src={agent.signature_url} style={s.sigImage} />
            )}
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>นายหน้า / ผู้จัดการ</Text>
            <Text style={{ ...s.sigLabel, fontWeight: 700 }}>{agent.name ?? '-'}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={s.stamp}>
          เอกสารนี้สร้างโดย Proppsy • {c.id} • {docDate}
        </Text>

      </Page>
    </Document>
  )
}
