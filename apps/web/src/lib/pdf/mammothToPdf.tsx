// Renders mammoth-converted HTML from a filled DOCX template to a PDF Buffer.
// Uses @react-pdf/renderer with Sarabun Thai font.
// Preserves paragraphs, headings, bold text, and simple tables from mammoth output.

import path from 'path'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { createElement } from 'react'

const fontsDir = path.join(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(fontsDir, 'Sarabun-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'Sarabun-Bold.ttf'), fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 9.5,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  h1: { fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 10, marginTop: 8 },
  h2: { fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 10 },
  h3: { fontSize: 10, fontWeight: 700, marginBottom: 4, marginTop: 8 },
  p: { fontSize: 9.5, marginBottom: 4, lineHeight: 1.65 },
  pBlank: { marginBottom: 6 },
  bold: { fontWeight: 700 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ccc', paddingVertical: 2 },
  tableCell: { flex: 1, fontSize: 8.5, paddingHorizontal: 3 },
  tableHead: { flexDirection: 'row', backgroundColor: '#f0f4f8', paddingVertical: 3 },
  tableHeadCell: { flex: 1, fontSize: 8.5, fontWeight: 700, paddingHorizontal: 3 },
  table: { marginBottom: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: '#bbb' },
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 8 },
  bullet: { fontSize: 9.5, marginRight: 5, width: 10 },
  listText: { flex: 1, fontSize: 9.5, lineHeight: 1.65 },
})

// ─── Types ────────────────────────────────────────────────────

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; segments: Segment[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'list'; ordered: boolean; items: string[] }

type Segment = { text: string; bold: boolean }

// ─── Strip HTML tags ──────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .trim()
}

function getInnerHtml(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  return re.exec(html)?.[1] ?? ''
}

// ─── Parse inline bold segments ───────────────────────────────

function parseSegments(html: string): Segment[] {
  const segments: Segment[] = []
  // Match strong/b tags and plain text in order
  const re = /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>|([^<]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== undefined) {
      const t = stripTags(m[1] ?? '')
      if (t) segments.push({ text: t, bold: true })
    } else if (m[2]) {
      const t = stripTags(m[2] ?? '')
      if (t) segments.push({ text: t, bold: false })
    }
  }
  return segments
}

// ─── Parse table ──────────────────────────────────────────────

function parseTable(tableHtml: string): { head: string[]; rows: string[][] } {
  const head: string[] = []
  const rows: string[][] = []

  // Extract thead
  const theadMatch = /<thead[^>]*>([\s\S]*?)<\/thead>/i.exec(tableHtml)
  if (theadMatch) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    let m: RegExpExecArray | null
    while ((m = thRe.exec(theadMatch[1] ?? '')) !== null) {
      head.push(stripTags(m[1] ?? ''))
    }
  }

  // Extract tbody rows (or all rows if no thead)
  const bodyHtml = tableHtml.replace(/<thead[^>]*>[\s\S]*?<\/thead>/i, '')
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trM: RegExpExecArray | null
  while ((trM = trRe.exec(bodyHtml)) !== null) {
    const row: string[] = []
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let tdM: RegExpExecArray | null
    while ((tdM = tdRe.exec(trM[1] ?? '')) !== null) {
      row.push(stripTags(tdM[1] ?? ''))
    }
    if (row.length > 0) {
      if (head.length === 0 && rows.length === 0) {
        // treat first row as header
        head.push(...row)
      } else {
        rows.push(row)
      }
    }
  }

  return { head, rows }
}

// ─── Parse list ───────────────────────────────────────────────

function parseList(html: string, ordered: boolean): string[] {
  const items: string[] = []
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let m: RegExpExecArray | null
  while ((m = liRe.exec(html)) !== null) {
    items.push(stripTags(m[1] ?? ''))
  }
  return items
}

// ─── Parse mammoth HTML into blocks ──────────────────────────

function parseBlocks(html: string): Block[] {
  const blocks: Block[] = []
  // Top-level block elements
  const blockRe = /<(h[1-6]|p|table|ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null

  while ((m = blockRe.exec(html)) !== null) {
    const tag = (m[1] ?? '').toLowerCase()
    const content = m[3] ?? ''

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: parseInt(tag[1] ?? '3') as 1 | 2 | 3, text })
    } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 3, text })
    } else if (tag === 'p') {
      const segs = parseSegments(content)
      blocks.push({ kind: 'p', segments: segs })
    } else if (tag === 'table') {
      blocks.push({ kind: 'table', ...parseTable(content) })
    } else if (tag === 'ul' || tag === 'ol') {
      const items = parseList(content, tag === 'ol')
      if (items.length) blocks.push({ kind: 'list', ordered: tag === 'ol', items })
    }
  }

  return blocks
}

// ─── Render blocks to react-pdf elements ─────────────────────

function renderBlocks(blocks: Block[]) {
  return blocks.map((block, i) => {
    if (block.kind === 'h') {
      const style = block.level === 1 ? s.h1 : block.level === 2 ? s.h2 : s.h3
      return createElement(Text, { key: i, style }, block.text)
    }

    if (block.kind === 'p') {
      if (block.segments.length === 0) {
        return createElement(View, { key: i, style: s.pBlank })
      }
      const children = block.segments.map((seg, j) =>
        createElement(Text, { key: j, style: seg.bold ? s.bold : undefined }, seg.text)
      )
      return createElement(Text, { key: i, style: s.p }, ...children)
    }

    if (block.kind === 'table') {
      const firstRowLen = block.rows[0]?.length ?? 1
      const colFlex = block.head.length > 0 ? block.head.length : firstRowLen
      const headEl = block.head.length > 0
        ? createElement(View, { key: 'head', style: s.tableHead },
            ...block.head.map((h, j) => createElement(Text, { key: j, style: s.tableHeadCell }, String(h)))
          )
        : null

      const rowEls = block.rows.map((row, ri) =>
        createElement(View, { key: ri, style: s.tableRow },
          ...row.map((cell, ci) => createElement(Text, { key: ci, style: s.tableCell }, String(cell)))
        )
      )

      void colFlex // used for conceptual column width — actual flex is per-cell
      return createElement(View, { key: i, style: s.table },
        ...(headEl ? [headEl] : []),
        ...rowEls
      )
    }

    if (block.kind === 'list') {
      return createElement(View, { key: i },
        ...block.items.map((item, li) =>
          createElement(View, { key: li, style: s.listItem },
            createElement(Text, { style: s.bullet }, block.ordered ? `${li + 1}.` : '•'),
            createElement(Text, { style: s.listText }, String(item))
          )
        )
      )
    }

    return null
  }).filter(Boolean)
}

// ─── Main export ──────────────────────────────────────────────

export async function renderMammothHtmlAsPdf(html: string): Promise<Buffer> {
  const blocks = parseBlocks(html)
  const children = renderBlocks(blocks)

  const doc = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: s.page },
      ...children
    )
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(doc as any)
}
