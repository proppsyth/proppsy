// Invoice / Receipt PDF renderer — same Puppeteer + Noto Sans Thai + navy
// theme as the contract pipeline. Used for:
//   - invoice_reservation  / receipt_reservation
//   - invoice_deposit      / receipt_deposit
//
// No "Proppsy" branding in the document body (per design requirement).

import path from 'path'
import fs from 'fs'

// Reuse the same dynamic-imported browser singleton from htmlToPdf.ts
// to avoid launching two Chromium instances.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _browser: any | null = null

async function getBrowser(): Promise<any> {
  if (_browser && _browser.connected) return _browser
  const { default: puppeteer } = await import('puppeteer')
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  })
  return _browser
}

// ─── Font data URLs (embed Noto Sans Thai inline) ──────────────────

function fontDataUrl(file: string): string | null {
  const p = path.join(process.cwd(), 'public', 'fonts', file)
  if (!fs.existsSync(p)) return null
  return `data:font/ttf;base64,${fs.readFileSync(p).toString('base64')}`
}

const FONT_REG_URL  = fontDataUrl('NotoSansThai-Regular.ttf')
const FONT_BOLD_URL = fontDataUrl('NotoSansThai-Bold.ttf')

// ─── Public types ──────────────────────────────────────────────────

export interface InvoicePerson {
  name?:           string
  address?:        string
  national_id?:    string
  bank_name?:      string
  bank_account_no?: string
  bank_account_name?: string
}

