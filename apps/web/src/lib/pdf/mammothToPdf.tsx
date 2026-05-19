// Premium minimal PDF renderer — mammoth HTML → formal A4 legal document.
// Design: clean white, dark typography, no heavy colors — formal document standard.
// Multi-script: Sarabun (Thai+Latin) + NotoSansSC (Chinese CJK), auto-split per character.

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

// NotoSansSC covers Chinese (SC = Simplified Chinese).
// Falls back gracefully if the file is missing.
const notoSCRegular = path.join(fontsDir, 'NotoSansSC-Regular.otf')
const notoSCBold    = path.join(fontsDir, 'NotoSansSC-Bold.otf')
try {
  const fs = require('fs') as typeof import('fs')
  if (fs.existsSync(notoSCRegular)) {
    Font.register({
      family: 'NotoSansSC',
      fonts: [
        { src: notoSCRegular, fontWeight: 400 },
        { src: fs.existsSync(notoSCBold) ? notoSCBold : notoSCRegular, fontWeight: 700 },
      ],
    })
  }
} catch { /* NotoSansSC unavailable — Chinese characters will show as boxes */ }

// Disable hyphenation (Thai text does not use hyphens)
Font.registerHyphenationCallback(word => [word])

// ─── Design Tokens ────────────────────────────────────────────

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

  // ── Fixed header ──────────────────────────────────────────
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height:   HEADER_H,
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

  // ── Fixed footer ──────────────────────────────────────────
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

  // ── Typography ────────────────────────────────────────────
  h1: {
    fontFamily:   'Sarabun',
    fontSize:     13, fontWeight: 700,
    color:        C.text, textAlign: 'center',
    marginTop:    6, marginBottom: 12,
  },
  h2Wrap: { marginTop: 18, marginBottom: 8 },
  h2: {
    fontFamily:  'Sarabun',
    fontSize:    9.5, fontWeight: 700,
    color:       C.text,
    paddingBottom: 4,
    borderBottomWidth: 0.8, borderBottomColor: C.border,
  },
  h3: {
    fontFamily:  'Sarabun',
    fontSize:    9.5, fontWeight: 700,
    color:       C.text, marginTop: 10, marginBottom: 3,
  },
  p: {
    fontFamily:  'Sarabun',
    fontSize:    9.5, lineHeight: 1.8,
    color:       C.text, marginBottom: 5,
    textAlign:   'justify',
  },
  pBlank: { height: 6 },
  bold: { fontWeight: 700 },

  // ── Tables ────────────────────────────────────────────────
  tableWrap: { marginVertical: 10 },
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
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
    borderLeftWidth: 0.8,   borderLeftColor:   C.border,
  },
  tHCell: {
    flex: 1, fontSize: 8.5, fontWeight: 700, color: C.text,
    paddingVertical: 5, paddingHorizontal: 8,
    borderRightWidth: 0.5, borderRightColor: C.border,
  },
  tCell: {
    flex: 1, fontSize: 8.5, color: C.text,
    paddingVertical: 4, paddingHorizontal: 8,
    borderRightWidth: 0.5, borderRightColor: C.border,
    lineHeight: 1.6,
  },

  // ── Lists ─────────────────────────────────────────────────
  listWrap: { marginVertical: 4 },
  listRow:  { flexDirection: 'row', marginBottom: 3, paddingLeft: 8 },
  listBullet: { fontFamily: 'Sarabun', width: 14, fontSize: 9.5, color: C.sub },
  listText: { flex: 1, fontFamily: 'Sarabun', fontSize: 9.5, lineHeight: 1.8, color: C.text },

  // ── Thai contract patterns ─────────────────────────────
  docTitle: {
    fontFamily: 'Sarabun',
    fontSize:   13, fontWeight: 700,
    color:      C.text, textAlign: 'center',
    marginTop:  8, marginBottom: 14,
  },
  metaLine: {
    fontFamily: 'Sarabun', fontSize: 9.5,
    lineHeight: 1.8, color: C.text, marginBottom: 3,
  },
  clauseWrap: {
    flexDirection: 'row', marginTop: 8, marginBottom: 2,
  },
  clauseNum: {
    fontFamily: 'Sarabun', fontSize: 9.5, fontWeight: 700,
    color: C.text, width: 48, lineHeight: 1.8,
  },
  clauseBody: {
    flex: 1, fontFamily: 'Sarabun', fontSize: 9.5,
    lineHeight: 1.8, color: C.text, textAlign: 'justify',
  },
  pIndented: {
    fontFamily: 'Sarabun', fontSize: 9.5,
    lineHeight: 1.8, color: C.text,
    marginBottom: 3, textAlign: 'justify', paddingLeft: 48,
  },

  // ── Signature ─────────────────────────────────────────────
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
  agentName?:   string
  status?:      string
  isFinalized?: boolean
  generatedAt?: string
  signers?:     PdfSigner[]
}

