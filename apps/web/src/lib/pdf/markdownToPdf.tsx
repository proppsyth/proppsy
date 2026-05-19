// Markdown → PDF renderer for Thai legal contract templates.
// Pipeline: .md file → de-escape \<\< → substitute <<vars>> → parse → react-pdf
// Reuses the same fonts, styles, header/footer as mammothToPdf.tsx.
// Wide tables (>8 total cols) are collapsed to paragraph text to handle
// Google Docs bilingual layout tables gracefully.

import path from 'path'
import fs from 'fs'
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

import type { PdfMeta, PdfSigner } from './mammothToPdf'

// ─── Fonts (same as mammothToPdf) ─────────────────────────────

const fontsDir = path.join(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(fontsDir, 'Sarabun-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'Sarabun-Bold.ttf'),    fontWeight: 700 },
  ],
})

const notoSCRegular = path.join(fontsDir, 'NotoSansSC-Regular.otf')
const notoSCBold    = path.join(fontsDir, 'NotoSansSC-Bold.otf')
try {
  if (fs.existsSync(notoSCRegular)) {
    Font.register({
      family: 'NotoSansSC',
      fonts: [
        { src: notoSCRegular, fontWeight: 400 },
        { src: fs.existsSync(notoSCBold) ? notoSCBold : notoSCRegular, fontWeight: 700 },
      ],
    })
  }
} catch { /* NotoSansSC unavailable */ }

Font.registerHyphenationCallback(word => [word])

// ─── Design tokens (same palette as mammothToPdf) ─────────────

const C = {
  text:    '#111111',
  sub:     '#555555',
  light:   '#888888',
  border:  '#D4D4D4',
  rule:    '#EBEBEB',
  bg:      '#FFFFFF',
  headerBg:'#F8F8F8',
}

const HEADER_H = 56
const FOOTER_H = 44

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily:        'Sarabun',
    fontSize:          9.5,
    color:             C.text,
    backgroundColor:   C.bg,
    paddingTop:        HEADER_H + 18,
    paddingBottom:     FOOTER_H + 16,
    paddingHorizontal: 56,
    lineHeight:        1.8,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: HEADER_H,
    backgroundColor: C.headerBg,
    borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 56,
  },
  headerLeft: { flex: 1 },
  hBrand: { fontSize: 7, fontWeight: 700, color: C.sub, letterSpacing: 1.8, marginBottom: 2 },
  hAgent: { fontSize: 8.5, color: C.text, fontWeight: 700 },
  headerRight: { alignItems: 'flex-end' },
  hTitle: { fontSize: 10.5, fontWeight: 700, color: C.text },
  hMeta:  { fontSize: 7.5, color: C.sub, marginTop: 3 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: FOOTER_H,
    borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 56,
  },
  fL: { flex: 1, fontSize: 7.5, color: C.light },
  fC: { flex: 1, fontSize: 7.5, color: C.light, textAlign: 'center' },
  fR: { flex: 1, fontSize: 7.5, color: C.light, textAlign: 'right' },

  h1: {
    fontFamily: 'Sarabun', fontSize: 13, fontWeight: 700,
    color: C.text, textAlign: 'center',
    marginTop: 8, marginBottom: 14,
  },
  h2: {
    fontFamily: 'Sarabun', fontSize: 9.5, fontWeight: 700,
    color: C.text, paddingBottom: 4,
    borderBottomWidth: 0.8, borderBottomColor: C.border,
    marginTop: 18, marginBottom: 8,
  },
  p: {
    fontFamily: 'Sarabun', fontSize: 9.5, lineHeight: 1.8,
    color: C.text, marginBottom: 5, textAlign: 'justify',
  },
  pBold: {
    fontFamily: 'Sarabun', fontSize: 9.5, fontWeight: 700,
    lineHeight: 1.8, color: C.text, marginBottom: 5,
  },
  pBlank: { height: 6 },

  tableWrap: { marginVertical: 8 },
  tHead: {
    flexDirection: 'row',
    backgroundColor: C.headerBg,
    borderTopWidth: 0.8,    borderTopColor:    C.border,
    borderBottomWidth: 0.8, borderBottomColor: C.border,
    borderLeftWidth: 0.8,   borderLeftColor:   C.border,
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
    borderLeftWidth: 0.8,   borderLeftColor:   C.border,
  },
  tRowAlt: {
    flexDirection: 'row', backgroundColor: '#FAFAFA',
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
    borderLeftWidth: 0.8,   borderLeftColor:   C.border,
  },
  tHCell: {
    flex: 1, fontSize: 8.5, fontWeight: 700, color: C.text,
    paddingVertical: 5, paddingHorizontal: 6,
    borderRightWidth: 0.5, borderRightColor: C.border,
    lineHeight: 1.6,
  },
  tCell: {
    flex: 1, fontSize: 8.5, color: C.text,
    paddingVertical: 4, paddingHorizontal: 6,
    borderRightWidth: 0.5, borderRightColor: C.border,
    lineHeight: 1.6,
  },

  sigWrap: {
    marginTop: 40, paddingTop: 24,
    borderTopWidth: 0.8, borderTopColor: C.border,
  },
  sigHeading: {
    fontFamily: 'Sarabun', fontSize: 9, fontWeight: 700,
    color: C.sub, textAlign: 'center',
    letterSpacing: 0.5, marginBottom: 30,
  },
  sigRow: { flexDirection: 'row', justifyContent: 'space-around' },
  sigBox: { alignItems: 'center', width: '30%' },
  sigSpace: { height: 44 },
  sigImg: { width: 88, height: 36, objectFit: 'contain', marginBottom: 4 },
  sigLine: {
    width: '100%',
    borderBottomWidth: 1, borderBottomColor: C.text,
    marginBottom: 5,
  },
  sigRole: {
    fontFamily: 'Sarabun', fontSize: 8.5, color: C.sub,
    textAlign: 'center', marginBottom: 2,
  },
  sigName: {
    fontFamily: 'Sarabun', fontSize: 8.5, fontWeight: 700,
    color: C.text, textAlign: 'center',
  },
  sigDate: {
    fontFamily: 'Sarabun', fontSize: 7.5, color: C.light,
    textAlign: 'center', marginTop: 4,
  },
})

