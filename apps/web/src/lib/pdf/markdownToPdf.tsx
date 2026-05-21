// Markdown → PDF renderer for Thai legal contract templates.
// Pipeline: .md file → de-escape \<\< → substitute <<vars>> → parse → react-pdf
// Design: navy/white header + mini-sig footer every page + large final sig block.

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

// ─── Fonts ────────────────────────────────────────────────────

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

// ─── Design tokens ─────────────────────────────────────────────

const C = {
  navy:    '#1B3B6F',        // primary navy
  navyDim: '#2B4E8C',        // lighter navy for accents
  white:   '#FFFFFF',
  text:    '#1A1A1A',
  sub:     '#4A4A4A',
  light:   '#888888',
  border:  '#D0D8E8',        // blue-tinted border
  rule:    '#EEF1F7',        // blue-tinted row alt
  bg:      '#FFFFFF',
  accent:  '#3B6CD4',        // blue accent line
}

const HEADER_H  = 60
const FOOTER_H  = 38
const PAD_H     = 52

// ─── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({

  // Page
  page: {
    fontFamily:        'Sarabun',
    fontSize:          9.5,
    color:             C.text,
    backgroundColor:   C.bg,
    paddingTop:        HEADER_H + 20,
    paddingBottom:     FOOTER_H + 20,
    paddingHorizontal: PAD_H,
    lineHeight:        1.8,
  },

  // ── Header (fixed, every page) ─────────────────────────────
  header: {
    position:         'absolute', top: 0, left: 0, right: 0,
    height:           HEADER_H,
    backgroundColor:  C.navy,
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: PAD_H,
    paddingVertical:   10,
  },
  // Left: contract title + doc number
  hLeft: { flex: 1, justifyContent: 'center' },
  hBrand: {
    fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2, marginBottom: 3,
  },
  hTitle: {
    fontSize: 11, fontWeight: 700, color: C.white,
    letterSpacing: 0.3,
  },
  hDocNo: {
    fontSize: 7.5, color: 'rgba(255,255,255,0.70)', marginTop: 2,
  },
  // Divider
  hDivider: {
    width: 1, height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 20,
  },
  // Right: agent info
  hRight: { alignItems: 'flex-end', justifyContent: 'center' },
  hAgentName: {
    fontSize: 8.5, fontWeight: 700, color: C.white,
    textAlign: 'right',
  },
  hAgentPhone: {
    fontSize: 7.5, color: 'rgba(255,255,255,0.75)',
    textAlign: 'right', marginTop: 2,
  },
  hAgentLabel: {
    fontSize: 6.5, color: 'rgba(255,255,255,0.50)',
    textAlign: 'right', marginTop: 1, letterSpacing: 0.5,
  },

  // ── Footer (fixed, every page) — mini sig + page number ───
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height:   FOOTER_H,
    borderTopWidth: 0.8, borderTopColor: C.border,
    backgroundColor: '#F7F9FC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD_H,
  },
  // Mini-sig slot (owner / customer)
  miniSigBox: {
    width: 90, alignItems: 'center',
  },
  miniSigImgWrap: { height: 18, justifyContent: 'flex-end', marginBottom: 2 },
  miniSigImg: { width: 54, height: 16, objectFit: 'contain' },
  miniSigLine: {
    width: 80, borderBottomWidth: 0.8, borderBottomColor: C.text, marginBottom: 2,
  },
  miniSigLabel: {
    fontSize: 6.5, color: C.light, textAlign: 'center',
  },
  // Center: page number
  fCenter: {
    flex: 1, alignItems: 'center',
  },
  fPageNum: {
    fontSize: 7, color: C.light,
  },
  // Status badge (right side)
  fRight: {
    width: 90, alignItems: 'flex-end',
  },
  fStatus: {
    fontSize: 6.5, color: C.light,
  },

  // ── Body text ─────────────────────────────────────────────
  h1: {
    fontFamily: 'Sarabun', fontSize: 13, fontWeight: 700,
    color: C.navy, textAlign: 'center',
    marginTop: 8, marginBottom: 16,
    letterSpacing: 0.5,
  },
  h2: {
    fontFamily: 'Sarabun', fontSize: 10, fontWeight: 700,
    color: C.navy,
    paddingBottom: 4, paddingTop: 2,
    borderBottomWidth: 1.5, borderBottomColor: C.accent,
    marginTop: 18, marginBottom: 10,
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

  // ── Tables ────────────────────────────────────────────────
  tableWrap: { marginVertical: 2 },
  tHead: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 0.5, borderTopColor: '#CCCCCC',
    borderLeftWidth: 0,
  },
  tRow: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  tRowAlt: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  tHCell: {
    flex: 1, fontSize: 9, fontWeight: 400, color: C.text,
    paddingVertical: 5, paddingHorizontal: 8,
    borderRightWidth: 0.5, borderRightColor: '#CCCCCC',
    borderBottomWidth: 0.5, borderBottomColor: '#CCCCCC',
    lineHeight: 1.6,
  },
  tCell: {
    flex: 1, fontSize: 9, color: C.text,
    paddingVertical: 5, paddingHorizontal: 8,
    borderRightWidth: 0.5, borderRightColor: '#CCCCCC',
    borderBottomWidth: 0.5, borderBottomColor: '#CCCCCC',
    lineHeight: 1.6,
  },

  // ── Final signature block (last page, large) ─────────────
  sigSection: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1.5, borderTopColor: C.navy,
  },
  sigTitle: {
    fontSize: 8, fontWeight: 700, color: C.navy,
    letterSpacing: 1.5, textAlign: 'center', marginBottom: 32,
    textTransform: 'uppercase',
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  sigBox: {
    alignItems: 'center',
    width: '42%',
  },
  sigImgArea: {
    height: 54, justifyContent: 'flex-end', marginBottom: 6,
  },
  sigImg: {
    width: 110, height: 48, objectFit: 'contain',
  },
  sigLine: {
    width: '100%',
    borderBottomWidth: 1.2, borderBottomColor: C.navy,
    marginBottom: 7,
  },
  sigRole: {
    fontSize: 9, fontWeight: 700, color: C.navy,
    textAlign: 'center', marginBottom: 3,
  },
  sigName: {
    fontSize: 8.5, color: C.sub,
    textAlign: 'center', marginBottom: 10,
  },
  sigDateLabel: {
    fontSize: 7.5, color: C.light, textAlign: 'center',
    marginTop: 4,
  },
})

