// Premium PDF renderer — mammoth HTML → polished A4 React PDF document.
// Design: deep navy + gold palette, Sarabun Thai font, fixed header/footer, signature block.

import path from 'path'
import React from 'react'
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'

// ─── Fonts ────────────────────────────────────────────────────

const fontsDir = path.join(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(fontsDir, 'Sarabun-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'Sarabun-Bold.ttf'),    fontWeight: 700 },
  ],
})

// ─── Design Tokens ────────────────────────────────────────────

const C = {
  navy:      '#1B3A5C',
  navyLight: '#2D5180',
  gold:      '#C9A227',
  text:      '#1a1a1a',
  muted:     '#64748B',
  border:    '#CBD5E1',
  sectionBg: '#F0F4F8',
  stripeBg:  '#F8FAFF',
  white:     '#FFFFFF',
}

// Header height determines paddingTop; footer height determines paddingBottom.
const HEADER_H = 64
const FOOTER_H = 50

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily:       'Sarabun',
    fontSize:         9.5,
    color:            C.text,
    backgroundColor:  C.white,
    paddingTop:       HEADER_H + 14,
    paddingBottom:    FOOTER_H + 14,
    paddingHorizontal: 52,
    lineHeight:       1.65,
  },

  // ── Fixed Header (every page) ──────────────────────────────
  header: {
    position:        'absolute',
    top: 0, left: 0, right: 0,
    height:          HEADER_H,
    backgroundColor: C.navy,
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 52,
    paddingVertical: 10,
  },
  headerLeft: { flex: 1 },
  headerBrand: {
    fontSize:    7,
    fontWeight:  700,
    color:       C.gold,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize:   11.5,
    fontWeight: 700,
    color:      C.white,
  },
  headerRight: { alignItems: 'flex-end' },
  headerDocNo: {
    fontSize:   9,
    fontWeight: 700,
    color:      C.white,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      3,
    alignSelf:         'flex-end',
  },
  badgeDraft:     { backgroundColor: '#F59E0B' },
  badgeFinal:     { backgroundColor: C.gold },
  badgeActive:    { backgroundColor: '#10B981' },
  badgeText:      { fontSize: 6.5, fontWeight: 700, color: '#1a1a1a' },

  // ── Fixed Footer (every page) ──────────────────────────────
  footer: {
    position:    'absolute',
    bottom: 0, left: 0, right: 0,
    height:      FOOTER_H,
    flexDirection: 'row',
    alignItems:  'center',
    paddingHorizontal: 52,
    borderTopWidth:  0.5,
    borderTopColor:  C.border,
  },
  footerL: { flex: 1, fontSize: 7.5, color: C.muted },
  footerC: { flex: 1, fontSize: 7.5, color: C.muted, textAlign: 'center' },
  footerR: { flex: 1, fontSize: 7.5, color: C.muted, textAlign: 'right' },

  // ── Content typography ─────────────────────────────────────
  h1: {
    fontSize:     13,
    fontWeight:   700,
    textAlign:    'center',
    color:        C.navy,
    marginTop:    4,
    marginBottom: 10,
  },
  h2Wrap: { marginTop: 16, marginBottom: 6 },
  h2: {
    fontSize:        9.5,
    fontWeight:      700,
    color:           C.navy,
    backgroundColor: C.sectionBg,
    paddingVertical: 5,
    paddingLeft:     10,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  h3: {
    fontSize:     9.5,
    fontWeight:   700,
    color:        C.text,
    marginTop:    10,
    marginBottom: 3,
  },
  p: {
    fontSize:     9.5,
    lineHeight:   1.72,
    marginBottom: 5,
    textAlign:    'justify',
  },
  pBlank:  { height: 5 },
  bold:    { fontWeight: 700 },

  // ── Tables ─────────────────────────────────────────────────
  tableWrap: {
    marginVertical: 8,
    borderWidth:    0.5,
    borderColor:    C.border,
  },
  tHead: {
    flexDirection:   'row',
    backgroundColor: C.navy,
  },
  tHeadCell: {
    flex:             1,
    fontSize:         8.5,
    fontWeight:       700,
    color:            C.white,
    paddingVertical:  5,
    paddingHorizontal: 8,
  },
  tRow: {
    flexDirection:   'row',
    borderTopWidth:  0.3,
    borderTopColor:  C.border,
  },
  tRowAlt: {
    flexDirection:   'row',
    backgroundColor: C.stripeBg,
    borderTopWidth:  0.3,
    borderTopColor:  C.border,
  },
  tCell: {
    flex:             1,
    fontSize:         8.5,
    paddingVertical:  4,
    paddingHorizontal: 8,
  },

  // ── Lists ──────────────────────────────────────────────────
  listWrap: { marginVertical: 4 },
  listItem: {
    flexDirection: 'row',
    marginBottom:  3,
    paddingLeft:   4,
  },
  bullet: {
    fontSize:    9.5,
    marginRight: 6,
    color:       C.gold,
    width:       12,
  },
  listText: {
    flex:       1,
    fontSize:   9.5,
    lineHeight: 1.65,
  },

  // ── Horizontal rule ────────────────────────────────────────
  hr: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginVertical:    10,
  },

  // ── Signature block ────────────────────────────────────────
  sigSection: {
    marginTop:      36,
    paddingTop:     20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sigTitle: {
    fontSize:     9,
    fontWeight:   700,
    color:        C.navy,
    textAlign:    'center',
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  sigRow: {
    flexDirection:  'row',
    justifyContent: 'space-around',
  },
  sigBox:    { alignItems: 'center', width: '30%' },
  sigSpacer: { height: 40 },
  sigImg: {
    width:     84,
    height:    34,
    objectFit: 'contain',
    marginBottom: 4,
  },
  sigLine: {
    width:             '100%',
    borderBottomWidth: 0.8,
    borderBottomColor: '#444',
    marginBottom:      5,
  },
  sigLabel: {
    fontSize:  8.5,
    color:     C.muted,
    textAlign: 'center',
    marginBottom: 2,
  },
  sigName: {
    fontSize:   8.5,
    fontWeight: 700,
    textAlign:  'center',
  },
  sigDate: {
    fontSize:   7.5,
    color:      C.muted,
    textAlign:  'center',
    marginTop:  3,
  },
})

