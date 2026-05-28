// Thai date/number formatters for contract generation

export const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

const EN_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function parseDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d
}

/** "15 พฤษภาคม 2569" */
export function toThaiDate(d: Date | string): string {
  const dt = parseDate(d)
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`
}

/** "15 พฤษภาคม 2569" */
export function toThaiDateFull(d: Date | string): string {
  const dt = parseDate(d)
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`
}

/** "15 May 2026" */
export function toEnDate(d: Date | string): string {
  const dt = parseDate(d)
  return `${dt.getDate()} ${EN_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

/** Buddhist year as string e.g. "2569" */
export function thaiYear(d: Date | string): string {
  return String(parseDate(d).getFullYear() + 543)
}

/** Gregorian year as string e.g. "2026" */
export function enYear(d: Date | string): string {
  return String(parseDate(d).getFullYear())
}

/** Thai month name e.g. "พฤษภาคม" */
export function thaiMonthName(d: Date | string): string {
  return THAI_MONTHS[parseDate(d).getMonth()] ?? ''
}

/** Day of month as string e.g. "15" */
export function dayOfMonth(d: Date | string): string {
  return String(parseDate(d).getDate())
}

/** Format number with Thai locale commas e.g. "12,000" */
export function withCommas(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-'
  return new Intl.NumberFormat('th-TH').format(n)
}

/** "1-2345-67890-12-3" formatted national ID */
export function formatNationalId(id?: string | null): string {
  if (!id) return '-'
  const d = id.replace(/\D/g, '')
  if (d.length !== 13) return id
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`
}

// ─── Thai Baht Text (บาทถ้วน) ─────────────────────────────────────

const ONES = ['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า']
const UNITS = ['','สิบ','ร้อย','พัน','หมื่น','แสน']

function thaiChunk(n: number): string {
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
      else res += (ONES[d] ?? '') + 'สิบ'
    } else if (pos === 0 && d === 1 && n > 1) {
      res += 'เอ็ด'
    } else {
      res += (ONES[d] ?? '') + (UNITS[pos] ?? '')
    }
  }
  return res
}

/** Convert number to Thai Baht text: "หนึ่งหมื่นสองพันบาทถ้วน" */
export function bahtText(amount: number | null | undefined): string {
  if (!amount || amount === 0) return 'ศูนย์บาทถ้วน'
  const baht = Math.floor(amount)
  const satang = Math.round((amount - baht) * 100)
  let result = ''
  if (baht >= 1_000_000) {
    result += thaiChunk(Math.floor(baht / 1_000_000)) + 'ล้าน'
    const rest = baht % 1_000_000
    if (rest > 0) result += thaiChunk(rest)
  } else {
    result += thaiChunk(baht)
  }
  result += 'บาท'
  result += satang > 0 ? thaiChunk(satang) + 'สตางค์' : 'ถ้วน'
  return result
}

// ─── English Baht Text ────────────────────────────────────────────

const EN_ONES = [
  '','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen',
  'Sixteen','Seventeen','Eighteen','Nineteen',
]
const EN_TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

function enChunk(n: number): string {
  if (n === 0) return ''
  if (n < 20) return (EN_ONES[n] ?? '') + ' '
  if (n < 100) return (EN_TENS[Math.floor(n / 10)] ?? '') + (n % 10 ? ' ' + (EN_ONES[n % 10] ?? '') : '') + ' '
  return (EN_ONES[Math.floor(n / 100)] ?? '') + ' Hundred ' + enChunk(n % 100)
}

/** Convert number to English Baht text: "Twelve Thousand Baht Only" */
export function bahtTextEn(amount: number | null | undefined): string {
  if (!amount || amount === 0) return 'Zero Baht Only'
  const baht = Math.floor(amount)
  const satang = Math.round((amount - baht) * 100)
  let result = ''
  if (baht >= 1_000_000) {
    result += enChunk(Math.floor(baht / 1_000_000)) + 'Million '
    const rest = baht % 1_000_000
    if (rest >= 1000) result += enChunk(Math.floor(rest / 1000)) + 'Thousand '
    const rem = rest % 1000
    if (rem > 0) result += enChunk(rem)
  } else if (baht >= 1000) {
    result += enChunk(Math.floor(baht / 1000)) + 'Thousand '
    const rem = baht % 1000
    if (rem > 0) result += enChunk(rem)
  } else {
    result += enChunk(baht)
  }
  result = result.trim()
  result += ' Baht'
  result += satang > 0 ? ` ${enChunk(satang).trim()} Satang` : ' Only'
  return result
}
