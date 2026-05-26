// HTML → PDF via Puppeteer (Chromium-native Thai text rendering)

import path from 'path'
import fs from 'fs'

// Use `unknown` here to avoid pulling puppeteer types into module graph at
// import time (Next.js 16 + Turbopack RSC streaming chokes on it otherwise).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _browser: any | null = null

async function getBrowser(): Promise<any> {
  if (_browser && _browser.connected) return _browser
  // Dynamic import so Turbopack/RSC don't try to bundle puppeteer's heavy
  // graph (native bindings, fs paths) into the server component chunk.
  const { default: puppeteer } = await import('puppeteer')
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  })
  return _browser
}

async function loadPdfDocument(buf: Buffer): Promise<any> {
  // Dynamic import for the same reason
  const { PDFDocument } = await import('pdf-lib')
  return PDFDocument.load(buf)
}

async function createPdfDocument(): Promise<any> {
  const { PDFDocument } = await import('pdf-lib')
  return PDFDocument.create()
}

// ─── Font data (embed Noto Sans Thai as base64 for CSS @font-face) ─

function fontDataUrl(file: string): string | null {
  const p = path.join(process.cwd(), 'public', 'fonts', file)
  if (!fs.existsSync(p)) return null
  const buf = fs.readFileSync(p)
  return `data:font/ttf;base64,${buf.toString('base64')}`
}

const FONT_REG_URL  = fontDataUrl('NotoSansThai-Regular.ttf')
const FONT_BOLD_URL = fontDataUrl('NotoSansThai-Bold.ttf')

// ─── Fetch external image and convert to base64 data URL ─────────
// Puppeteer's footerTemplate runs in an isolated context with restricted
// resource loading — external URLs often fail. We inline images as data URLs.

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/png'
    const arrayBuffer = await res.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

async function inlineSignerImages(signers: PdfSigner[]): Promise<PdfSigner[]> {
  return Promise.all(signers.map(async sig => {
    if (!sig.signatureUrl || sig.signatureUrl.startsWith('data:')) return sig
    const dataUrl = await urlToDataUrl(sig.signatureUrl)
    return { ...sig, signatureUrl: dataUrl ?? sig.signatureUrl }
  }))
}

// ─── Public API ────────────────────────────────────────────────────

export interface PdfSigner {
  label:         string
  name:          string
  signatureUrl?: string | null
  signedAt?:     string | null
}

export interface RenderOptions {
  bodyHtml:      string
  contractId:    string
  docTypeLabel:  string
  agentName:     string
  agentPhone:    string
  statusText:    string
  signers:       PdfSigner[]
  features: {
    pageNumbers:    boolean
    miniSignatures: boolean
    finalSignature: boolean
  }
}

