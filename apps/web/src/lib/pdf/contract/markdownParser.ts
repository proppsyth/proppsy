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
  | { type: 'line' }
  | { type: 'divider' }
  | { type: 'bankcard'; bankName: string; accountName: string; accountNo: string }
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
    if (line.trim() === '{line}') {
      blocks.push({ type: 'line' }); i++; continue
    }
    if (line.trim() === '{divider}') {
      blocks.push({ type: 'divider' }); i++; continue
    }
    const bankcardM = /^\{bankcard:([^}]*)\}$/.exec(line.trim())
    if (bankcardM) {
      const args = bankcardM[1]!.split('|')
      blocks.push({
        type:        'bankcard',
        bankName:    (args[0] ?? '').trim(),
        accountName: (args[1] ?? '').trim(),
        accountNo:   (args[2] ?? '').trim(),
      })
      i++; continue
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