type Segment = { text: string; bold: boolean }

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; segs: Segment[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'list'; ordered: boolean; items: string[] }

// ─── Script-aware text rendering ─────────────────────────────
// Chinese (CJK) characters use NotoSansSC; Thai/Latin use Sarabun.

const CJK_RE = /[一-鿿㐀-䶿豈-﫿　-〿！-｠￠-￦]/

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

// Render a single text string, switching fonts for CJK runs.
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

// ─── HTML Parser ──────────────────────────────────────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

// Robust inline segment parser: handles <strong>, <b>, <span>, <em>, etc.
// Splits by bold/non-bold; strips all other inline tags but keeps their text.
function parseSegments(html: string): Segment[] {
  // Split at bold tag boundaries
  const parts = html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/(<(?:strong|b)[^>]*>[\s\S]*?<\/(?:strong|b)>)/gi)

  return parts.flatMap((part): Segment[] => {
    if (/^<(?:strong|b)/i.test(part)) {
      const text = decodeEntities(part.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim())
      return text ? [{ text, bold: true }] : []
    }
    // Strip all remaining tags (span, em, u, a, etc.) and keep their text
    const text = decodeEntities(part.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim())
    return text ? [{ text, bold: false }] : []
  })
}

// Find balanced closing tag position in html starting from `from`.
function findClose(html: string, tagName: string, from: number): number {
  let depth = 1
  let i = from
  const open  = `<${tagName}`
  const close = `</${tagName}`
  while (depth > 0 && i < html.length) {
    const nextO = html.indexOf(open,  i)
    const nextC = html.indexOf(close, i)
    if (nextC === -1) return -1
    if (nextO !== -1 && nextO < nextC) {
      // Verify the character after `<tagname` is space/> to avoid <tablenew> matching <table>
      const charAfter = html[nextO + open.length]
      if (charAfter === '>' || charAfter === ' ' || charAfter === '\n' || charAfter === '\r') {
        depth++
      }
      i = nextO + open.length
    } else {
      depth--
      i = nextC + close.length
    }
  }
  return i - 1 // approximate position of end of </tag>
}

function parseTableCells(rowHtml: string): string[] {
  const cells: string[] = []
  const re = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(rowHtml)) !== null) {
    cells.push(stripTags(m[1] ?? ''))
  }
  return cells
}

function parseTable(tableHtml: string): { head: string[]; rows: string[][] } {
  const head: string[] = []
  const rows: string[][] = []

  const theadM = /<thead[^>]*>([\s\S]*?)<\/thead>/i.exec(tableHtml)
  if (theadM) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    let m: RegExpExecArray | null
    while ((m = thRe.exec(theadM[1] ?? '')) !== null) {
      head.push(stripTags(m[1] ?? ''))
    }
  }

  const bodyHtml = theadM
    ? tableHtml.slice(0, theadM.index) + tableHtml.slice((theadM.index ?? 0) + (theadM[0]?.length ?? 0))
    : tableHtml

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trM: RegExpExecArray | null
  while ((trM = trRe.exec(bodyHtml)) !== null) {
    const cells = parseTableCells(trM[1] ?? '')
    if (cells.length > 0) {
      if (head.length === 0 && rows.length === 0) head.push(...cells)
      else rows.push(cells)
    }
  }
  return { head, rows }
}