// ─── CJK-aware rendering ──────────────────────────────────────

const CJK_RE = /[一-鿿㐀-䶿豈-﫿　-〿！-｠￠-￦]/

function hasCJK(text: string): boolean { return CJK_RE.test(text) }

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
    } else { buf += ch }
  }
  if (buf) runs.push({ text: buf, cjk: isCjk })
  return runs
}

function RichText({ text, style, bold }: { text: string; style?: object; bold?: boolean }): React.ReactElement {
  const weight = bold ? 700 : 400
  if (!hasCJK(text)) {
    return <Text style={{ fontFamily: 'Sarabun', fontWeight: weight, ...(style ?? {}) }}>{text}</Text>
  }
  return (
    <Text style={{ fontFamily: 'Sarabun', fontWeight: weight, ...(style ?? {}) }}>
      {splitScripts(text).map((run, i) => (
        <Text key={i} style={{ fontFamily: run.cjk ? 'NotoSansSC' : 'Sarabun', fontWeight: weight }}>
          {run.text}
        </Text>
      ))}
    </Text>
  )
}

// ─── Markdown processor ───────────────────────────────────────

export function deEscape(md: string): string {
  const stripped = md.startsWith('﻿') ? md.slice(1) : md
  return stripped.replace(/\\<\\</g, '<<').replace(/\\>\\>/g, '>>')
}

export function substituteVars(md: string, vars: Record<string, string>): string {
  return md.replace(/<<([^>]+)>>/g, (_, key: string) => vars[key] ?? '')
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every(c => /^[-:\s]*$/.test(c))
}

type ColAlign = 'left' | 'right' | 'center' | 'none'

function parseAlignRow(cells: string[]): ColAlign[] {
  return cells.map(c => {
    const s = c.trim()
    if (s.startsWith(':') && s.endsWith(':')) return 'center'
    if (s.endsWith(':')) return 'right'
    if (s.startsWith(':')) return 'left'
    return 'none'
  })
}