// ─── CJK-aware rendering ──────────────────────────────────────

const CJK_RE = /[一-鿿㐀-䶿豈-﫿　-〿！-｠￠-￦]/

function hasCJK(text: string): boolean {
  return CJK_RE.test(text)
}

type ScriptRun = { text: string; cjk: boolean }

function splitScripts(text: string): ScriptRun[] {
  if (!text) return []
  const runs: ScriptRun[] = []
  let buf = ''
  let isCjk = CJK_RE.test(text[0] ?? ' ')
  for (const ch of text) {
    const c = CJK_RE.test(ch)
    if (c !== isCjk) {
      if (buf) runs.push({ text: buf, cjk: isCjk })
      buf = ch; isCjk = c
    } else {
      buf += ch
    }
  }
  if (buf) runs.push({ text: buf, cjk: isCjk })
  return runs
}

function RichText({
  text,
  style,
  bold,
}: {
  text: string
  style?: object
  bold?: boolean
}): React.ReactElement {
  const weight = bold ? 700 : 400
  if (!hasCJK(text)) {
    return (
      <Text style={{ fontFamily: 'Sarabun', fontWeight: weight, ...(style ?? {}) }}>
        {text}
      </Text>
    )
  }
  const runs = splitScripts(text)
  return (
    <Text style={{ fontFamily: 'Sarabun', fontWeight: weight, ...(style ?? {}) }}>
      {runs.map((run, i) => (
        <Text
          key={i}
          style={{ fontFamily: run.cjk ? 'NotoSansSC' : 'Sarabun', fontWeight: weight }}
        >
          {run.text}
        </Text>
      ))}
    </Text>
  )
}

// ─── Markdown processor ───────────────────────────────────────

