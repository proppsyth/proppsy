// Parsing layer: .md template → semantic AST + feature directives
// NO React-PDF imports here. Pure data transformation.

// ─── Public types ──────────────────────────────────────────────────

export type ColAlign = 'left' | 'right' | 'center' | 'none'
export type ColSpec  = { align: ColAlign; flex: number }

export type MdBlock =
  | { type: 'h1';    text: string }
  | { type: 'h2';    text: string }
  | { type: 'p';     text: string; bold: boolean; indent?: number }
  | { type: 'blank' }
  | { type: 'space'; height: number }
  | { type: 'break' }
  | { type: 'table'; rows: string[][]; cols: ColSpec[]; wide: boolean }

/** Document-level features enabled by directives in the .md template */
export interface DocumentFeatures {
  pageNumbers:     boolean   // {page-number}
  miniSignatures:  boolean   // {signature-mini}
  finalSignature:  boolean   // {signature-final}
}

export interface ParsedDocument {
  blocks:   MdBlock[]
  features: DocumentFeatures
}

// ─── Variable substitution (pre-parse) ─────────────────────────────

export function deEscape(md: string): string {
  const stripped = md.startsWith('﻿') ? md.slice(1) : md
  return stripped.replace(/\\<\\</g, '<<').replace(/\\>\\>/g, '>>')
}

export function substituteVars(md: string, vars: Record<string, string>): string {
  return md.replace(/<<([^>]+)>>/g, (_, key: string) => vars[key] ?? '')
}

// ─── Helpers ───────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every(c => /^[-:\s\d.]*$/.test(c))
}

function parseColSpecs(cells: string[]): ColSpec[] {
  return cells.map(c => {
    const s = c.trim()
    let align: ColAlign = 'none'
    if (s.startsWith(':') && s.endsWith(':'))  align = 'center'
    else if (s.endsWith(':'))                  align = 'right'
    else if (s.startsWith(':'))                align = 'left'
    const numMatch = s.replace(/:/g, '').match(/^(\d+(?:\.\d+)?)$/)
    if (numMatch) return { align, flex: Math.max(0, parseFloat(numMatch[1]!)) }
    const dashes = (s.match(/-/g) ?? []).length
    return { align, flex: Math.max(0, (dashes - 2) * 0.5) }
  })
}

// ─── Directive detection ───────────────────────────────────────────

const DIRECTIVE_RE = /^\{(page-number|signature-mini|signature-final)\}$/

function extractDirectives(md: string): { features: DocumentFeatures; cleaned: string } {
  const features: DocumentFeatures = {
    pageNumbers:    false,
    miniSignatures: false,
    finalSignature: false,
  }
  const cleaned: string[] = []
  for (const line of md.split('\n')) {
    const m = line.trim().match(DIRECTIVE_RE)
    if (m) {
      switch (m[1]) {
        case 'page-number':      features.pageNumbers    = true; break
        case 'signature-mini':   features.miniSignatures = true; break
        case 'signature-final':  features.finalSignature = true; break
      }
      continue   // remove directive from body
    }
    cleaned.push(line)
  }
  return { features, cleaned: cleaned.join('\n') }
}

// ─── Markdown → blocks ─────────────────────────────────────────────

function parseBlocks(md: string): MdBlock[] {
  const lines = md.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (/^#\s/.test(line) && !/^##/.test(line)) {
      const text = stripMarkdown(line.replace(/^#\s+/, ''))
      if (text) blocks.push({ type: 'h1', text })
      i++; continue
    }
    if (/^##\s/.test(line)) {
      const text = stripMarkdown(line.replace(/^##\s+/, ''))
      if (text) blocks.push({ type: 'h2', text })
      i++; continue
    }

    if (/^\{space:\d+(\.\d+)?\}$/.test(line.trim())) {
      const h = parseFloat(line.trim().replace(/[^0-9.]/g, ''))
      blocks.push({ type: 'space', height: h }); i++; continue
    }
    if (line.trim() === '{break}') {
      blocks.push({ type: 'break' }); i++; continue
    }

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) {
        tableLines.push(lines[i] ?? ''); i++
      }
      const allRows: string[][] = []
      let cols: ColSpec[] = []
      for (const tl of tableLines) {
        const cells = tl.split('|').slice(1, -1).map(c =>
          c.trim().replace(/\\n/g, '\n').replace(/\\t/g, '    ').replace(/\\s/g, ' ')
        )
        if (isSeparatorRow(cells)) { cols = parseColSpecs(cells) }
        else                       { allRows.push(cells) }
      }
      if (allRows.length === 0) continue
      const maxCols = Math.max(...allRows.map(r => r.length))
      blocks.push({ type: 'table', rows: allRows, cols, wide: maxCols > 8 })
      continue
    }

    if (line.trim() === '') {
      blocks.push({ type: 'blank' }); i++; continue
    }

    const indentMatch = line.match(/^>(\d+)?\s+(.*)/)
    if (indentMatch) {
      const indent = parseInt(indentMatch[1] ?? '20', 10)
      const raw = indentMatch[2] ?? ''
      const isBold = /^\*\*/.test(raw.trim())
      const text = stripMarkdown(raw)
      if (text) blocks.push({ type: 'p', text, bold: isBold, indent })
      i++; continue
    }

    const isBold = /^\*\*/.test(line.trim()) || (/\*\*/.test(line) && line.trim().endsWith('**'))
    const text = stripMarkdown(line)
    if (text) blocks.push({ type: 'p', text, bold: isBold })
    i++
  }

  return blocks
}

// ─── Public entry point ────────────────────────────────────────────

export function parseTemplate(
  mdContent: string,
  vars: Record<string, string>,
): ParsedDocument {
  const deEscaped         = deEscape(mdContent)
  const substituted       = substituteVars(deEscaped, vars)
  const { features, cleaned } = extractDirectives(substituted)
  const blocks            = parseBlocks(cleaned)
  return { blocks, features }
}
