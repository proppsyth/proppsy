// HTML → PDF via Puppeteer (Chromium-native Thai text rendering)
//
// Production/Vercel: uses @sparticuz/chromium-min + puppeteer-core
//   → Chromium is NOT bundled; it's downloaded from GitHub to /tmp on cold start.
//   → Fresh browser per call (serverless functions can't keep a persistent process).
//
// Local dev: uses full puppeteer with its bundled Chromium (singleton).

import path from 'path'
import fs from 'fs'

const IS_SERVERLESS = !!process.env.VERCEL

// Sparticuz chromium binary download URL — fetched to /tmp on first cold start.
// Must match the version of @sparticuz/chromium-min installed.
const CHROMIUM_REMOTE_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _localBrowser: any | null = null

// ─── Structured logging ───────────────────────────────────────────────────────
// Each subsystem uses its own prefix so logs are grep-able in production:
//   [PDF]      — rendering pipeline (HTML build, render pass, merge)
//   [CHROMIUM] — browser launch and Chromium binary resolution
//
// Route-level prefixes live in route.ts:
//   [CACHE]   — cache hits/misses
//   [PREVIEW] — route handler operations
//
// Upload prefix lives in contracts/actions.ts:
//   [UPLOAD]  — Supabase storage operations

function makeLog(prefix: string) {
  return (step: string, data?: Record<string, unknown>): void => {
    const ts = new Date().toISOString()
    const msg = `[${prefix} ${ts}] ${step}`
    data ? console.log(msg, JSON.stringify(data)) : console.log(msg)
  }
}

const pdfLog = makeLog('PDF')
const chromiumLog = makeLog('CHROMIUM')

// ─── Utilities ────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} after ${ms}ms`)), ms)
    ),
  ])
}

function memMb(): { rss: number; heap: number; ext: number } {
  const m = process.memoryUsage()
  return {
    rss:  Math.round(m.rss  / 1024 / 1024),
    heap: Math.round(m.heapUsed / 1024 / 1024),
    ext:  Math.round(m.external / 1024 / 1024),
  }
}

// ─── Chromium / browser ───────────────────────────────────────────────────────

async function launchServerlessBrowser(): Promise<any> {
  chromiumLog('launch.start', { env: 'serverless' })
  const chromiumMod = await import('@sparticuz/chromium-min')
  const chromium = chromiumMod.default
  const puppeteerCore = await import('puppeteer-core')

  chromiumLog('resolve.start', { remoteUrl: CHROMIUM_REMOTE_URL })
  const executablePath = await withTimeout(
    chromium.executablePath(CHROMIUM_REMOTE_URL),
    30000,
    'chromium.executablePath'
  )
  chromiumLog('resolve.done', { executablePath })

  const browser = await puppeteerCore.launch({
    args: [...chromium.args, '--disable-dev-shm-usage'],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  })
  chromiumLog('launch.done')
  return browser
}

async function launchLocalBrowser(): Promise<any> {
  if (_localBrowser && _localBrowser.connected) {
    chromiumLog('reuse.local')
    return _localBrowser
  }
  chromiumLog('launch.local.start')
  const { default: puppeteer } = await import('puppeteer')
  _localBrowser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  })
  chromiumLog('launch.local.done')
  return _localBrowser
}

async function loadPdfDocument(buf: Buffer): Promise<any> {
  const { PDFDocument } = await import('pdf-lib')
  return PDFDocument.load(buf)
}

async function createPdfDocument(): Promise<any> {
  const { PDFDocument } = await import('pdf-lib')
  return PDFDocument.create()
}

// ─── Font data (embed Noto Sans Thai as base64 @font-face) ───────────────────
// Fonts are embedded as data URLs so Puppeteer never makes a network request
// for them. External font loading (e.g. Google Fonts) is explicitly NOT used —
// it can stall Puppeteer for seconds or minutes on a serverless cold start.

function fontDataUrl(file: string): string | null {
  const p = path.join(process.cwd(), 'public', 'fonts', file)
  if (!fs.existsSync(p)) return null
  const buf = fs.readFileSync(p)
  return `data:font/ttf;base64,${buf.toString('base64')}`
}

