// Thin orchestrator: .md → HTML → Puppeteer → PDF buffer.
//
// Migrated from react-pdf (2026-05-25) due to React-PDF v4 line wrapping engine
// limitations for Thai (characters dropped at wrap boundaries — confirmed via
// minimal pure-contiguous test).
//
// Pipeline:
//   .md template + vars
//     → markdownParser.parseTemplate()  → { blocks, features }
//     → blocksToHtml(blocks)             → HTML body
//     → htmlToPdfBuffer(...)             → Puppeteer (Chromium-native Thai)
//
// Chromium has native Thai shaping + proper line breaking, eliminating glyph
// truncation issues entirely.

import { parseTemplate } from './contract/markdownParser'
import { blocksToHtml } from './contract/markdownToHtml'
import { htmlToPdfBuffer } from './contract/htmlToPdf'
import type { PdfSigner as HtmlPdfSigner } from './contract/htmlToPdf'

// Backward-compat exports (existing callers depend on these)
export { deEscape, substituteVars } from './contract/markdownParser'

// Public types (preserve original PdfMeta shape so actions.ts is unchanged)
export interface PdfSigner extends HtmlPdfSigner {}

export interface PdfMeta {
  contractId?:   string
  docTypeLabel?: string
  agentName?:    string
  agentPhone?:   string
  status?:       string
  isFinalized?:  boolean
  generatedAt?:  string
  signers?:      PdfSigner[]
}

const DEFAULT_SIGNERS: PdfSigner[] = [
  { label: 'ผู้ให้เช่า', name: '' },
  { label: 'ผู้เช่า',    name: '' },
]

export async function renderMarkdownAsPdf(
  mdContent: string,
  vars: Record<string, string>,
  meta?: Partial<PdfMeta>,
): Promise<Buffer> {
  const { blocks, features } = parseTemplate(mdContent, vars)
  const bodyHtml = blocksToHtml(blocks)

  const status = meta?.status ?? 'draft'
  const statusText = meta?.isFinalized
    ? 'FINALIZED'
    : (status === 'draft' ? 'DRAFT' : status.toUpperCase().replace(/_/g, ' '))

  return htmlToPdfBuffer({
    bodyHtml,
    contractId:   meta?.contractId   ?? '',
    docTypeLabel: meta?.docTypeLabel ?? 'เอกสารสัญญา',
    agentName:    meta?.agentName    ?? '',
    agentPhone:   meta?.agentPhone   ?? '',
    statusText,
    signers:      meta?.signers      ?? DEFAULT_SIGNERS,
    features,
  })
}
