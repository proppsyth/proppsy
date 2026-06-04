// Markdown blocks → HTML for Puppeteer PDF pipeline.
// Browser handles Thai shaping/wrapping natively (no react-pdf limitations).

import type { MdBlock, ColSpec } from './markdownParser'
import { isSafeMode } from './sanitize'
import { getBankLogoDataUrl } from './bankLogos'

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
  if (block.type === 'line') {
    const v = block.variant
    return `<div class="${v ? `hr-line hr-${escapeHtml(v)}` : 'hr-line'}"></div>`
  }
  if (block.type === 'divider') {
    return `<div class="divider"></div>`
  }
  if (block.type === 'bankcard') {
    const logoUrl = getBankLogoDataUrl(block.bankName)
    const logoSize = block.compact ? '36pt' : '54pt'
    const imgHtml = logoUrl
      ? `<img src="${logoUrl}" style="max-width:${logoSize};max-height:${logoSize};object-fit:contain" />`
      : `<span style="font-size:8pt;font-weight:700;color:#1B3B6F">${escapeHtml(block.bankName)}</span>`
    const infoLines = [
      block.bankName    ? `<div class="bankcard-bank">${escapeHtml(block.bankName)}</div>` : '',
      block.accountName ? `<div class="bankcard-line">ชื่อบัญชี: ${escapeHtml(block.accountName)}</div>` : '',
      block.accountNo   ? `<div class="bankcard-line">เลขบัญชี: ${escapeHtml(block.accountNo)}</div>` : '',
    ].filter(Boolean).join('')
    const cls = block.compact ? 'bankcard bankcard-compact' : 'bankcard'
    return `<div class="${cls}"><div class="bankcard-logo">${imgHtml}</div><div class="bankcard-info">${infoLines}</div></div>`
  }
  if (block.type === 'blank') {
    blankCountRef.n++
    return blankCountRef.n <= 1 ? `<div class="blank"></div>` : ''
  }
  // any non-blank resets the consecutive-blank counter
  blankCountRef.n = 0

  if (block.type === 'styled-p') return `<p class="sp-${escapeHtml(block.tag)}">${inlineMd(block.text)}</p>`
  if (block.type === 'param-block') {
    const en = escapeHtml(block.params[0] ?? '')
    const th = escapeHtml(block.params[1] ?? '')
    if (block.tag === 'section') {
      return `<div class="pb-section">${en ? `<div class="pb-section-en">${en}</div>` : ''}${th ? `<div class="pb-section-th">${th}</div>` : ''}</div>`
    }
    if (block.tag === 'label') {
      return `<p class="pb-label">${en ? `<span class="pb-label-en">${en}</span>` : ''}${th ? `<span class="pb-label-th">${th}</span>` : ''}</p>`
    }
    return ''
  }
  if (block.type === 'multi-block') {
    const tag = block.tag
    if (tag === 'heading') {
      const main = inlineMd(block.lines[0] ?? '')
      const subs = block.lines.slice(1).filter(l => l.trim()).map(l => `<p class="mb-heading-sub">${inlineMd(l)}</p>`).join('')
      return `<div class="mb-heading-wrap"><h1 class="mb-heading">${main}</h1>${subs}</div>`
    }
    if (tag === 'section-title') {
      const text = block.lines.map(l => inlineMd(l)).join(' ')
      return `<div class="mb-section-title">${text}</div>`
    }
    if (tag === 'label') {
      const linesHtml = block.lines.map(l => `<p class="mb-label-line">${inlineMd(l)}</p>`).join('')
      return `<div class="mb-label">${linesHtml}</div>`
    }
    if (tag === 'info-box') {
      const linesHtml = block.lines.map(l => {
        const parts = l.split('|')
        if (parts.length >= 2) {
          return `<div class="mb-info-row">${parts.map(p => `<span>${inlineMd(p.trim())}</span>`).join('')}</div>`
        }
        return `<p class="mb-info-line">${inlineMd(l)}</p>`
      }).join('')
      return `<div class="mb-info-box">${linesHtml}</div>`
    }
    if (tag === 'note') {
      const linesHtml = block.lines.map(l => `<p class="mb-note-line">${inlineMd(l)}</p>`).join('')
      return `<div class="mb-note">${linesHtml}</div>`
    }
    // box or box:variant
    const boxVariant = tag.startsWith('box:') ? escapeHtml(tag.slice(4)) : ''
    const boxCls = boxVariant ? `mb-box mb-box-${boxVariant}` : 'mb-box'
    const boxContent = block.lines.map(l => `<p class="mb-box-line">${inlineMd(l)}</p>`).join('')
    return `<div class="${boxCls}">${boxContent}</div>`
  }
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

/** Process **bold** markers and escape HTML. Used by inlineMd after extracting
 *  inline tags so those tags aren't escaped. */
function processBoldAndEscape(s: string): string {
  const parts = s.split(/(\*\*[^*]+\*\*)/)
  return parts.map(p => {
    if (p.startsWith('**') && p.endsWith('**') && p.length >= 4) {
      return `<strong>${escapeHtml(p.slice(2, -2))}</strong>`
    }
    return escapeHtml(p)
  }).join('')
}