function buildFullHtml(opts: RenderOptions): string {
  const { bodyHtml, contractId, docTypeLabel, statusText, signers, features } = opts

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

  // Final-sig block (rendered at end of body, last page)
  const finalSigHtml = features.finalSignature && signers.length > 0 ? `
    <div class="final-sig">
      ${signers.map(sig => `
        <div class="final-sig-box">
          <div class="final-sig-imgarea">
            ${sig.signatureUrl ? `<img class="final-sig-img" src="${sig.signatureUrl}" />` : ''}
          </div>
          <div class="final-sig-line"></div>
          <div class="final-sig-role">${escapeAttr(sig.label)}</div>
          ${sig.name ? `<div class="final-sig-name">(${escapeAttr(sig.name)})</div>` : ''}
          <div class="final-sig-date">${escapeAttr(sig.signedAt ?? 'วันที่  .......... / .......... / ..........')}</div>
        </div>
      `).join('')}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>${escapeAttr(docTypeLabel)} ${escapeAttr(contractId)}</title>
<style>
  ${fontFace}
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'NotoThai', sans-serif;
    font-size: 9.5pt;
    color: #1A1A1A;
    line-height: 1.7;
  }
  /* Header rendered via Puppeteer's headerTemplate; body has its own padding via @page margin */

  h1 {
    font-size: 13pt; font-weight: 700;
    color: #1B3B6F; text-align: center;
    margin: 8pt 0 16pt 0;
    letter-spacing: 0.5pt;
  }
  h2 {
    font-size: 10pt; font-weight: 700; color: #1B3B6F;
    padding: 2pt 0 4pt 0;
    border-bottom: 1.5pt solid #3B6CD4;
    margin: 18pt 0 10pt 0;
  }
  p.p, p.p-bold {
    margin: 0 0 5pt 0;
    text-align: left;
  }
  p.p-bold { font-weight: 700; }
  .blank   { height: 6pt; }
  .space   { /* height set inline */ }
  .page-break { page-break-before: always; }

  .table { display: block; margin: 0; }
  .row {
    display: flex;
    align-items: flex-end;
    page-break-inside: avoid;
  }
  .cell {
    padding: 2pt 4pt;
    line-height: 1.7;
  }
  .a-l { text-align: left; }
  .a-c { text-align: center; }
  .a-r { text-align: right; }
  .cell.value {
    border-bottom: 0.8pt solid #1A1A1A;
  }
  strong { font-weight: 700; }

  /* Final signature block (last page) */
  .final-sig {
    margin-top: 40pt;
    padding-top: 16pt;
    display: flex;
    justify-content: space-around;
    padding-left: 20pt;
    padding-right: 20pt;
    page-break-inside: avoid;
  }
  .final-sig-box {
    width: 42%;
    text-align: center;
  }
  .final-sig-imgarea {
    height: 54pt;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 6pt;
  }
  .final-sig-img { max-width: 110pt; max-height: 48pt; object-fit: contain; }
  .final-sig-line {
    width: 100%;
    border-bottom: 1.2pt solid #1B3B6F;
    margin-bottom: 7pt;
  }
  .final-sig-role { font-size: 9pt; font-weight: 700; color: #1B3B6F; margin-bottom: 3pt; }
  .final-sig-name { font-size: 8.5pt; color: #4A4A4A; margin-bottom: 10pt; }
  .final-sig-date { font-size: 7.5pt; color: #888; margin-top: 4pt; }
</style>
</head>
<body>
${bodyHtml}
${finalSigHtml}
</body>
</html>`
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHeaderTemplate(opts: RenderOptions): string {
  // Puppeteer requires inline styles in header/footer templates.
  const { docTypeLabel, contractId, statusText, agentName, agentPhone } = opts
  const fontStack = "'Noto Sans Thai', 'Tahoma', sans-serif"
  return `
    <style>
      .h { font-family: ${fontStack}; font-size: 8pt; color: #1A1A1A;
           width: 100%; padding: 0 52pt; box-sizing: border-box;
           border-bottom: 1px solid #D0D8E8; padding-bottom: 6pt; padding-top: 10pt;
           display: flex; align-items: center; }
      .h-left { flex: 1; }
      .h-title { font-size: 11pt; font-weight: 700; color: #1B3B6F; }
      .h-docno { font-size: 7.5pt; color: #4A4A4A; margin-top: 2pt; }
      .h-div { width: 1px; height: 28pt; background: #D0D8E8; margin: 0 20pt; }
      .h-right { text-align: right; }
      .h-agent { font-size: 8.5pt; font-weight: 700; color: #1B3B6F; }
      .h-phone { font-size: 7.5pt; color: #4A4A4A; margin-top: 2pt; }
    </style>
    <div class="h">
      <div class="h-left">
        <div class="h-title">${escapeAttr(docTypeLabel)}</div>
        ${contractId ? `<div class="h-docno">เลขที่  ${escapeAttr(contractId)}  ·  ${escapeAttr(statusText)}</div>` : ''}
      </div>
      ${agentName ? `<div class="h-div"></div>
        <div class="h-right">
          <div class="h-agent">${escapeAttr(agentName)}</div>
          ${agentPhone ? `<div class="h-phone">${escapeAttr(agentPhone)}</div>` : ''}
        </div>` : ''}
    </div>
  `
}

function buildFooterTemplate(opts: RenderOptions): string {
  // Puppeteer provides page numbers via <span class="pageNumber|totalPages">.
  // Mini-sigs on every page EXCEPT last: handled via CSS using totalPages comparison.
  const { signers, features } = opts
  const fontStack = "'Noto Sans Thai', 'Tahoma', sans-serif"
  const miniSigBlock = features.miniSignatures && signers.length > 0 ? `
    <div class="mini-sigs-row">
      ${[0, 1].map(i => {
        const sig = signers[i]
        return `<div class="mini-sig">
          <div class="mini-sig-img">${sig?.signatureUrl ? `<img src="${sig.signatureUrl}" />` : ''}</div>
          <div class="mini-sig-line"></div>
          <div class="mini-sig-label">${escapeAttr(sig?.label ?? '')}</div>
        </div>`
      }).join('')}
    </div>
  ` : ''
  const pageNumBlock = features.pageNumbers ? `
    <div class="page-num">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>
  ` : ''

  return `
    <style>
      * { box-sizing: border-box; }
      .footer-wrap {
        font-family: ${fontStack};
        width: 100%; padding: 0 52pt;
      }
      .mini-sigs-row {
        display: flex; justify-content: space-between; align-items: flex-end;
        padding-bottom: 4pt;
      }
      .mini-sig { width: 100pt; text-align: center; }
      .mini-sig-img { height: 18pt; }
      .mini-sig-img img { max-width: 60pt; max-height: 18pt; object-fit: contain; }
      .mini-sig-line { width: 90pt; border-bottom: 0.8pt solid #1A1A1A; margin: 0 auto 2pt auto; }
      .mini-sig-label { font-size: 7pt; color: #4A4A4A; }
      .page-num {
        text-align: center;
        font-size: 9pt; color: #4A4A4A;
        border-top: 0.5pt solid #D0D8E8;
        padding-top: 10pt;
      }
    </style>
    <div class="footer-wrap">
      ${miniSigBlock}
      ${pageNumBlock}
    </div>
  `
}

// PDF margins (Puppeteer uses mm, not pt).
// CRITICAL: must be identical for both passes (with-mini and without-mini),
// otherwise the body content area differs → page count differs → pageRanges
// for the second render points beyond the actual page count.
const PDF_MARGIN = {
  top:    '32mm',
  bottom: '42mm',
  left:   '18mm',
  right:  '18mm',
}

/** Render full HTML to PDF buffer with given header/footer templates */
async function renderPdf(
  html: string,
  headerTemplate: string,
  footerTemplate: string,
  margin: typeof PDF_MARGIN,
  pageRanges?: string,
): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load' })
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin,
      ...(pageRanges ? { pageRanges } : {}),
    })
    return Buffer.from(buf)
  } finally {
    await page.close()
  }
}

