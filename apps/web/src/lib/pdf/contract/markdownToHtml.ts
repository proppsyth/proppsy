// Markdown blocks → HTML for Puppeteer PDF pipeline.
// Browser handles Thai shaping/wrapping natively (no react-pdf limitations).

import type { MdBlock, ColSpec } from './markdownParser'
import { isSafeMode } from './sanitize'

function safeWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV === 'production' && !isSafeMode()) return
  // eslint-disable-next-line no-console
  console.warn('[pdf:render]', ...args)
}

/** Render a single block, returning HTML. Throws on internal failure; the
 *  caller wraps this in a try/catch so one bad block can never crash the doc. */
function renderBlock(block: MdBlock, blankCountRef: { n: number }): string {
  if (block.type === 'space') {
    return `<div class="space" style="height:${block.height}pt"></div>`
  }
  if (block.type === 'break') {
    return `<div class="page-break"></div>`
  }
  if (block.type === 'blank') {
    blankCountRef.n++
    return blankCountRef.n <= 1 ? `<div class="blank"></div>` : ''
  }
  // any non-blank resets the consecutive-blank counter
  blankCountRef.n = 0

  if (block.type === 'h1') return `<h1>${inlineMd(block.text)}</h1>`
  if (block.type === 'h2') return `<h2>${inlineMd(block.text)}</h2>`
  if (block.type === 'p') {
    const indent = block.indent ? ` style="padding-left:${block.indent}pt"` : ''
    const cls = block.bold ? 'p-bold' : 'p'
    return `<p class="${cls}"${indent}>${inlineMd(block.text)}</p>`
  }
  if (block.type === 'table') {
    if (block.wide) {
      const out: string[] = []
      block.rows.forEach(row => {
        const text = row.filter(c => c.length > 0).join('  ')
        if (text) out.push(`<p class="p">${inlineMd(text)}</p>`)
      })
      return out.join('')
    }
    const isSingleCol = (block.rows[0]?.length ?? 0) === 1
    if (isSingleCol) {
      const out: string[] = []
      block.rows.forEach(row => {
        const text = row[0] ?? ''
        if (text) out.push(`<p class="p">${inlineMd(text)}</p>`)
      })
      return out.join('')
    }
    return renderTable(block.rows, block.cols)
  }
  return ''
}

/** Last-resort fallback: render a block as plain text paragraphs. Never throws. */
function renderBlockFallback(block: unknown): string {
  try {
    const b = (block ?? {}) as Record<string, unknown>
    if (typeof b.text === 'string' && b.text.trim()) {
      return `<p class="p">${inlineMd(String(b.text))}</p>`
    }
    if (Array.isArray(b.rows)) {
      const out: string[] = []
      for (const r of b.rows) {
        if (!Array.isArray(r)) continue
        const text = r.filter(c => typeof c === 'string' && c.length > 0).join('  ')
        if (text) out.push(`<p class="p">${inlineMd(text)}</p>`)
      }
      return out.join('')
    }
  } catch {
    /* swallow — fallback must never throw */
  }
  return ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Convert **bold** markdown to <strong>, escape other HTML. */
function inlineMd(text: unknown): string {
  // Coerce non-string defensively — never throw on a stray null/number.
  const s = typeof text === 'string' ? text : (text == null ? '' : String(text))
  // Split by bold markers, escape each part, then wrap bold parts
  const parts = s.split(/(\*\*[^*]+\*\*)/)
  return parts.map(p => {
    if (p.startsWith('**') && p.endsWith('**') && p.length >= 4) {
      return `<strong>${escapeHtml(p.slice(2, -2))}</strong>`
    }
    return escapeHtml(p)
  }).join('')
}

function alignClass(spec: ColSpec): string {
  if (spec.align === 'right')  return 'a-r'
  if (spec.align === 'center') return 'a-c'   // value cell — gets underline
  return 'a-l'
}

function renderTable(rows: string[][], cols: ColSpec[]): string {
  const cells = rows.map(row =>
    `<div class="row">${
      row.map((cell, ci) => {
        const spec: ColSpec = cols[ci] ?? { align: 'none', flex: 1, underline: false }
        const klass = alignClass(spec)
        // Underline only when explicit: spec.underline === true (from `:N:` syntax).
        // `~N~` keeps center alignment but underline=false → plain centered cell.
        const isValue = spec.underline === true
        return `<div class="cell ${klass} ${isValue ? 'value' : 'label'}" style="flex:${spec.flex}">${inlineMd(cell)}</div>`
      }).join('')
    }</div>`
  ).join('')
  return `<div class="table">${cells}</div>`
}

export function blocksToHtml(blocks: MdBlock[]): string {
  if (!Array.isArray(blocks)) {
    safeWarn('blocksToHtml received non-array; returning empty body')
    return ''
  }
  const parts: string[] = []
  const blankCountRef = { n: 0 }

  for (const block of blocks) {
    // Per-block isolation: if a single block throws, downgrade to plain text
    // and keep going. One malformed block must never crash the document.
    try {
      const html = renderBlock(block, blankCountRef)
      if (html) parts.push(html)
    } catch (e) {
      safeWarn('block render failed → fallback to paragraph:', (e as Error).message, block)
      const fb = renderBlockFallback(block)
      if (fb) parts.push(fb)
    }
  }

  return parts.join('\n')
}