// Inline tag patterns (processed before HTML escaping so they can emit raw HTML):
//   {size:N}text{/size}      — override font size, N clamped to 5–30 pt
//   {banklogo:NAME}           — emit bank logo <img>; empty if not found
//   {TAG}text{/TAG}           — bilingual/semantic inline span (see SEMANTIC_TAGS)
//   {color:VALUE}text{/color} — custom text color (hex or named)
const SEMANTIC_TAGS = 'en|th|zh|muted|small|italic|bold|underline|uppercase|lowercase|b|i|u'
const INLINE_RE = new RegExp(
  `\\{size:(\\d+(?:\\.\\d+)?)\\}([\\s\\S]*?)\\{\\/size\\}` +
  `|\\{banklogo:([^}]*)\\}` +
  `|\\{(${SEMANTIC_TAGS})\\}([\\s\\S]*?)\\{\\/\\4\\}` +
  `|\\{color:([^}]*)\\}([\\s\\S]*?)\\{\\/color\\}`,
  'g'
)

/** Convert inline markdown to HTML: bold, font-size overrides, bank logos. */
function inlineMd(text: unknown): string {
  const s = typeof text === 'string' ? text : (text == null ? '' : String(text))
  let result = ''
  let lastIndex = 0

  // Reset regex state for reuse (module-level regex with /g flag)
  INLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(s)) !== null) {
    result += processBoldAndEscape(s.slice(lastIndex, m.index))

    if (m[1] !== undefined) {
      // {size:N}text{/size}
      const rawSize = parseFloat(m[1])
      const sizeN = Number.isFinite(rawSize) ? Math.min(30, Math.max(5, rawSize)) : 9.5
      result += `<span style="font-size:${sizeN}pt">${processBoldAndEscape(m[2] ?? '')}</span>`
    } else if (m[3] !== undefined) {
      // {banklogo:NAME} — if logo not found, emit nothing silently
      const logoUrl = getBankLogoDataUrl(m[3])
      if (logoUrl) {
        result += `<img src="${logoUrl}" style="height:16pt;vertical-align:middle;display:inline-block" />`
      }
    } else if (m[4] !== undefined) {
      // {TAG}text{/TAG} — bilingual/semantic inline span
      result += `<span class="bi-${m[4]}">${processBoldAndEscape(m[5] ?? '')}</span>`
    } else if (m[6] !== undefined) {
      // {color:VALUE}text{/color} — custom color; value sanitized to hex or named colors only
      const rawColor = (m[6] ?? '').trim()
      const safeColor = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,25})$/.test(rawColor) ? rawColor : ''
      if (safeColor) {
        result += `<span style="color:${safeColor}">${processBoldAndEscape(m[7] ?? '')}</span>`
      } else {
        result += processBoldAndEscape(m[7] ?? '')
      }
    }

    lastIndex = m.index + m[0].length
  }
  result += processBoldAndEscape(s.slice(lastIndex))
  return result
}

function alignClass(spec: ColSpec): string {
  if (spec.align === 'right')  return 'a-r'
  if (spec.align === 'center') return 'a-c'   // value cell — gets underline
  return 'a-l'
}

/** Classify a row for styling. Runs on RAW cell content (before inlineMd). */
function classifyRow(row: string[], cols: ColSpec[]): string {
  const nonEmpty = row.filter(c => c.trim().length > 0)
  if (nonEmpty.length === 0) return 'row'

  const isBold = (c: string) => { const t = c.trim(); return t.startsWith('**') && t.endsWith('**') && t.length >= 4 }

  let cls = 'row'

  // Total-net row: bold cell that contains a digit AND 'บาท'
  if (row.some(c => isBold(c) && /\d/.test(c) && c.includes('บาท'))) cls = 'row row-total'

  // Column-header row: every non-empty cell is bold (labels, not amounts)
  else if (nonEmpty.length > 1 && nonEmpty.every(isBold)) cls = 'row row-header'

  // Amount-in-words row: single cell with {size:N} that contains Thai baht text.
  // Requires 'บาทถ้วน' to avoid misclassifying bilingual clause text that incidentally
  // contains {size:} but is NOT a financial amount row.
  else if (nonEmpty.length === 1 && nonEmpty[0]?.includes('{size:') && nonEmpty[0].includes('บาทถ้วน')) cls = 'row row-amtwords'

  // Compact info row: 4-col layout with right-aligned label in col 0 (non-bold)
  else if (row.length >= 4 && cols[0]?.align === 'right' && !isBold(row[0] ?? '')) cls = 'row row-info'

  if (cls !== 'row' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[pdf:classify] ${cls}`, JSON.stringify(nonEmpty.map(c => c.slice(0, 50))))
  }

  return cls
}

function renderTable(rows: string[][], cols: ColSpec[]): string {
  const cells = rows.map(row =>
    `<div class="${classifyRow(row, cols)}">${
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
