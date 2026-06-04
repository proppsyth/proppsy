// Parsing layer: .md template → semantic AST + feature directives.
// Table parsing is delegated to ./tableParser for isolation + validation.

import { parseTable as parseTableBlock } from './tableParser'
import type { ColSpec as TableColSpec, ColAlign as TableColAlign } from './tableParser'
import { sanitizeBlocks, sanitizeFeatures, validateDirectivePlacement } from './sanitize'

// ─── Public types ──────────────────────────────────────────────────

export type ColAlign = TableColAlign
export type ColSpec  = TableColSpec

export type MdBlock =
  | { type: 'h1';    text: string }
  | { type: 'h2';    text: string }
  | { type: 'p';     text: string; bold: boolean; indent?: number }
  | { type: 'blank' }
  | { type: 'space'; height: number }
  | { type: 'break' }
  | { type: 'line';    variant?: string }
  | { type: 'divider' }
  | { type: 'bankcard'; bankName: string; accountName: string; accountNo: string; compact: boolean }
  | { type: 'table'; rows: string[][]; cols: ColSpec[]; wide: boolean }
  | { type: 'styled-p';    tag: string; text: string }
  | { type: 'multi-block'; tag: string; lines: string[] }
  | { type: 'param-block'; tag: string; params: string[] }

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
  // Supports <<key>> and <<key|fallback>> — fallback renders when key is absent or empty
  const VAR_RE = new RegExp('<<([^>|]+)(?:\\|([^>]*))?>>',  'g')
  return md.replace(VAR_RE, (_, key: string, fallback?: string) => {
    const val = vars[key]
    if (val !== undefined && val !== '') return val
    return fallback ?? ''
  })
}

// ─── Helpers ───────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()
}

// Single-line block-level tag: {tag}text{/tag}
// Supported tags produce a styled paragraph — backward compatible, never breaks existing templates.
const STYLED_BLOCK_RE = new RegExp(
  '^\\{(en-title|th-subtitle|en|th|zh|muted|small|italic|bold|section|box|center|right)\\}(.*?)\\{/\\1\\}$'
)

// Single-line param block: {tag:param1|param2}  e.g. {section:ENGLISH|ไทย}
const PARAM_BLOCK_RE = /^\{(section|label):([^}]+)\}$/

// Multi-line block: {tag} on its own line, then content lines, then {/tag}
const MULTI_BLOCK_OPEN_RE = /^\{(heading|section-title|label|box(?::[a-z-]+)?|info-box|note)\}$/

// Table parsing now lives in ./tableParser.ts — robust, validated, isolated.

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
    const lineM = /^\{line(?::([a-z-]+))?\}$/.exec(line.trim())
    if (lineM) {
      const variant = lineM[1]
      blocks.push(variant ? { type: 'line', variant } : { type: 'line' })
      i++; continue
    }
    if (line.trim() === '{divider}') {
      blocks.push({ type: 'divider' }); i++; continue
    }
    const bankcardM = /^\{bankcard:([^}]*)\}$/.exec(line.trim())
    if (bankcardM) {
      let payload = bankcardM[1]!
      let compact = false
      if (payload.startsWith('compact:')) {
        compact = true
        payload = payload.slice('compact:'.length)
      }
      const args = payload.split('|')
      blocks.push({
        type:        'bankcard',
        bankName:    (args[0] ?? '').trim(),
        accountName: (args[1] ?? '').trim(),
        accountNo:   (args[2] ?? '').trim(),
        compact,
      })
      i++; continue
    }

    // Single-line param block: {section:EN|TH} or {label:EN|TH}
    const paramM = PARAM_BLOCK_RE.exec(line.trim())
    if (paramM) {
      const tag    = paramM[1]!
      const params = paramM[2]!.split('|').map(s => s.trim()).filter(Boolean)
      if (params.length > 0) blocks.push({ type: 'param-block', tag, params })
      i++; continue
    }

    // Multi-line block: {tag} on its own line, content lines, {/tag}
    const multiM = MULTI_BLOCK_OPEN_RE.exec(line.trim())
    if (multiM) {
      const tag = multiM[1]!
      const closeTag = `{/${tag}}`
      const contentLines: string[] = []
      i++
      while (i < lines.length && (lines[i] ?? '').trim() !== closeTag) {
        contentLines.push(lines[i] ?? ''); i++
      }
      if (i < lines.length) i++ // consume the closing tag line
      // Strip leading/trailing blank lines from content
      while (contentLines.length > 0 && !contentLines[0]!.trim()) contentLines.shift()
      while (contentLines.length > 0 && !contentLines[contentLines.length - 1]!.trim()) contentLines.pop()
      if (contentLines.length > 0) blocks.push({ type: 'multi-block', tag, lines: contentLines })
      continue
    }

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) {
        tableLines.push(lines[i] ?? ''); i++
      }
      // Delegate to robust table parser — handles malformed input gracefully
      const result = parseTableBlock(tableLines)
      if (!result.table) {
        // Could not parse — fall back to rendering raw text per line so content
        // doesn't disappear and the request doesn't crash RSC.
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[markdownParser] table parse failed:', result.error, tableLines)
        }
        for (const tl of tableLines) {
          const fallback = tl.replace(/^\s*\|/, '').replace(/\|\s*$/, '').trim()
          if (fallback) blocks.push({ type: 'p', text: fallback, bold: false })
        }
        continue
      }
      blocks.push(result.table)
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

    const styledM = STYLED_BLOCK_RE.exec(line.trim())
    if (styledM) {
      const tag  = styledM[1]!
      const text = styledM[2]!.trim()
      if (text) blocks.push({ type: 'styled-p', tag, text })
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
  let blocks: MdBlock[]
  try {
    blocks = parseBlocks(cleaned)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[markdownParser] parseBlocks threw, falling back to empty body:', (e as Error).message)
    }
    blocks = []
  }
  // Defense in depth: sanitize every block + features before they ever reach
  // the renderer. Malformed structures are downgraded, never propagated.
  const safeBlocks   = validateDirectivePlacement(sanitizeBlocks(blocks))
  const safeFeatures = sanitizeFeatures(features)
  return { blocks: safeBlocks, features: safeFeatures }
}
