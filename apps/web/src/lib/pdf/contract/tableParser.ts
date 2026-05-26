// Isolated, defensive markdown table parser.
//
// Design principles:
//   1. NO unsafe assumptions — every regex match, array access, parseFloat
//      result is null-checked.
//   2. NO uncaught throws — malformed input returns a controlled error,
//      never an exception that crashes RSC streaming.
//   3. Logs offending input via console.warn (won't crash, debuggable).
//   4. Always produces a renderable TableBlock or null; never undefined.
//   5. Normalizes column count across header / spec / data rows.

// ─── Public types ──────────────────────────────────────────────────

export type ColAlign = 'left' | 'right' | 'center' | 'none'

export interface ColSpec {
  align:      ColAlign
  flex:       number       // always finite, >= 0
  underline:  boolean      // explicit; never undefined
}

export interface TableBlock {
  type: 'table'
  rows: string[][]
  cols: ColSpec[]
  wide: boolean
}

export interface ParseResult {
  table:    TableBlock | null
  error?:   string
  warnings: string[]
}

// ─── Internal helpers ──────────────────────────────────────────────

/** True if cell looks like a width/spec token (digits, colons, tildes, dashes, dots, whitespace). */
export function isSpecCell(c: string): boolean {
  return /^[-:~\s\d.]*$/.test(c)
}

/** A row is a "spec row" only when EVERY cell looks like a spec token. */
export function isSpecRow(cells: string[]): boolean {
  if (cells.length === 0) return false
  return cells.every(isSpecCell)
}

/** Safe float parse — returns null on NaN/Infinity. */
function safeFloat(s: string): number | null {
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/** Clamp to non-negative finite, default to 1 if invalid. */
function safeFlex(n: number | null): number {
  if (n === null || !Number.isFinite(n)) return 1
  return Math.max(0, n)
}

// ─── Single-cell spec parser ───────────────────────────────────────

/**
 * Parse a single spec cell into a ColSpec. Always returns a valid ColSpec,
 * never throws. Unrecognized syntax falls back to `{ align: 'none', flex: 1, underline: false }`.
 *
 * Supported forms (in priority order):
 *   ~N~     → center alignment, NO underline
 *   :N:     → center alignment, WITH underline (value cell)
 *   N:      → right alignment
 *   :N      → left alignment
 *   N       → no specified align (renders left), no underline
 *   ----    → dash form: flex = (dashes-2)*0.5, may combine with :
 *   ""      → empty cell → default
 */
export function parseSpecCell(raw: string): ColSpec {
  const s = (raw ?? '').trim()
  if (s === '') return { align: 'none', flex: 1, underline: false }

  // 1) ~N~ → plain center (no underline)
  // Accepts: ~1~ ~1.5~ ~2.25~ ~10.5~ ~0.5~ ~.5~ ~1.~ and whitespace inside
  // (the inner number regex is permissive: digits then optional `.digits`,
  // or `.digits` alone, with safeFloat falling back to 1 if NaN).
  const tildeMatch = s.match(/^~\s*(\d*\.?\d+|\d+\.?)\s*~$/)
  if (tildeMatch) {
    return { align: 'center', flex: safeFlex(safeFloat(tildeMatch[1] ?? '')), underline: false }
  }

  // 2) Determine alignment from leading/trailing colons
  const hasLeading  = s.startsWith(':')
  const hasTrailing = s.endsWith(':')
  let align: ColAlign = 'none'
  if (hasLeading && hasTrailing)      align = 'center'
  else if (hasTrailing)               align = 'right'
  else if (hasLeading)                align = 'left'

  // Underline only when explicitly `:N:` (both colons)
  const underline = hasLeading && hasTrailing

  // 3) Extract numeric flex (after stripping colons).
  // Accepts decimals with or without leading/trailing digit (.5, 5., 1.5)
  const inner = s.replace(/:/g, '').trim()
  const numMatch = inner.match(/^(\d*\.?\d+|\d+\.?)$/)
  if (numMatch) {
    return { align, flex: safeFlex(safeFloat(numMatch[1] ?? '')), underline }
  }

  // 4) Dash form `:----:` → flex = (dashes - 2) * 0.5, min 0
  const dashes = (inner.match(/-/g) ?? []).length
  if (dashes > 0) {
    return { align, flex: Math.max(0, (dashes - 2) * 0.5), underline }
  }

  // 5) Fallback (e.g., spec-shaped but unrecognized — only colons, only tildes, etc.)
  return { align, flex: 1, underline }
}

// ─── Row splitter ──────────────────────────────────────────────────

/**
 * Split a single markdown table row "| a | b | c |" into trimmed cells.
 * Defensive against odd whitespace, missing leading/trailing pipes.
 */
export function splitRow(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  // Strip leading/trailing pipes if present
  const body = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
  return body.split('|').map(c =>
    c.trim()
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '    ')
      .replace(/\\s/g, ' ')
  )
}