const FONT_REG_URL  = fontDataUrl('NotoSansThai-Regular.ttf')
const FONT_BOLD_URL = fontDataUrl('NotoSansThai-Bold.ttf')

if (!FONT_REG_URL || !FONT_BOLD_URL) {
  console.warn('[PDF] WARNING: NotoSansThai fonts not found in public/fonts/ — Thai text will render with fallback fonts. Expected: NotoSansThai-Regular.ttf, NotoSansThai-Bold.ttf')
}

// ─── Signature image inlining ─────────────────────────────────────────────────
// Puppeteer's header/footer templates run in an isolated context. External URLs
// often fail silently or stall. We convert all signature image URLs to base64
// data URLs here — before the HTML is given to Puppeteer.
//
// IMPORTANT: If inlining fails, we set signatureUrl to null (no image).
// We must NOT fall back to the original external URL — that would let a broken
// or slow Supabase signed URL block Chromium's render loop.

async function urlToDataUrl(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000) // 5s max per image
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/png'
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function inlineSignerImages(signers: PdfSigner[]): Promise<PdfSigner[]> {
  return Promise.all(signers.map(async sig => {
    if (!sig.signatureUrl) return sig
    if (sig.signatureUrl.startsWith('data:')) return sig
    pdfLog('sig.inline.start', { label: sig.label, url: sig.signatureUrl.substring(0, 60) })
    const dataUrl = await urlToDataUrl(sig.signatureUrl)
    if (!dataUrl) {
      // Inlining failed — drop the image rather than passing the external URL
      // to Puppeteer's footer context where it would trigger a network stall.
      pdfLog('sig.inline.failed', { label: sig.label })
      return { ...sig, signatureUrl: null }
    }
    pdfLog('sig.inline.done', { label: sig.label })
    return { ...sig, signatureUrl: dataUrl }
  }))
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
  /** Contract date string (e.g. "24 พฤษภาคม 2569") shown in signature-final when signer has no signedAt. */
  contractDate?: string
  features: {
    pageNumbers:    boolean
    miniSignatures: boolean
    finalSignature: boolean
  }
}