function parseBlocks(html: string): Block[] {
  const blocks: Block[] = []
  // Use explicit tag matching with nesting awareness
  let i = 0
  const BLOCK_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','table','ul','ol'])

  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt === -1) break

    // Extract opening tag
    const gt = html.indexOf('>', lt)
    if (gt === -1) { i = lt + 1; continue }

    const rawTag = html.slice(lt + 1, gt).trim()
    if (rawTag.startsWith('/') || rawTag.startsWith('!')) { i = gt + 1; continue }

    const tagName = rawTag.split(/[\s/>]/)[0]?.toLowerCase() ?? ''
    if (!BLOCK_TAGS.has(tagName)) { i = gt + 1; continue }

    // Find balanced close
    const contentStart = gt + 1
    const closeEnd = findClose(html, tagName, contentStart)
    const closeTagLen = `</${tagName}>`.length
    const contentEnd = closeEnd === -1 ? html.length : closeEnd - (tagName.length + 2)

    // Approximate content: from contentStart to roughly before </tag>
    // Find actual </tagName> position
    let actualClose = html.indexOf(`</${tagName}`, contentStart)
    if (actualClose === -1) actualClose = html.length

    const content = html.slice(contentStart, actualClose)
    const blockEnd = actualClose + `</${tagName}>`.length

    if (tagName === 'h1') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 1, text })
    } else if (tagName === 'h2') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 2, text })
    } else if (tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
      const text = stripTags(content)
      if (text) blocks.push({ kind: 'h', level: 3, text })
    } else if (tagName === 'p') {
      const segs = parseSegments(content)
      if (segs.some(sg => sg.text.trim())) {
        blocks.push({ kind: 'p', segs })
      } else {
        blocks.push({ kind: 'p', segs: [] }) // blank line
      }
    } else if (tagName === 'table') {
      blocks.push({ kind: 'table', ...parseTable(content) })
    } else if (tagName === 'ul' || tagName === 'ol') {
      const items: string[] = []
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let liM: RegExpExecArray | null
      while ((liM = liRe.exec(content)) !== null) {
        const t = stripTags(liM[1] ?? '')
        if (t) items.push(t)
      }
      if (items.length) blocks.push({ kind: 'list', ordered: tagName === 'ol', items })
    }

    i = blockEnd > i ? blockEnd : i + 1
    void contentEnd
    void closeEnd
    void closeTagLen
  }

  return blocks
}

// ─── Block Classification (Thai legal pattern detection) ──────

type ParaClass = 'title' | 'clause' | 'indented' | 'meta' | 'normal'

const CLAUSE_RE = /^ข้อ\s*\d/
const META_RE   = /^(ทำที่|วันที่\s*\d|ณ\s)/
const TITLE_RE  = /^สัญญา/

function classifyBlocks(blocks: Block[]): ParaClass[] {
  const out: ParaClass[] = new Array(blocks.length).fill('normal')
  let titleSeen = false
  let inClause  = false

  for (let idx = 0; idx < blocks.length; idx++) {
    const blk = blocks[idx]!
    if (blk.kind !== 'p') { inClause = false; continue }

    const text = blk.segs.map(sg => sg.text).join('').trim()
    if (!text) { inClause = false; continue }

    if (!titleSeen && TITLE_RE.test(text) && text.length < 100) {
      out[idx] = 'title'; titleSeen = true; inClause = false
    } else if (CLAUSE_RE.test(text)) {
      out[idx] = 'clause'; inClause = true
    } else if (META_RE.test(text)) {
      out[idx] = 'meta'; inClause = false
    } else if (inClause) {
      out[idx] = 'indented'
    }
  }
  return out
}

// ─── Block Renderers ──────────────────────────────────────────