export async function htmlToPdfBuffer(opts: RenderOptions): Promise<Buffer> {
  // Inline signature images as base64 data URLs so Puppeteer's footerTemplate
  // can render them (external URLs don't load in isolated footer context).
  const signersInlined = await inlineSignerImages(opts.signers)
  opts = { ...opts, signers: signersInlined }

  const html         = buildFullHtml(opts)
  const headerTpl    = buildHeaderTemplate(opts)
  const footerWithMini    = buildFooterTemplate(opts)
  const footerWithoutMini = buildFooterTemplate({ ...opts, features: { ...opts.features, miniSignatures: false } })

  // If mini-sigs are NOT enabled, just render once
  if (!opts.features.miniSignatures || opts.signers.length === 0) {
    return renderPdf(html, headerTpl, footerWithMini, PDF_MARGIN)
  }

  // Two-pass strategy to hide mini-sigs on LAST page only:
  //   1) Render full PDF with mini-sigs footer → keep pages [1..N-1]
  //   2) Render same PDF with footer-without-mini-sigs → keep only page N
  //   3) Merge: [1..N-1] from #1 + [N] from #2
  // Both renders MUST use identical margins → identical page count.
  const fullPdf = await renderPdf(html, headerTpl, footerWithMini, PDF_MARGIN)
  const fullDoc = await loadPdfDocument(fullPdf)
  const totalPages = fullDoc.getPageCount()

  if (totalPages <= 1) {
    // Single page → render without mini-sigs
    return renderPdf(html, headerTpl, footerWithoutMini, PDF_MARGIN)
  }

  // Second pass: full doc again, but with no-mini footer. Same margins → same N pages.
  const noMiniPdf = await renderPdf(html, headerTpl, footerWithoutMini, PDF_MARGIN)
  const noMiniDoc = await loadPdfDocument(noMiniPdf)
  const noMiniPageCount = noMiniDoc.getPageCount()

  // Defensive: if page counts diverge (shouldn't happen with same margins),
  // fall back to single full render.
  if (noMiniPageCount !== totalPages) {
    return fullPdf
  }

  const merged = await createPdfDocument()
  // Pages 0..N-2 from fullPdf (with mini-sigs)
  const firstPages = await merged.copyPages(
    fullDoc,
    Array.from({ length: totalPages - 1 }, (_, i) => i),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  firstPages.forEach((p: any) => merged.addPage(p))
  // Last page from noMiniPdf (no mini-sigs)
  const [lastPage] = await merged.copyPages(noMiniDoc, [totalPages - 1])
  merged.addPage(lastPage)

  const mergedBytes = await merged.save()
  return Buffer.from(mergedBytes)
}

// Optional graceful shutdown hook
export async function closePdfBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close()
    _browser = null
  }
}