function alignToFlex(a: ColAlign): number {
  if (a === 'right') return 0.55  // narrow label column
  if (a === 'left')  return 1.45  // wide value column
  return 1                         // center / none = equal
}

type MdBlock =
  | { type: 'h1'; text: string; bold: boolean }
  | { type: 'h2'; text: string; bold: boolean }
  | { type: 'p';  text: string; bold: boolean }
  | { type: 'blank' }
  | { type: 'table'; rows: string[][]; aligns: ColAlign[]; wide: boolean }

function parseMd(md: string): MdBlock[] {
  const lines = md.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (/^#\s/.test(line) && !/^##/.test(line)) {
      const raw = line.replace(/^#\s+/, '')
      const text = stripMarkdown(raw)
      if (text) blocks.push({ type: 'h1', text, bold: true })
      i++; continue
    }

    if (/^##\s/.test(line)) {
      const raw = line.replace(/^##\s+/, '')
      const text = stripMarkdown(raw)
      if (text) blocks.push({ type: 'h2', text, bold: true })
      i++; continue
    }

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) {
        tableLines.push(lines[i] ?? ''); i++
      }
      const allRows: string[][] = []
      let aligns: ColAlign[] = []
      for (const tl of tableLines) {
        const cells = tl.split('|').slice(1, -1).map(c => c.trim())
        if (isSeparatorRow(cells)) {
          aligns = parseAlignRow(cells)
        } else {
          allRows.push(cells)
        }
      }
      if (allRows.length === 0) continue
      const maxCols = Math.max(...allRows.map(r => r.length))
      blocks.push({ type: 'table', rows: allRows, aligns, wide: maxCols > 8 })
      continue
    }

    if (line.trim() === '') {
      blocks.push({ type: 'blank' }); i++; continue
    }

    const isBold = /^\*\*/.test(line.trim()) || (/\*\*/.test(line) && line.trim().endsWith('**'))
    const text = stripMarkdown(line)
    if (text) blocks.push({ type: 'p', text, bold: isBold })
    i++
  }

  return blocks
}

// ─── Block renderers ──────────────────────────────────────────