export interface InvoiceOptions {
  /** ใบแจ้งหนี้เงินจอง / ใบเสร็จรับเงิน (เงินจอง) / ... */
  docTitle:       string
  /** Contract / document ID (e.g., B-0007). */
  docId:          string
  /** Display date string. */
  date:           string
  /** Agent / company info (for header right side). */
  agentName?:     string
  agentPhone?:    string
  /** Status text shown in header (DRAFT, FINALIZED, ...). */
  statusText?:    string
  /** People involved. */
  owner?:         InvoicePerson | null   // ผู้ออกเอกสาร
  customer?:      InvoicePerson | null   // ผู้รับ / ผู้ชำระเงิน
  /** Property snapshot (for line-item description). */
  stockDesc?:     string
  /** Line item amount in baht (before VAT / WHT). */
  amount:         number
  /** Optional VAT 7% / WHT 3% flags. */
  vat7?:          boolean
  wht3?:          boolean
  /** True for receipt (shows payment method); false for invoice. */
  isReceipt:      boolean
  paymentMethod?: string | null
  bankRef?:       string | null
  /** Signature image URLs (base64 data URLs preferred — external URLs may fail in headers). */
  ownerSignatureUrl?:    string | null
  customerSignatureUrl?: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtBaht(n: number): string {
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function bahtText(amount: number): string {
  // Minimal Thai baht-text — handles whole and decimal. For full impl, see
  // variableCompute.ts. Kept inline here so this module has zero project deps.
  const numbers = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า']
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

  function readInt(num: number): string {
    if (num === 0) return ''
    const str = String(num)
    let result = ''
    for (let i = 0; i < str.length; i++) {
      const digit = parseInt(str[i]!, 10)
      const pos = str.length - i - 1
      if (digit === 0) continue
      if (pos === 0 && digit === 1 && str.length > 1) result += 'เอ็ด'
      else if (pos === 1 && digit === 2) result += 'ยี่' + positions[pos]
      else if (pos === 1 && digit === 1) result += positions[pos]
      else result += (numbers[digit] ?? '') + (positions[pos] ?? '')
    }
    return result
  }

  const rounded = Math.round(amount * 100) / 100
  const whole = Math.floor(rounded)
  const cents = Math.round((rounded - whole) * 100)
  let result = readInt(whole) + 'บาท'
  if (cents === 0) result += 'ถ้วน'
  else result += readInt(cents) + 'สตางค์'
  return result
}

function paymentLabel(method?: string | null): string {
  if (!method) return '-'
  const map: Record<string, string> = {
    cash:     'เงินสด',
    transfer: 'โอน',
    cheque:   'เช็ค',
    credit:   'บัตรเครดิต',
  }
  return map[method.toLowerCase()] ?? method
}

// ─── HTML builders ─────────────────────────────────────────────────

const C = {
  navy:   '#1B3B6F',
  text:   '#1A1A1A',
  sub:    '#4A4A4A',
  light:  '#888888',
  border: '#D0D8E8',
  rule:   '#EEF1F7',
  white:  '#FFFFFF',
}

function buildFullHtml(opts: InvoiceOptions): string {
  const fontFace = (FONT_REG_URL && FONT_BOLD_URL) ? `
    @font-face {
      font-family: 'NotoThai';
      src: url('${FONT_REG_URL}') format('truetype');
      font-weight: 400;
    }
    @font-face {
      font-family: 'NotoThai';
      src: url('${FONT_BOLD_URL}') format('truetype');
      font-weight: 700;
    }
  ` : ''

  const vatAmt   = opts.vat7 ? opts.amount * 0.07 : 0
  const whtAmt   = opts.wht3 ? opts.amount * 0.03 : 0
  const total    = opts.amount + vatAmt - whtAmt
  const totalTxt = bahtText(total)

  return `<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8">
<title>${escapeHtml(opts.docTitle)} ${escapeHtml(opts.docId)}</title>
<style>
  ${fontFace}
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'NotoThai', sans-serif;
    font-size: 9.5pt;
    color: ${C.text};
    line-height: 1.6;
  }
  h2.sec-title {
    font-size: 10pt; font-weight: 700; color: ${C.navy};
    padding: 2pt 0 4pt 0;
    border-bottom: 1.5pt solid ${C.navy};
    margin: 16pt 0 8pt 0;
  }
  .row { display: flex; margin-bottom: 3pt; }
  .row .lbl  { width: 30%; color: ${C.sub}; font-size: 9pt; }
  .row .val  { flex: 1; font-weight: 700; }
  .section { margin-bottom: 4pt; }
  .item-table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 4pt;
  }
  .item-table th, .item-table td {
    padding: 5pt 7pt;
    font-size: 9pt;
    text-align: left;
    border-bottom: 0.5pt solid ${C.rule};
  }
  .item-table thead th {
    background: ${C.navy};
    color: ${C.white};
    font-weight: 700;
    border-bottom: none;
  }
  .item-table .right { text-align: right; }
  .item-table .center { text-align: center; }

  .totals { margin-top: 6pt; }
  .totals .line {
    display: flex; justify-content: space-between;
    padding: 3pt 7pt;
    border-bottom: 0.5pt solid ${C.rule};
    font-size: 9pt;
  }
  .totals .line .l { color: ${C.sub}; }
  .totals .grand {
    display: flex; justify-content: flex-end; align-items: baseline;
    padding: 8pt 7pt;
    border-top: 1.5pt solid ${C.navy};
    margin-top: 4pt;
    font-size: 10.5pt; font-weight: 700;
    color: ${C.navy};
  }
  .totals .grand .baht-text {
    font-size: 9pt; color: ${C.sub}; font-weight: 400; margin-left: 8pt;
  }

  .sig {
    margin-top: 36pt;
    padding-top: 16pt;
    display: flex;
    justify-content: space-around;
    page-break-inside: avoid;
  }
  .sig-box { width: 42%; text-align: center; }
  .sig-img-area { height: 50pt; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 6pt; }
  .sig-img { max-width: 110pt; max-height: 44pt; object-fit: contain; }
  .sig-line { width: 100%; border-bottom: 1.2pt solid ${C.navy}; margin-bottom: 6pt; }
  .sig-role { font-size: 9pt; font-weight: 700; color: ${C.navy}; margin-bottom: 3pt; }
  .sig-name { font-size: 8.5pt; color: ${C.sub}; margin-bottom: 8pt; }
  .sig-date { font-size: 7.5pt; color: ${C.light}; margin-top: 4pt; }
</style></head>
<body>

  <h2 class="sec-title">ข้อมูลคู่สัญญา</h2>
  <div class="section">
    ${opts.customer?.name      ? row('ชื่อลูกค้า',     opts.customer.name) : ''}
    ${opts.customer?.address   ? row('ที่อยู่ลูกค้า',  opts.customer.address) : ''}
    ${opts.owner?.name         ? row('ผู้ออก',         opts.owner.name) : ''}
    ${opts.owner?.national_id  ? row('เลขประจำตัว',    opts.owner.national_id) : ''}
  </div>

  <h2 class="sec-title">รายละเอียด</h2>
  <table class="item-table">
    <thead>
      <tr>
        <th class="center" style="width:8%">ลำดับ</th>
        <th style="width:67%">รายละเอียด</th>
        <th class="right" style="width:25%">จำนวนเงิน</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">1</td>
        <td>${escapeHtml(opts.stockDesc ?? '-')}</td>
        <td class="right">${fmtBaht(opts.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="line"><span class="l">รวม</span><span>${fmtBaht(opts.amount)} บาท</span></div>
    ${opts.vat7 ? `<div class="line"><span class="l">ภาษีมูลค่าเพิ่ม 7%</span><span>${fmtBaht(vatAmt)} บาท</span></div>` : ''}
    ${opts.wht3 ? `<div class="line"><span class="l">หักภาษี ณ ที่จ่าย 3%</span><span>(${fmtBaht(whtAmt)}) บาท</span></div>` : ''}
    <div class="grand">
      <span>จำนวนเงินรวมทั้งสิ้น ${fmtBaht(total)} บาท</span>
      <span class="baht-text">(${escapeHtml(totalTxt)})</span>
    </div>
  </div>

  <h2 class="sec-title">ช่องทางการชำระเงิน</h2>
  <div class="section">
    ${opts.isReceipt ? `
      ${row('วิธีชำระ', paymentLabel(opts.paymentMethod))}
      ${opts.bankRef ? row('เลขอ้างอิง / เลขเช็ค', opts.bankRef) : ''}
    ` : `
      ${opts.owner?.bank_name         ? row('ธนาคาร',  opts.owner.bank_name) : ''}
      ${opts.owner?.bank_account_no   ? row('เลขบัญชี', opts.owner.bank_account_no) : ''}
      ${opts.owner?.bank_account_name ? row('ชื่อบัญชี', opts.owner.bank_account_name) : ''}
    `}
  </div>

  <div class="sig">
    <div class="sig-box">
      <div class="sig-img-area">${opts.ownerSignatureUrl ? `<img class="sig-img" src="${opts.ownerSignatureUrl}" />` : ''}</div>
      <div class="sig-line"></div>
      <div class="sig-role">${opts.isReceipt ? 'ผู้ออกใบเสร็จ' : 'ผู้ออกใบแจ้งหนี้'}</div>
      ${opts.owner?.name ? `<div class="sig-name">(${escapeHtml(opts.owner.name)})</div>` : ''}
      <div class="sig-date">วันที่  .......... / .......... / ..........</div>
    </div>
    <div class="sig-box">
      <div class="sig-img-area">${opts.customerSignatureUrl ? `<img class="sig-img" src="${opts.customerSignatureUrl}" />` : ''}</div>
      <div class="sig-line"></div>
      <div class="sig-role">ผู้ชำระเงิน</div>
      ${opts.customer?.name ? `<div class="sig-name">(${escapeHtml(opts.customer.name)})</div>` : ''}
      <div class="sig-date">วันที่  .......... / .......... / ..........</div>
    </div>
  </div>

</body></html>`
}

function row(label: string, value: string): string {
  return `<div class="row"><div class="lbl">${escapeHtml(label)}</div><div class="val">${escapeHtml(value)}</div></div>`
}

function buildHeaderTemplate(opts: InvoiceOptions): string {
  const fs = "'Noto Sans Thai', 'Tahoma', sans-serif"
  return `
    <style>
      .h { font-family: ${fs}; font-size: 8pt; color: #1A1A1A;
           width: 100%; padding: 0 52pt; box-sizing: border-box;
           border-bottom: 1px solid ${C.border}; padding-bottom: 6pt; padding-top: 10pt;
           display: flex; align-items: center; }
      .h-left { flex: 1; }
      .h-title { font-size: 11pt; font-weight: 700; color: ${C.navy}; }
      .h-docno { font-size: 7.5pt; color: ${C.sub}; margin-top: 2pt; }
      .h-div { width: 1px; height: 28pt; background: ${C.border}; margin: 0 20pt; }
      .h-right { text-align: right; }
      .h-agent { font-size: 8.5pt; font-weight: 700; color: ${C.navy}; }
      .h-phone { font-size: 7.5pt; color: ${C.sub}; margin-top: 2pt; }
    </style>
    <div class="h">
      <div class="h-left">
        <div class="h-title">${escapeHtml(opts.docTitle)}</div>
        ${opts.docId
          ? `<div class="h-docno">เลขที่  ${escapeHtml(opts.docId)}${opts.statusText ? '  ·  ' + escapeHtml(opts.statusText) : ''}  ·  ${escapeHtml(opts.date)}</div>`
          : ''}
      </div>
      ${opts.agentName
        ? `<div class="h-div"></div>
           <div class="h-right">
             <div class="h-agent">${escapeHtml(opts.agentName)}</div>
             ${opts.agentPhone ? `<div class="h-phone">${escapeHtml(opts.agentPhone)}</div>` : ''}
           </div>`
        : ''}
    </div>
  `
}

function buildFooterTemplate(): string {
  const fs = "'Noto Sans Thai', 'Tahoma', sans-serif"
  return `
    <style>
      .f { font-family: ${fs}; font-size: 9pt; color: ${C.sub};
           width: 100%; padding: 0 52pt; box-sizing: border-box;
           border-top: 0.5pt solid ${C.border}; padding-top: 8pt;
           text-align: center; }
    </style>
    <div class="f">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>
  `
}

// ─── Inline signature URLs to base64 ───────────────────────────────

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? 'image/png'
    const ab = await res.arrayBuffer()
    return `data:${ct};base64,${Buffer.from(ab).toString('base64')}`
  } catch { return null }
}

