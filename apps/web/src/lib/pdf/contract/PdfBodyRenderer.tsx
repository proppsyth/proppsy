// Body renderer layer: takes parsed MdBlock[] → React-PDF elements
// Responsibilities: render body content ONLY (h1/h2/p/blank/space/break/table)
// NO fixed elements, NO page numbers, NO signatures, NO footer logic.

import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { MdBlock } from './markdownParser'

// Body styles — defined inline (no external dependency on pdfStyles)
const C = { navy: '#1B3B6F', text: '#1A1A1A', accent: '#3B6CD4' }

const s = StyleSheet.create({
  h1: {
    fontFamily: 'Sarabun', fontSize: 13, fontWeight: 700,
    color: C.navy, textAlign: 'center',
    marginTop: 8, marginBottom: 16, letterSpacing: 0.5,
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
  pBlank:    { height: 6 },
  tableWrap: { marginVertical: 0 },
  tRow:      { flexDirection: 'row', alignItems: 'flex-end' },
  tLabel: {
    flex: 1, fontSize: 9.5, color: C.text,
    paddingVertical: 2, paddingHorizontal: 4, lineHeight: 1.7,
  },
  tValue: {
    flex: 1, fontSize: 9.5, color: C.text,
    paddingVertical: 2, paddingHorizontal: 4,
    borderBottomWidth: 0.8, borderBottomColor: C.text, lineHeight: 1.7,
  },
})

// ─── CJK-aware Text component ─────────────────────────────────────

const CJK_RE = /[㐀-鿿豈-﫿　-〿＀-￯]/
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

type BoldSegment = { text: string; bold: boolean }
function parseBoldSegments(raw: string): BoldSegment[] {
  return raw.split(/(\*\*[^*]+\*\*)/)
    .filter(p => p.length > 0)
    .map(p => p.startsWith('**') && p.endsWith('**')
      ? { text: p.slice(2, -2), bold: true }
      : { text: p, bold: false })
}

function RichText({ text, style, bold, textAlign }: {
  text: string; style?: object; bold?: boolean; textAlign?: 'left' | 'right' | 'center'
}): React.ReactElement {
  const baseStyle = { fontFamily: 'Sarabun', ...(style ?? {}), ...(textAlign ? { textAlign } : {}) }
  const weight = bold ? 700 : 400
  const segments = parseBoldSegments(text)
  const hasInlineBold = segments.some(seg => seg.bold)

  if (!hasInlineBold) {
    if (!hasCJK(text)) return <Text style={{ ...baseStyle, fontWeight: weight }}>{text}</Text>
    return (
      <Text style={{ ...baseStyle, fontWeight: weight }}>
        {splitScripts(text).map((run, i) => (
          <Text key={i} style={{ fontFamily: run.cjk ? 'NotoSansSC' : 'Sarabun', fontWeight: weight }}>
            {run.text}
          </Text>
        ))}
      </Text>
    )
  }
  return (
    <Text style={baseStyle}>
      {segments.map((seg, si) => {
        const w = seg.bold ? 700 : weight
        if (!hasCJK(seg.text))
          return <Text key={si} style={{ fontFamily: 'Sarabun', fontWeight: w }}>{seg.text}</Text>
        return (
          <Text key={si} style={{ fontFamily: 'Sarabun', fontWeight: w }}>
            {splitScripts(seg.text).map((run, ri) => (
              <Text key={ri} style={{ fontFamily: run.cjk ? 'NotoSansSC' : 'Sarabun', fontWeight: w }}>
                {run.text}
              </Text>
            ))}
          </Text>
        )
      })}
    </Text>
  )
}

// ─── Main body renderer ───────────────────────────────────────────

/** Returns array of React elements (NOT a Fragment) — caller spreads them */
export function renderBodyBlocks(blocks: MdBlock[]): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  let blankCount = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!

    if (block.type === 'space') {
      elements.push(<View key={i} style={{ height: block.height }} />)
      continue
    }
    if (block.type === 'break') {
      elements.push(<View key={i} break />)
      continue
    }
    if (block.type === 'blank') {
      blankCount++
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
      const pStyle = block.indent
        ? { ...(block.bold ? s.pBold : s.p), paddingLeft: block.indent }
        : (block.bold ? s.pBold : s.p)
      elements.push(<RichText key={i} text={block.text} style={pStyle} bold={block.bold} />)
      continue
    }
    if (block.type === 'table') {
      if (block.wide) {
        block.rows.forEach((row, ri) => {
          const text = row.filter(c => c.length > 0).join('  ')
          if (text) elements.push(<RichText key={`${i}-${ri}`} text={text} style={s.p} />)
        })
        continue
      }
      const allRows = block.rows
      const isSingleCol = (allRows[0]?.length ?? 0) === 1
      if (isSingleCol) {
        allRows.forEach((row, ri) => {
          const text = row[0] ?? ''
          if (text) elements.push(<RichText key={`${i}-${ri}`} text={text} style={s.p} />)
        })
        continue
      }
      elements.push(
        <View key={i} style={s.tableWrap} wrap={false}>
          {allRows.map((row, ri) => (
            <View key={ri} style={s.tRow}>
              {row.map((cell, ci) => {
                const spec   = block.cols[ci] ?? { align: 'none', flex: 1 }
                const tAlign = spec.align === 'right' ? 'right' : spec.align === 'center' ? 'center' : 'left'
                const isValue = spec.align === 'center'
                const base    = isValue ? s.tValue : s.tLabel
                return (
                  <RichText key={ci} text={cell} textAlign={tAlign}
                    style={{ ...base, flex: spec.flex }}
                  />
                )
              })}
            </View>
          ))}
        </View>
      )
    }
  }

  return elements
}