// ─── Types ────────────────────────────────────────────────────

export interface PdfSigner {
  label:         string
  name:          string
  signatureUrl?: string | null
  signedAt?:     string | null
}

export interface PdfMeta {
  contractId:   string
  docTypeLabel: string
  status?:      string
  isFinalized?: boolean
  generatedAt?: string
  signers?:     PdfSigner[]
}

type Segment = { text: string; bold: boolean }

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; segments: Segment[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'list'; ordered: boolean; items: string[] }

// ─── HTML → Blocks parser ─────────────────────────────────────

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

function parseSegments(html: string): Segment[] {
  const segs: Segment[] = []
  const re = /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>|([^<]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== undefined) {
      const t = stripTags(m[1] ?? '')
      if (t) segs.push({ text: t, bold: true })
    } else if (m[2]) {
      const t = stripTags(m[2] ?? '')
      if (t) segs.push({ text: t, bold: false })
    }
  }
  return segs
}

function parseTable(html: string): { head: string[]; rows: string[][] } {
  const head: string[] = []
  const rows: string[][] = []
  const theadM = /<thead[^>]*>([\s\S]*?)<\/thead>/i.exec(html)
  if (theadM) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    let m: RegExpExecArray | null
    while ((m = thRe.exec(theadM[1] ?? '')) !== null) {
      head.push(stripTags(m[1] ?? ''))
    }
  }
  const bodyHtml = html.replace(/<thead[^>]*>[\s\S]*?<\/thead>/i, '')
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
      if (head.length === 0 && rows.length === 0) head.push(...row)
      else rows.push(row)
    }
  }
  return { head, rows }
}

function parseBlocks(html: string): Block[] {
  const blocks: Block[] = []
  const re = /<(h[1-6]|p|table|ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const tag = (m[1] ?? '').toLowerCase()
    const content = m[3] ?? ''
    if (tag === 'h1') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 1, text })
    } else if (tag === 'h2') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 2, text })
    } else if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 3, text })
    } else if (tag === 'p') {
      const segs = parseSegments(content)
      blocks.push({ kind: 'p', segments: segs })
    } else if (tag === 'table') {
      blocks.push({ kind: 'table', ...parseTable(content) })
    } else if (tag === 'ul' || tag === 'ol') {
      const items: string[] = []
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let li: RegExpExecArray | null
      while ((li = liRe.exec(content)) !== null) {
        items.push(stripTags(li[1] ?? ''))
      }
      if (items.length) blocks.push({ kind: 'list', ordered: tag === 'ol', items })
    }
  }
  return blocks
}

// ─── Block Renderers ──────────────────────────────────────────