// ─── Public API ────────────────────────────────────────────────────

export async function renderInvoiceReceiptPdf(opts: InvoiceOptions): Promise<Buffer> {
  // Inline signature URLs (Puppeteer header/footer can't load external URLs;
  // body images may also fail intermittently — safer to inline both).
  const ownerSig    = opts.ownerSignatureUrl    && !opts.ownerSignatureUrl.startsWith('data:')
    ? await urlToDataUrl(opts.ownerSignatureUrl) ?? opts.ownerSignatureUrl
    : opts.ownerSignatureUrl
  const customerSig = opts.customerSignatureUrl && !opts.customerSignatureUrl.startsWith('data:')
    ? await urlToDataUrl(opts.customerSignatureUrl) ?? opts.customerSignatureUrl
    : opts.customerSignatureUrl

  const optsInlined: InvoiceOptions = {
    ...opts,
    ownerSignatureUrl:    ownerSig,
    customerSignatureUrl: customerSig,
  }

  const html         = buildFullHtml(optsInlined)
  const headerTpl    = buildHeaderTemplate(optsInlined)
  const footerTpl    = buildFooterTemplate()

  const browser = await getBrowser()
  const page    = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load' })
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTpl,
      footerTemplate: footerTpl,
      margin: { top: '32mm', bottom: '22mm', left: '18mm', right: '18mm' },
    })
    return Buffer.from(buf)
  } finally {
    await page.close()
  }
}