export function deEscape(md: string): string {
  // Strip UTF-8 BOM if present (PowerShell Out-File adds it)
  const stripped = md.startsWith('﻿') ? md.slice(1) : md
  return stripped.replace(/\\<\\</g, '<<').replace(/\\>\\>/g, '>>')
}

export function substituteVars(md: string, vars: Record<string, string>): string {
  return md.replace(/<<([^>]+)>>/g, (_, key: string) => vars[key] ?? '')
}

// Strip **bold** and *italic* markers, returning plain text
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

// Check if a table row is a separator (---, :---:, etc.)
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every(c => /^[-:\s]*$/.test(c))
}

type MdBlock =
  | { type: 'h1'; text: string; bold: boolean }
  | { type: 'h2'; text: string; bold: boolean }
  | { type: 'p'; text: string; bold: boolean }
  | { type: 'blank' }
  | { type: 'table'; rows: string[][]; wide: boolean }

function parseMd(md: string): MdBlock[] {
  const lines = md.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Heading 1: # or # **...**
    if (/^#\s/.test(line) && !/^##/.test(line)) {
      const raw = line.replace(/^#\s+/, '')
      const isBold = /^\*\*/.test(raw.trim())
      const text = stripMarkdown(raw)
      if (text) blocks.push({ type: 'h1', text, bold: true })
      i++; continue
    }

    // Heading 2
    if (/^##\s/.test(line)) {
      const raw = line.replace(/^##\s+/, '')
      const text = stripMarkdown(raw)
      if (text) blocks.push({ type: 'h2', text, bold: true })
      i++; continue
    }

    // Table block: consume all consecutive | lines
    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) {
        tableLines.push(lines[i] ?? '')
        i++
      }
      // Parse rows, skip separators
      const allRows: string[][] = []
      for (const tl of tableLines) {
        const cells = tl.split('|').slice(1, -1).map(c => c.trim())
        if (!isSeparatorRow(cells)) allRows.push(cells)
      }
      if (allRows.length === 0) continue
      // Determine if "wide" — max total columns > 8
      const maxCols = Math.max(...allRows.map(r => r.length))
      const wide = maxCols > 8
      blocks.push({ type: 'table', rows: allRows, wide })
      continue
    }

    // Empty line
    if (line.trim() === '') {
      blocks.push({ type: 'blank' })
      i++; continue
    }

    // Regular paragraph
    const isBold = /^\*\*/.test(line.trim()) || (/\*\*/.test(line) && line.trim().endsWith('**'))
    const text = stripMarkdown(line)
    if (text) blocks.push({ type: 'p', text, bold: isBold })
    i++
  }

  return blocks
}

// ─── Block Renderers ──────────────────────────────────────────

function renderMdBlocks(blocks: MdBlock[]): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  let blankCount = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!

    if (block.type === 'blank') {
      blankCount++
      // Allow max 1 blank line to avoid excessive whitespace
      if (blankCount <= 1) elements.push(<View key={i} style={s.pBlank} />)
      continue
    }
    blankCount = 0

    if (block.type === 'h1') {
      elements.push(<RichText key={i} text={block.text} style={s.h1} bold />)
      continue
    }

    if (block.type === 'h2') {
      elements.push(<RichText key={i} text={block.text} style={s.h2} bold />)
      continue
    }

    if (block.type === 'p') {
      const style = block.bold ? s.pBold : s.p
      elements.push(<RichText key={i} text={block.text} style={style} bold={block.bold} />)
      continue
    }

    if (block.type === 'table') {
      if (block.wide) {
        // Wide table: collapse each row to a paragraph (join non-empty cells)
        block.rows.forEach((row, ri) => {
          const text = row.filter(c => c.length > 0).join('  ')
          if (text) {
            elements.push(
              <RichText key={`${i}-${ri}`} text={text} style={s.p} />
            )
          }
        })
      } else {
        // Narrow table: render properly (first row = header)
        const [headRow, ...bodyRows] = block.rows
        if (!headRow) continue
        // Remove completely empty columns
        const colCount = headRow.length
        elements.push(
          <View key={i} style={s.tableWrap} wrap={false}>
            <View style={s.tHead}>
              {headRow.map((h, ci) => (
                <Text
                  key={ci}
                  style={[s.tHCell, ci === colCount - 1 ? { borderRightWidth: 0.8, borderRightColor: C.border } : {}]}
                >
                  {h}
                </Text>
              ))}
            </View>
            {bodyRows.map((row, ri) => {
              const rowStyle = ri % 2 === 0 ? s.tRow : s.tRowAlt
              return (
                <View key={ri} style={rowStyle} wrap={false}>
                  {row.map((cell, ci) => (
                    <Text
                      key={ci}
                      style={[s.tCell, ci === (row.length - 1) ? { borderRightWidth: 0.8, borderRightColor: C.border } : {}]}
                    >
                      {cell}
                    </Text>
                  ))}
                </View>
              )
            })}
          </View>
        )
      }
      continue
    }
  }

  return elements
}