function renderMdBlocks(blocks: MdBlock[]): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  let blankCount = 0
  let prevWasTable = false

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!

    if (block.type === 'blank') {
      blankCount++
      if (blankCount <= 1) elements.push(<View key={i} style={s.pBlank} />)
      prevWasTable = false
      continue
    }
    blankCount = 0

    if (block.type === 'h1') {
      elements.push(<RichText key={i} text={block.text} style={s.h1} bold />)
      prevWasTable = false; continue
    }
    if (block.type === 'h2') {
      elements.push(<RichText key={i} text={block.text} style={s.h2} bold />)
      prevWasTable = false; continue
    }
    if (block.type === 'p') {
      elements.push(<RichText key={i} text={block.text} style={block.bold ? s.pBold : s.p} bold={block.bold} />)
      prevWasTable = false; continue
    }
    if (block.type === 'table') {
      if (block.wide) {
        block.rows.forEach((row, ri) => {
          const text = row.filter(c => c.length > 0).join('  ')
          if (text) elements.push(<RichText key={`${i}-${ri}`} text={text} style={s.p} />)
        })
      } else {
        const [headRow, ...bodyRows] = block.rows
        if (!headRow) continue
        const allRows = [headRow, ...bodyRows]
        const needTopBorder = !prevWasTable
        prevWasTable = true
        const colFlexes = allRows[0]!.map((_, ci) =>
          alignToFlex(block.aligns[ci] ?? 'none')
        )
        elements.push(
          <View key={i} style={[s.tableWrap, {
            borderLeftWidth: 0.5, borderLeftColor: '#CCCCCC',
            borderTopWidth: needTopBorder ? 0.5 : 0, borderTopColor: '#CCCCCC',
          }]} wrap={false}>
            {allRows.map((row, ri) => (
              <View key={ri} style={s.tRow} wrap={false}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={[
                    s.tCell,
                    { flex: colFlexes[ci] ?? 1 },
                    ci === row.length - 1 ? { borderRightWidth: 0.5, borderRightColor: '#CCCCCC' } : {},
                  ]}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )
        continue
      }
      continue
    }
  }

  return elements
}

// ─── Mini-sig footer slot ──────────────────────────────────────

function MiniSigSlot({ sig }: { sig: PdfSigner }) {
  return (
    <View style={s.miniSigBox}>
      <View style={s.miniSigImgWrap}>
        {sig.signatureUrl
          ? <Image style={s.miniSigImg} src={sig.signatureUrl} />
          : null
        }
      </View>
      <View style={s.miniSigLine} />
      <Text style={s.miniSigLabel}>{sig.label}</Text>
    </View>
  )
}

// ─── Final signature block (large, last page) ─────────────────

function FinalSignatureBlock({ signers }: { signers: PdfSigner[] }) {
  return (
    <View style={s.sigSection}>
      <Text style={s.sigTitle}>ลายมือชื่อคู่สัญญา</Text>
      <View style={s.sigRow}>
        {signers.map((sig, i) => (
          <View key={i} style={s.sigBox}>
            <View style={s.sigImgArea}>
              {sig.signatureUrl
                ? <Image style={s.sigImg} src={sig.signatureUrl} />
                : null
              }
            </View>
            <View style={s.sigLine} />
            <Text style={s.sigRole}>{sig.label}</Text>
            {sig.name ? <Text style={s.sigName}>({sig.name})</Text> : null}
            <Text style={s.sigDateLabel}>
              {sig.signedAt ?? 'วันที่  .......... / .......... / ..........'}
            </Text>
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

        {/* ── Fixed header (every page) ─────────────────── */}
        <View fixed style={s.header}>
          <View style={s.hLeft}>
            <Text style={s.hBrand}>PROPPSY</Text>
            <Text style={s.hTitle}>{meta.docTypeLabel}</Text>
            {meta.contractId
              ? <Text style={s.hDocNo}>เลขที่  {meta.contractId}  ·  {statusText}</Text>
              : null
            }
          </View>

          {(meta.agentName) && (
            <>
              <View style={s.hDivider} />
              <View style={s.hRight}>
                <Text style={s.hAgentLabel}>ตัวแทน / AGENT</Text>
                <Text style={s.hAgentName}>{meta.agentName}</Text>
                {(meta as PdfMeta).agentPhone
                  ? <Text style={s.hAgentPhone}>{(meta as PdfMeta).agentPhone}</Text>
                  : null
                }
              </View>
            </>
          )}
        </View>

        {/* ── Content ───────────────────────────────────── */}
        {children}

        {/* ── Final sig block ───────────────────────────── */}
        {meta.signers.length > 0 && (
          <FinalSignatureBlock signers={meta.signers} />
        )}

        {/* ── Fixed footer (every page) — mini sig + page ─ */}
        <View fixed style={s.footer}>
          {meta.signers[0]
            ? <MiniSigSlot sig={meta.signers[0]} />
            : <View style={s.miniSigBox} />
          }

          <View style={s.fCenter}>
            <Text
              style={s.fPageNum}
              render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `หน้า ${pageNumber} / ${totalPages}`
              }
            />
          </View>

          {meta.signers[1]
            ? <MiniSigSlot sig={meta.signers[1]} />
            : <View style={s.miniSigBox} />
          }
        </View>

      </Page>
    </Document>
  )
}

// ─── Main export ──────────────────────────────────────────────

const DEFAULT_SIGNERS: PdfSigner[] = [
  { label: 'ผู้ให้เช่า', name: '' },
  { label: 'ผู้เช่า',    name: '' },
]

export async function renderMarkdownAsPdf(
  mdContent: string,
  vars: Record<string, string>,
  meta?: Partial<PdfMeta>,
): Promise<Buffer> {
  const deEscaped  = deEscape(mdContent)
  const substituted = substituteVars(deEscaped, vars)
  const blocks     = parseMd(substituted)

  const resolved: Required<PdfMeta> = {
    contractId:   meta?.contractId   ?? '',
    docTypeLabel: meta?.docTypeLabel ?? 'เอกสารสัญญา',
    agentName:    meta?.agentName    ?? '',
    agentPhone:   meta?.agentPhone   ?? '',
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