// ─── Normalization ─────────────────────────────────────────────────

/** Pad short rows with empty cells, truncate long rows, so all match `target`. */
function normalizeRowWidth(row: string[], target: number): string[] {
  if (row.length === target) return row
  if (row.length < target)  return [...row, ...Array(target - row.length).fill('')]
  return row.slice(0, target)
}

// ─── Public entry point ────────────────────────────────────────────

/**
 * Parse a block of consecutive markdown table lines into a TableBlock.
 * Never throws. Returns null + error message for unparseable input.
 *
 * @param lines  Raw markdown lines that all start with `|`.
 * @returns      { table, error?, warnings }
 */
export function parseTable(lines: string[]): ParseResult {
  const warnings: string[] = []

  if (!Array.isArray(lines) || lines.length === 0) {
    return { table: null, error: 'empty input', warnings }
  }

  const allRows: string[][] = []
  let cols: ColSpec[] = []
  let specRowCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const cells = splitRow(line)

    if (cells.length === 0) {
      warnings.push(`line ${i}: empty row after split: ${JSON.stringify(line)}`)
      continue
    }

    if (isSpecRow(cells)) {
      specRowCount++
      if (specRowCount > 1) {
        warnings.push(`line ${i}: multiple spec rows in same table; later one wins`)
      }
      try {
        cols = cells.map(parseSpecCell)
      } catch (e) {
        warnings.push(`line ${i}: spec parse failed: ${(e as Error).message}`)
        cols = cells.map(() => ({ align: 'none' as ColAlign, flex: 1, underline: false }))
      }
    } else {
      allRows.push(cells)
    }
  }

  if (allRows.length === 0) {
    return {
      table: null,
      error: 'no content rows found',
      warnings,
    }
  }

  // Determine canonical column count from content rows
  const maxCols = Math.max(...allRows.map(r => r.length))
  if (maxCols < 1) {
    return { table: null, error: 'rows have zero columns', warnings }
  }

  // Normalize all content rows to the canonical width
  const normalizedRows = allRows.map((r, idx) => {
    if (r.length !== maxCols) {
      warnings.push(`row ${idx}: column count ${r.length} ≠ canonical ${maxCols}, padding/truncating`)
    }
    return normalizeRowWidth(r, maxCols)
  })

  // Normalize spec to canonical width
  let normalizedCols: ColSpec[]
  if (cols.length === 0) {
    // No spec row provided — synthesize default
    normalizedCols = Array.from({ length: maxCols }, () => ({
      align: 'none' as ColAlign,
      flex: 1,
      underline: false,
    }))
  } else if (cols.length === maxCols) {
    normalizedCols = cols
  } else {
    warnings.push(`spec column count ${cols.length} ≠ data column count ${maxCols}, normalizing`)
    if (cols.length < maxCols) {
      const padding: ColSpec[] = Array.from({ length: maxCols - cols.length }, () => ({
        align: 'none' as ColAlign,
        flex: 1,
        underline: false,
      }))
      normalizedCols = [...cols, ...padding]
    } else {
      normalizedCols = cols.slice(0, maxCols)
    }
  }

  // Final sanity check — every cell renderable
  for (const col of normalizedCols) {
    if (!Number.isFinite(col.flex) || col.flex < 0) {
      warnings.push(`bad flex ${col.flex} clamped to 1`)
      col.flex = 1
    }
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[tableParser] warnings:', warnings, 'input:', lines)
  }

  return {
    table: {
      type: 'table',
      rows: normalizedRows,
      cols: normalizedCols,
      wide: maxCols > 8,
    },
    warnings,
  }
}