// ─── Signature block ──────────────────────────────────────────

function SignatureBlock({ signers }: { signers: PdfSigner[] }) {
  return (
    <View style={s.sigWrap}>
      <Text style={s.sigHeading}>ลายเซ็นคู่สัญญา / Signatures</Text>
      <View style={s.sigRow}>
        {signers.map((sig, i) => (
          <View key={i} style={s.sigBox}>
            {sig.signatureUrl
              ? <Image style={s.sigImg} src={sig.signatureUrl} />
              : <View style={s.sigSpace} />
            }
            <View style={s.sigLine} />
            <Text style={s.sigRole}>{sig.label}</Text>
            {sig.name ? <Text style={s.sigName}>({sig.name})</Text> : null}
            <Text style={s.sigDate}>{sig.signedAt ?? 'วันที่  ___ / ___ / ___'}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Document component ───────────────────────────────────────

function MdContractDocument({
  blocks,
  meta,
}: {
  blocks: MdBlock[]
  meta: Required<PdfMeta>
}) {
  const children = renderMdBlocks(blocks)

  const statusText = meta.isFinalized
    ? 'FINALIZED'
    : (meta.status === 'draft' ? 'DRAFT' : (meta.status ?? 'DRAFT').toUpperCase().replace(/_/g, ' '))

  return (
    <Document title={`${meta.docTypeLabel} ${meta.contractId}`}>
      <Page size="A4" style={s.page}>

        <View fixed style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.hBrand}>PROPPSY</Text>
            {meta.agentName ? <Text style={s.hAgent}>{meta.agentName}</Text> : null}
          </View>
          <View style={s.headerRight}>
            <Text style={s.hTitle}>{meta.docTypeLabel}</Text>
            <Text style={s.hMeta}>{meta.contractId}  ·  {statusText}</Text>
          </View>
        </View>

        {children}

        {meta.signers.length > 0 && (
          <SignatureBlock signers={meta.signers} />
        )}

        <View fixed style={s.footer}>
          <Text style={s.fL}>Proppsy Platform</Text>
          <Text style={s.fC}>{meta.generatedAt}</Text>
          <Text
            style={s.fR}
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

export async function renderMarkdownAsPdf(
  mdContent: string,
  vars: Record<string, string>,
  meta?: Partial<PdfMeta>,
): Promise<Buffer> {
  // 1. De-escape Google Docs \<\< → <<
  const deEscaped = deEscape(mdContent)
  // 2. Substitute variables (image vars already set to '' by computeVariables)
  const substituted = substituteVars(deEscaped, vars)
  // 3. Parse markdown into blocks
  const blocks = parseMd(substituted)

  const resolved: Required<PdfMeta> = {
    contractId:   meta?.contractId   ?? '',
    docTypeLabel: meta?.docTypeLabel ?? 'เอกสารสัญญา',
    agentName:    meta?.agentName    ?? '',
    status:       meta?.status       ?? 'draft',
    isFinalized:  meta?.isFinalized  ?? false,
    generatedAt:  meta?.generatedAt  ?? new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    signers: meta?.signers ?? DEFAULT_SIGNERS,
  }

  const element = <MdContractDocument blocks={blocks} meta={resolved} />
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any)
}