function renderBlocks(blocks: Block[]): React.ReactElement[] {
  const classes = classifyBlocks(blocks)

  return blocks.flatMap((block, i) => {
    if (block.kind === 'h') {
      if (block.level === 1) {
        return [<RichText key={i} text={block.text} style={s.h1} />]
      }
      if (block.level === 2) {
        return [
          <View key={i} style={s.h2Wrap}>
            <RichText text={block.text} style={s.h2} />
          </View>,
        ]
      }
      return [<RichText key={i} text={block.text} style={s.h3} />]
    }

    if (block.kind === 'p') {
      if (block.segs.length === 0) {
        return [<View key={i} style={s.pBlank} />]
      }

      const cls = classes[i] ?? 'normal'

      // ── contract title (e.g. "สัญญาจองห้องชุด") ──────────
      if (cls === 'title') {
        const text = block.segs.map(sg => sg.text).join('')
        return [<RichText key={i} text={text} style={s.docTitle} />]
      }

      // ── meta lines (ทำที่ / วันที่) ──────────────────────
      if (cls === 'meta') {
        const text = block.segs.map(sg => sg.text).join('')
        return [<RichText key={i} text={text} style={s.metaLine} />]
      }

      // ── "ข้อ N." clause — split number + body ─────────────
      if (cls === 'clause') {
        const fullText = block.segs.map(sg => sg.text).join('')
        const m = /^(ข้อ\s*\d+[.。．]*\.*\s*)(.*)$/s.exec(fullText)
        const numPart  = m ? (m[1] ?? '').trimEnd() : ''
        const bodyPart = m ? (m[2] ?? '').trim()    : fullText
        return [
          <View key={i} style={s.clauseWrap}>
            <Text style={s.clauseNum}>{numPart}</Text>
            {bodyPart ? <Text style={s.clauseBody}>{bodyPart}</Text> : null}
          </View>,
        ]
      }

      // ── indented continuation lines inside a clause ────────
      if (cls === 'indented') {
        const text = block.segs.map(sg => sg.text).join('')
        return [<RichText key={i} text={text} style={s.pIndented} />]
      }

      // ── normal paragraph ───────────────────────────────────
      return [
        <Text key={i} style={s.p}>
          {block.segs.map((seg, j) => {
            const cjk = hasCJK(seg.text)
            const wt = seg.bold ? 700 : 400
            if (!cjk) {
              return <Text key={j} style={{ fontFamily: 'Sarabun', fontWeight: wt }}>{seg.text}</Text>
            }
            return splitScripts(seg.text).map((run, k) => (
              <Text
                key={`${j}-${k}`}
                style={{ fontFamily: run.cjk ? 'NotoSansSC' : 'Sarabun', fontWeight: wt }}
              >
                {run.text}
              </Text>
            ))
          }).flat()}
        </Text>,
      ]
    }

    if (block.kind === 'table') {
      const colCount = Math.max(block.head.length, block.rows[0]?.length ?? 1)
      return [
        <View key={i} style={s.tableWrap} wrap={false}>
          {block.head.length > 0 && (
            <View style={s.tHead}>
              {block.head.map((h, j) => (
                <Text
                  key={j}
                  style={[s.tHCell, j === colCount - 1 ? { borderRightWidth: 0.8, borderRightColor: C.border } : {}]}
                >
                  {h}
                </Text>
              ))}
            </View>
          )}
          {block.rows.map((row, ri) => {
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
        </View>,
      ]
    }

    if (block.kind === 'list') {
      return [
        <View key={i} style={s.listWrap}>
          {block.items.map((item, li) => (
            <View key={li} style={s.listRow}>
              <Text style={s.listBullet}>
                {block.ordered ? `${li + 1}.` : '•'}
              </Text>
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
            {sig.name
              ? <Text style={s.sigName}>({sig.name})</Text>
              : null
            }
            <Text style={s.sigDate}>
              {sig.signedAt ?? 'วันที่  ___ / ___ / ___'}
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
  html:  string
  meta: Required<PdfMeta>
}) {
  const blocks   = parseBlocks(html)
  const children = renderBlocks(blocks)

  const statusText = meta.isFinalized
    ? 'FINALIZED'
    : (meta.status === 'draft' ? 'DRAFT' : (meta.status ?? 'DRAFT').toUpperCase().replace(/_/g, ' '))

  return (
    <Document title={`${meta.docTypeLabel} ${meta.contractId}`}>
      <Page size="A4" style={s.page}>

        {/* ── Fixed header every page ── */}
        <View fixed style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.hBrand}>PROPPSY</Text>
            {meta.agentName
              ? <Text style={s.hAgent}>{meta.agentName}</Text>
              : null
            }
          </View>
          <View style={s.headerRight}>
            <Text style={s.hTitle}>{meta.docTypeLabel}</Text>
            <Text style={s.hMeta}>{meta.contractId}  ·  {statusText}</Text>
          </View>
        </View>

        {/* ── Content from DOCX ── */}
        {children}

        {/* ── Signature block ── */}
        {meta.signers.length > 0 && (
          <SignatureBlock signers={meta.signers} />
        )}

        {/* ── Fixed footer every page ── */}
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

export async function renderMammothHtmlAsPdf(
  html: string,
  meta?: Partial<PdfMeta>,
): Promise<Buffer> {
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

  const element = <ContractPdfDocument html={html} meta={resolved} />
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any)
}
