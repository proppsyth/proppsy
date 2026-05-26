// Markdown blocks → HTML for Puppeteer PDF pipeline.
// Browser handles Thai shaping/wrapping natively (no react-pdf limitations).

import type { MdBlock, ColSpec } from './markdownParser'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Convert **bold** markdown to <strong>, escape other HTML. */
function inlineMd(text: string): string {
  // Split by bold markers, escape each part, then wrap bold parts
  const parts = text.split(/(\*\*[^*]+\*\*)/)
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
  const parts: string[] = []
  let blankCount = 0

  for (const block of blocks) {
    if (block.type === 'space') {
      parts.push(`<div class="space" style="height:${block.height}pt"></div>`)
      continue
    }
    if (block.type === 'break') {
      parts.push(`<div class="page-break"></div>`)
      continue
    }
    if (block.type === 'blank') {
      blankCount++
      if (blankCount <= 1) parts.push(`<div class="blank"></div>`)
      continue
    }
    blankCount = 0

    if (block.type === 'h1') {
      parts.push(`<h1>${inlineMd(block.text)}</h1>`)
      continue
    }
    if (block.type === 'h2') {
      parts.push(`<h2>${inlineMd(block.text)}</h2>`)
      continue
    }
    if (block.type === 'p') {
      const indent = block.indent ? ` style="padding-left:${block.indent}pt"` : ''
      const cls = block.bold ? 'p-bold' : 'p'
      parts.push(`<p class="${cls}"${indent}>${inlineMd(block.text)}</p>`)
      continue
    }
    if (block.type === 'table') {
      if (block.wide) {
        // wide tables → fallback to paragraph (per existing markdownParser convention)
        block.rows.forEach(row => {
          const text = row.filter(c => c.length > 0).join('  ')
          if (text) parts.push(`<p class="p">${inlineMd(text)}</p>`)
        })
      } else {
        const isSingleCol = (block.rows[0]?.length ?? 0) === 1
        if (isSingleCol) {
          block.rows.forEach(row => {
            const text = row[0] ?? ''
            if (text) parts.push(`<p class="p">${inlineMd(text)}</p>`)
          })
        } else {
          parts.push(renderTable(block.rows, block.cols))
        }
      }
    }
  }

  return parts.join('\n')
}