function buildFullHtml(opts: RenderOptions): string {
  const { bodyHtml, contractId, docTypeLabel, statusText, signers, features, contractDate } = opts

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

  const finalSigHtml = features.finalSignature && signers.length > 0 ? `
    <div class="final-sig">
      ${signers.map(sig => {
        // Prefer the actual e-signature date; fall back to contract date; last resort: blank placeholder.
        const dateText = sig.signedAt
          ? escapeAttr(sig.signedAt)
          : (contractDate ? `วันที่ ${escapeAttr(contractDate)}` : 'วันที่  .......... / .......... / ..........')
        return `
        <div class="final-sig-box">
          <div class="final-sig-imgarea">
            ${sig.signatureUrl ? `<img class="final-sig-img" src="${sig.signatureUrl}" />` : ''}
          </div>
          <div class="final-sig-line"></div>
          <div class="final-sig-role">${escapeAttr(sig.label)}</div>
          ${sig.name ? `<div class="final-sig-name">(${escapeAttr(sig.name)})</div>` : ''}
          <div class="final-sig-date">${dateText}</div>
        </div>`
      }).join('')}
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

  h1 {
    font-size: 13pt; font-weight: 700;
    color: #1B3B6F; text-align: center;
    margin: 6pt 0 12pt 0;
    letter-spacing: 0.5pt;
  }
  h2 {
    font-size: 10pt; font-weight: 700; color: #1B3B6F;
    padding: 2pt 0 4pt 0;
    border-bottom: 1.5pt solid #3B6CD4;
    margin: 14pt 0 8pt 0;
  }
  p.p, p.p-bold {
    margin: 0 0 2pt 0;
    text-align: left;
  }
  p.p-bold { font-weight: 700; }
  .blank   { height: 2pt; }
  .space   { /* height set inline */ }
  .page-break { page-break-before: always; }

  /* Horizontal rule — thin separator line */
  .hr-line {
    border: none;
    border-bottom: 0.8pt solid #C8D6E8;
    margin: 4pt 0;
  }
  /* Section divider — prominent line with vertical rhythm */
  .divider {
    border: none;
    border-bottom: 2pt solid #3B6CD4;
    margin: 10pt 0 6pt 0;
  }

  .table { display: block; margin: 0 0 2pt 0; }
  .row {
    display: flex;
    align-items: flex-start;
    border-bottom: 0.4pt solid #ECF0F8;
    page-break-inside: avoid;
  }
  .row:last-child { border-bottom: none; }
  .cell {
    padding: 2pt 5pt;
    line-height: 1.75;
    word-break: break-word;
  }

  /* Bank info card — {bankcard:BANK|ACCOUNTNAME|ACCOUNTNO} */
  .bankcard {
    display: flex;
    align-items: center;
    gap: 12pt;
    padding: 8pt 12pt;
    border: 0.5pt solid #D0DBF0;
    border-radius: 6pt;
    margin: 6pt 0;
    page-break-inside: avoid;
  }
  .bankcard-logo {
    flex-shrink: 0;
    width: 56pt; height: 56pt;
    display: flex; align-items: center; justify-content: center;
  }
  .bankcard-logo img { max-width: 54pt; max-height: 54pt; object-fit: contain; }
  .bankcard-info { flex: 1; }
  .bankcard-bank { font-weight: 700; font-size: 10.5pt; margin-bottom: 4pt; }
  .bankcard-line { font-size: 9pt; color: #4A4A4A; margin-top: 2pt; }

  /* Compact bankcard variant — {bankcard:compact:...} — Invoice/Receipt only */
  .bankcard-compact { padding: 4pt 10pt; margin: 2pt 0; gap: 8pt; }
  .bankcard-compact .bankcard-logo { width: 36pt; height: 36pt; }
  .bankcard-compact .bankcard-bank { font-size: 9.5pt; margin-bottom: 2pt; }
  .bankcard-compact .bankcard-line { font-size: 8.5pt; margin-top: 1pt; }
  .a-l { text-align: left; }
  .a-c { text-align: center; }
  .a-r { text-align: right; }
  .cell.value {
    border-bottom: 0.8pt solid #1A1A1A;
  }
  strong { font-weight: 700; }

  /* ── Financial table row variants ───────────────────────────── */

  /* Column-header row: bold labels over a light navy tint */
  .row-header {
    background: #EDF1FB;
    border-bottom: 1pt solid #3B6CD4;
  }
  .row-header .cell {
    color: #1B3B6F;
    font-weight: 700;
    font-size: 8.5pt;
    padding: 3.5pt 5pt;
  }

  /* Total-net row: strong emphasis with navy border top+bottom */
  .row.row-total {
    background: #EEF3FF;
    border-top:    1.5pt solid #1B3B6F !important;
    border-bottom: 1.5pt solid #1B3B6F !important;
    margin: 3pt 0;
  }
  .row-total .cell {
    color: #1B3B6F;
    font-weight: 700;
    font-size: 10.5pt;
    padding: 5pt 5pt;
    border-bottom: none !important;
  }

  /* Amount-in-words row: muted framed box below total */
  .row.row-amtwords {
    background: #F7F9FF;
    border: 0.6pt solid #C8D3EB;
    border-radius: 3pt;
    margin-top: 3pt;
    border-bottom: 0.6pt solid #C8D3EB !important;
  }
  .row-amtwords .cell {
    color: #556080;
    padding: 4pt 10pt;
    font-style: italic;
    border-bottom: none !important;
  }

  /* Compact metadata info row: muted right-aligned labels + soft underlined values */
  .row-info .cell.a-r.label,
  .row-info .cell.a-c.label {
    color: #6B7A99;
    font-size: 8.5pt;
  }
  .row-info .cell.value {
    border-bottom: 0.6pt solid #8090B0;
  }

  .final-sig {
    margin-top: 12pt;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 20pt;
    padding: 8pt 20pt 0;
    page-break-inside: avoid;
    break-inside: avoid;
    -webkit-column-break-inside: avoid;
  }
  .final-sig-box {
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
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
  const { docTypeLabel, contractId, statusText, agentName, agentPhone } = opts
  const fontFace = (FONT_REG_URL && FONT_BOLD_URL) ? `
    @font-face { font-family: 'NotoThai'; src: url('${FONT_REG_URL}') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'NotoThai'; src: url('${FONT_BOLD_URL}') format('truetype'); font-weight: 700; }
  ` : ''
  const fontStack = "'NotoThai', 'Noto Sans Thai', 'Tahoma', sans-serif"
  return `
    <style>
      ${fontFace}
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
  const { signers, features } = opts
  const fontFace = (FONT_REG_URL && FONT_BOLD_URL) ? `
    @font-face { font-family: 'NotoThai'; src: url('${FONT_REG_URL}') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'NotoThai'; src: url('${FONT_BOLD_URL}') format('truetype'); font-weight: 700; }
  ` : ''
  const fontStack = "'NotoThai', 'Noto Sans Thai', 'Tahoma', sans-serif"
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
      ${fontFace}
      * { box-sizing: border-box; }
      .footer-wrap {
        font-family: ${fontStack};
        width: 100%; padding: 0 52pt;
      }
      .mini-sigs-row {
        display: flex; justify-content: space-between; align-items: flex-end;
        padding-bottom: 4pt;
      }
      .mini-sig { width: 112pt; text-align: center; }
      .mini-sig-img { height: 22pt; }
      .mini-sig-img img { max-width: 68pt; max-height: 22pt; object-fit: contain; }
      .mini-sig-line { width: 104pt; border-bottom: 0.8pt solid #1A1A1A; margin: 0 auto 2pt auto; }
      .mini-sig-label { font-size: 7.5pt; color: #4A4A4A; }
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

// Bottom margin is sized for the footer content:
//   42mm — accommodates mini-signature footer (two sig boxes + page number ≈ 30mm actual content)
//   20mm — page-number-only footer (~10mm actual content, 20mm gives comfortable buffer)
// Using 42mm when no mini-sigs wastes ~32mm = ~91pt of content area per page — enough to force
// the final-sig block to page 2 even when content would otherwise fit.
const PDF_MARGIN_BASE = {
  top:   '32mm',
  left:  '18mm',
  right: '18mm',
}
const PDF_MARGIN      = { ...PDF_MARGIN_BASE, bottom: '42mm' }  // with mini-sigs
const PDF_MARGIN_SLIM = { ...PDF_MARGIN_BASE, bottom: '20mm' }  // page-number only

async function renderPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any,
  html: string,
  headerTemplate: string,
  footerTemplate: string,
  margin: typeof PDF_MARGIN,
  pageRanges?: string,
): Promise<Buffer> {
  pdfLog('renderPdf.start', { pageRanges: pageRanges ?? 'all' })
  const page = await browser.newPage()

  // Block all external HTTP(S) requests — every resource in our HTML is either
  // a data URL (fonts, signature images) or inline CSS. If anything external
  // slips in (broken data URL, CDN image in template body), abort it immediately
  // rather than letting Chromium stall waiting for a network response.
  await page.setRequestInterception(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page.on('request', (req: any) => {
    const reqUrl = req.url() as string
    const resType = req.resourceType() as string
    if (resType === 'document' || reqUrl.startsWith('data:') || reqUrl.startsWith('about:')) {
      req.continue()
    } else {
      pdfLog('renderPdf.request.blocked', { type: resType, url: reqUrl.substring(0, 80) })
      req.abort('blockedbyclient')
    }
  })

  try {
    await withTimeout(
      page.setContent(html, { waitUntil: 'load' }),
      30000,
      'page.setContent'
    )
    pdfLog('renderPdf.setContent.done')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf: any = await withTimeout(
      page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin,
        ...(pageRanges ? { pageRanges } : {}),
      }),
      40000,
      'page.pdf'
    )
    pdfLog('renderPdf.done', { bytes: (buf as Buffer).length })
    return Buffer.from(buf as Uint8Array)
  } finally {
    await page.close().catch((e: Error) => pdfLog('renderPdf.page.close.error', { error: e.message }))
  }
}

export async function htmlToPdfBuffer(opts: RenderOptions): Promise<Buffer> {
  pdfLog('start', { contractId: opts.contractId, serverless: IS_SERVERLESS })

  const signersInlined = await inlineSignerImages(opts.signers)
  opts = { ...opts, signers: signersInlined }

  const html              = buildFullHtml(opts)
  const headerTpl         = buildHeaderTemplate(opts)
  const footerWithMini    = buildFooterTemplate(opts)
  const footerWithoutMini = buildFooterTemplate({ ...opts, features: { ...opts.features, miniSignatures: false } })

  // Log HTML size — very large HTML (>500 KB) can noticeably slow Chromium.
  const htmlBytes = Buffer.byteLength(html, 'utf8')
  pdfLog('html.size', { bytes: htmlBytes, kb: Math.round(htmlBytes / 1024) })
  if (htmlBytes > 500 * 1024) {
    pdfLog('html.size.warning', { kb: Math.round(htmlBytes / 1024), msg: 'Large HTML may slow render' })
  }

  const memBefore = memMb()
  pdfLog('memory.before', memBefore)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any
  const isOwned = IS_SERVERLESS

  let result: Buffer
  try {
    browser = IS_SERVERLESS
      ? await launchServerlessBrowser()
      : await launchLocalBrowser()

    if (!opts.features.miniSignatures || opts.signers.length === 0) {
      // No mini-signature footer → page number only → use slim bottom margin.
      // 42mm was sized for the mini-sig footer; using it here wastes ~91pt of
      // content area and can force the final-sig block onto a second page.
      const margin = opts.features.miniSignatures ? PDF_MARGIN : PDF_MARGIN_SLIM
      pdfLog('singlePass', { bottomMargin: margin.bottom })
      result = await renderPdf(browser, html, headerTpl, footerWithMini, margin)
    } else {
      // Two-pass strategy — hide mini-sigs on last page only:
      //   Pass 1: full PDF with mini-sigs footer → keep pages [1..N-1]
      //   Pass 2: same HTML with no-mini footer  → keep only page N
      //   Merge: [1..N-1] from pass 1 + [N] from pass 2
      pdfLog('twoPass.pass1')
      const fullPdf = await renderPdf(browser, html, headerTpl, footerWithMini, PDF_MARGIN)
      const fullDoc = await loadPdfDocument(fullPdf)
      const totalPages = fullDoc.getPageCount()
      pdfLog('twoPass.pass1.done', { totalPages })

      if (totalPages <= 1) {
        pdfLog('twoPass.singlePage')
        result = await renderPdf(browser, html, headerTpl, footerWithoutMini, PDF_MARGIN)
      } else {
        pdfLog('twoPass.pass2')
        const noMiniPdf = await renderPdf(browser, html, headerTpl, footerWithoutMini, PDF_MARGIN)
        const noMiniDoc = await loadPdfDocument(noMiniPdf)
        const noMiniPageCount = noMiniDoc.getPageCount()
        pdfLog('twoPass.pass2.done', { noMiniPageCount })

        if (noMiniPageCount !== totalPages) {
          pdfLog('twoPass.pageCountMismatch', { totalPages, noMiniPageCount })
          result = fullPdf
        } else {
          const merged = await createPdfDocument()
          const firstPages = await merged.copyPages(
            fullDoc,
            Array.from({ length: totalPages - 1 }, (_, i) => i),
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          firstPages.forEach((p: any) => merged.addPage(p))
          const [lastPage] = await merged.copyPages(noMiniDoc, [totalPages - 1])
          merged.addPage(lastPage)
          const mergedBytes = await merged.save()
          pdfLog('twoPass.merge.done', { pages: totalPages })
          result = Buffer.from(mergedBytes)
        }
      }
    }
  } finally {
    if (isOwned && browser) {
      chromiumLog('close.serverless')
      await browser.close().catch((e: Error) => chromiumLog('close.error', { error: e.message }))
    }
  }

  const memAfter = memMb()
  pdfLog('memory.after', memAfter)
  pdfLog('memory.delta', {
    rss:  memAfter.rss  - memBefore.rss,
    heap: memAfter.heap - memBefore.heap,
  })
  pdfLog('done', { contractId: opts.contractId, bytes: result!.length })

  return result!
}

export async function closePdfBrowser(): Promise<void> {
  if (_localBrowser) {
    await _localBrowser.close()
    _localBrowser = null
  }
}