function renderBlocks(blocks: Block[]): React.ReactElement[] {
  return blocks.flatMap((block, i) => {
    if (block.kind === 'h') {
      if (block.level === 1) {
        return [<Text key={i} style={s.h1}>{block.text}</Text>]
      }
      if (block.level === 2) {
        return [
          <View key={i} style={s.h2Wrap}>
            <Text style={s.h2}>{block.text}</Text>
          </View>,
        ]
      }
      return [<Text key={i} style={s.h3}>{block.text}</Text>]
    }

    if (block.kind === 'p') {
      if (block.segments.length === 0) {
        return [<View key={i} style={s.pBlank} />]
      }
      return [
        <Text key={i} style={s.p}>
          {block.segments.map((seg, j) => (
            <Text key={j} style={seg.bold ? s.bold : undefined}>{seg.text}</Text>
          ))}
        </Text>,
      ]
    }

    if (block.kind === 'table') {
      return [
        <View key={i} style={s.tableWrap}>
          {block.head.length > 0 && (
            <View style={s.tHead}>
              {block.head.map((h, j) => (
                <Text key={j} style={s.tHeadCell}>{h}</Text>
              ))}
            </View>
          )}
          {block.rows.map((row, ri) => (
            <View key={ri} style={ri % 2 === 0 ? s.tRow : s.tRowAlt}>
              {row.map((cell, ci) => (
                <Text key={ci} style={s.tCell}>{cell}</Text>
              ))}
            </View>
          ))}
        </View>,
      ]
    }

    if (block.kind === 'list') {
      return [
        <View key={i} style={s.listWrap}>
          {block.items.map((item, li) => (
            <View key={li} style={s.listItem}>
              <Text style={s.bullet}>{block.ordered ? `${li + 1}.` : '●'}</Text>
              <Text style={s.listText}>{item}</Text>
            </View>
          ))}
        </View>,
      ]
    }

    return []
  })
}

// ─── Signature Block ──────────────────────────────────────────

function SignatureBlock({ signers }: { signers: PdfSigner[] }) {
  return (
    <View style={s.sigSection}>
      <Text style={s.sigTitle}>ลายเซ็นคู่สัญญา / Signatures</Text>
      <View style={s.sigRow}>
        {signers.map((sig, i) => (
          <View key={i} style={s.sigBox}>
            {sig.signatureUrl
              ? <Image style={s.sigImg} src={sig.signatureUrl} />
              : <View style={s.sigSpacer} />
            }
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{sig.label}</Text>
            {sig.name ? <Text style={s.sigName}>({sig.name})</Text> : null}
            <Text style={s.sigDate}>
              {sig.signedAt ?? 'วันที่  _____ / _____ / _____'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Full Document ────────────────────────────────────────────

function ContractPdfDocument({
  html,
  meta,
}: {
  html: string
  meta: Required<PdfMeta>
}) {
  const blocks   = parseBlocks(html)
  const children = renderBlocks(blocks)

  const badgeStyle = meta.isFinalized ? s.badgeFinal
    : meta.status === 'draft'         ? s.badgeDraft
    : s.badgeActive
  const badgeLabel = meta.isFinalized ? 'FINALIZED'
    : meta.status === 'draft'         ? 'DRAFT'
    : (meta.status ?? 'DRAFT').toUpperCase().replace(/_/g, ' ')

  return (
    <Document title={`${meta.docTypeLabel} ${meta.contractId}`}>
      <Page size="A4" style={s.page}>

        {/* ── Fixed header ── */}
        <View fixed style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>PROPPSY</Text>
            <Text style={s.headerTitle}>{meta.docTypeLabel}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDocNo}>{meta.contractId}</Text>
            <View style={[s.badge, badgeStyle]}>
              <Text style={s.badgeText}>{badgeLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── Content from DOCX ── */}
        {children}

        {/* ── Signature block ── */}
        {meta.signers.length > 0 && (
          <SignatureBlock signers={meta.signers} />
        )}

        {/* ── Fixed footer ── */}
        <View fixed style={s.footer}>
          <Text style={s.footerL}>Proppsy Platform</Text>
          <Text style={s.footerC}>{meta.generatedAt}</Text>
          <Text
            style={s.footerR}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `หน้า ${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  )
}

// ─── Main export ──────────────────────────────────────────────

const DEFAULT_SIGNERS: PdfSigner[] = [
  { label: 'ผู้ให้เช่า (Landlord)', name: '' },
  { label: 'ผู้เช่า (Tenant)',      name: '' },
  { label: 'พยาน (Witness)',         name: '' },
]

export async function renderMammothHtmlAsPdf(
  html: string,
  meta?: Partial<PdfMeta>,
): Promise<Buffer> {
  const resolved: Required<PdfMeta> = {
    contractId:   meta?.contractId   ?? '',
    docTypeLabel: meta?.docTypeLabel ?? 'เอกสารสัญญา',
    status:       meta?.status       ?? 'draft',
    isFinalized:  meta?.isFinalized  ?? false,
    generatedAt:  meta?.generatedAt  ?? new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    signers: meta?.signers ?? DEFAULT_SIGNERS,
  }

  const element = <ContractPdfDocument html={html} meta={resolved} />
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any)
}
