// Fault-tolerant sanitizer for parsed markdown blocks.
//
// Purpose: NO malformed block may ever reach the renderer. Any structural
// defect (missing arrays, null fields, bad numbers, invalid directive use)
// is downgraded to a safe paragraph or no-op, never an exception.
//
// SAFE_MODE: when PDF_SAFE_MODE=true, sanitization is silent (warnings only).
// Otherwise warnings are logged to console in dev.

import type { MdBlock, ColSpec, ColAlign, DocumentFeatures } from './markdownParser'

export function isSafeMode(): boolean {
  return process.env.PDF_SAFE_MODE === 'true' || process.env.PDF_SAFE_MODE === '1'
}

function warn(...args: unknown[]): void {
  if (process.env.NODE_ENV === 'production' && !isSafeMode()) return
  // eslint-disable-next-line no-console
  console.warn('[pdf:sanitize]', ...args)
}

function safeStr(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  try { return String(v) } catch { return '' }
}

function safeNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseFloat(safeStr(v))
  return Number.isFinite(n) ? n : fallback
}

function defaultCol(): ColSpec {
  return { align: 'none', flex: 1, underline: false }
}

function sanitizeCol(c: unknown): ColSpec {
  if (!c || typeof c !== 'object') return defaultCol()
  const obj = c as Record<string, unknown>
  const alignRaw = obj.align
  const align: ColAlign =
    alignRaw === 'left' || alignRaw === 'right' || alignRaw === 'center' || alignRaw === 'none'
      ? alignRaw
      : 'none'
  const flex = Math.max(0, safeNum(obj.flex, 1))
  const underline = obj.underline === true
  return { align, flex, underline }
}

function rowToParagraph(row: unknown): MdBlock | null {
  if (!Array.isArray(row)) return null
  const text = row.map(safeStr).filter(s => s.length > 0).join('  ').trim()
  if (!text) return null
  return { type: 'p', text, bold: false }
}

/**
 * Downgrade a malformed table into paragraph blocks. Preserves text content;
 * never returns a half-broken table. Never throws.
 */
function downgradeTable(b: unknown): MdBlock[] {
  const obj = (b ?? {}) as Record<string, unknown>
  const rows = Array.isArray(obj.rows) ? obj.rows : []
  const out: MdBlock[] = []
  for (const r of rows) {
    const p = rowToParagraph(r)
    if (p) out.push(p)
  }
  if (out.length === 0) {
    warn('table downgrade produced no content; dropping block', b)
  }
  return out
}

/**
 * Sanitize a single parsed block. Always returns a non-empty array of
 * renderable blocks (or [] when input is unrecoverable garbage).
 */
export function sanitizeBlock(block: unknown): MdBlock[] {
  if (!block || typeof block !== 'object') {
    warn('non-object block dropped', block)
    return []
  }
  const b = block as Record<string, unknown>
  const t = b.type

  switch (t) {
    case 'h1':
    case 'h2': {
      const text = safeStr(b.text).trim()
      if (!text) return []
      return [{ type: t, text }]
    }
    case 'p': {
      const text = safeStr(b.text).trim()
      if (!text) return []
      const bold = b.bold === true
      const indent = b.indent != null ? safeNum(b.indent, 0) : undefined
      const out: MdBlock = indent != null
        ? { type: 'p', text, bold, indent }
        : { type: 'p', text, bold }
      return [out]
    }
    case 'blank':
      return [{ type: 'blank' }]
    case 'break':
      return [{ type: 'break' }]
    case 'line':
      return [{ type: 'line' }]
    case 'divider':
      return [{ type: 'divider' }]
    case 'bankcard': {
      const bankName    = safeStr(b.bankName).trim()
      const accountName = safeStr(b.accountName).trim()
      const accountNo   = safeStr(b.accountNo).trim()
      return [{ type: 'bankcard', bankName, accountName, accountNo }]
    }
    case 'space': {
      const height = Math.max(0, safeNum(b.height, 0))
      return [{ type: 'space', height }]
    }
    case 'table': {
      if (!Array.isArray(b.rows)) {
        warn('table.rows is not an array → downgrade to paragraphs', b)
        return downgradeTable(b)
      }
      // Every row must be an array of primitives
      const rows: string[][] = []
      let malformed = false
      for (const r of b.rows) {
        if (!Array.isArray(r)) { malformed = true; break }
        rows.push(r.map(safeStr))
      }
      if (malformed) {
        warn('table has non-array row → downgrade to paragraphs', b)
        return downgradeTable(b)
      }
      if (rows.length === 0) {
        warn('table has zero rows → drop', b)
        return []
      }
      const maxCols = Math.max(1, ...rows.map(r => r.length))
      const normRows = rows.map(r => {
        if (r.length === maxCols) return r
        if (r.length < maxCols) return [...r, ...Array(maxCols - r.length).fill('')]
        return r.slice(0, maxCols)
      })
      const rawCols = Array.isArray(b.cols) ? b.cols : []
      let cols: ColSpec[] = rawCols.map(sanitizeCol)
      if (cols.length < maxCols) {
        cols = [...cols, ...Array.from({ length: maxCols - cols.length }, defaultCol)]
      } else if (cols.length > maxCols) {
        cols = cols.slice(0, maxCols)
      }
      const wide = b.wide === true || maxCols > 8
      return [{ type: 'table', rows: normRows, cols, wide }]
    }
    default:
      warn('unknown block type dropped', t, block)
      return []
  }
}

/**
 * Sanitize an entire block list. Never throws. Returns only renderable blocks.
 */
export function sanitizeBlocks(blocks: unknown): MdBlock[] {
  if (!Array.isArray(blocks)) {
    warn('blocks is not an array → empty document')
    return []
  }
  const out: MdBlock[] = []
  for (const b of blocks) {
    try {
      out.push(...sanitizeBlock(b))
    } catch (e) {
      warn('sanitizeBlock threw — block dropped', (e as Error).message, b)
    }
  }
  return out
}

/**
 * Sanitize feature flags. Always returns a complete DocumentFeatures object.
 */
export function sanitizeFeatures(f: unknown): DocumentFeatures {
  const obj = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>
  return {
    pageNumbers:    obj.pageNumbers    === true,
    miniSignatures: obj.miniSignatures === true,
    finalSignature: obj.finalSignature === true,
  }
}

/**
 * Validate directive placement / ordering. Directives are document-level,
 * so the only invalid case in practice is duplicates — which we silently
 * collapse via boolean flags. This hook exists so future directives with
 * positional semantics (e.g. `{break}` inside a table) get a single
 * enforcement point.
 *
 * Returns sanitized blocks with any positionally-invalid directive blocks
 * downgraded to no-ops.
 */
export function validateDirectivePlacement(blocks: MdBlock[]): MdBlock[] {
  const out: MdBlock[] = []
  let inTable = false  // currently unused but reserved for future contextual checks
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!
    if (b.type === 'break') {
      // {break} must not appear as the very first block (no content to break from)
      // or twice in a row (collapse).
      const prev = out[out.length - 1]
      if (out.length === 0) {
        warn('{break} at document start ignored')
        continue
      }
      if (prev && prev.type === 'break') {
        warn('consecutive {break} collapsed')
        continue
      }
    }
    out.push(b)
    void inTable
  }
  return out
}
