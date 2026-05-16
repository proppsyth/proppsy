// docx contract generator
// Fills <<variable>> placeholders in canonical .docx templates using docxtemplater

import path from 'path'
import fs from 'fs'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

// ─── Footer notice (appended to every generated document) ────────

const FOOTER_PARAGRAPHS = [
  '',
  '____________________________________________________________',
  'หมายเหตุ:',
  'เอกสารฉบับนี้ Proppsy ออกให้กับฟรีแลนซ์โดยอัตโนมัติ',
  'หากท่านเป็นบริษัทจดทะเบียน กรุณาหักภาษี ณ ที่จ่ายในชื่อของฟรีแลนซ์ มิใช่ Proppsy',
  'กรณีที่ผู้ว่าจ้างต้องการเอกสารเพิ่มเติมจากฟรีแลนซ์ เพื่อใช้ประกอบการหักภาษี ณ ที่จ่าย ฟรีแลนซ์จะต้องเป็นผู้นำส่งเอกสารเหล่านั้นโดยตรง',
  'Proppsy ทำหน้าที่เป็นเพียงตัวกลางเชื่อมโยงระหว่างฟรีแลนซ์ และผู้ว่าจ้าง เพื่อช่วยให้ทั้งสองฝ่ายได้พบและพูดคุยกันได้อย่างสะดวก',
  'ทั้งนี้ บริษัทฯ ไม่มีส่วนร่วมในรายละเอียดของการทำงานระหว่างทั้งสองฝ่าย และไม่ได้เป็นคู่สัญญาในข้อตกลงใด ๆ โดยบริษัทสนับสนุนให้ผู้ว่าจ้างและฟรีแลนซ์ตกลงรายละเอียด ขอบเขตงาน และราคาให้ชัดเจนก่อนเริ่มงาน',
]

function buildFooterXml(): string {
  return FOOTER_PARAGRAPHS.map(text => {
    const isLine = text.startsWith('___')
    const fontSz = isLine ? '16' : '14' // 8pt / 7pt
    const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    return `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="${fontSz}"/><w:szCs w:val="${fontSz}"/><w:color w:val="888888"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`
  }).join('')
}

function appendFooterToXml(xml: string): string {
  const marker = '</w:body>'
  if (!xml.includes(marker)) return xml
  const footer = buildFooterXml()
  const sectionBreak = '<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>'
  return xml.replace(marker, sectionBreak + footer + marker)
}

// ─── Template file loader ─────────────────────────────────────────

const TEMPLATE_DIR = path.join(process.cwd(), 'public', 'template-doc')

function loadTemplateBuffer(filename: string): Buffer {
  const filePath = path.join(TEMPLATE_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filename}`)
  }
  return fs.readFileSync(filePath)
}

// ─── Signature footer types ───────────────────────────────────────

export interface DocxSignatureData {
  ownerName?: string | null
  ownerRole?: string
  ownerSigUrl?: string | null
  customerName?: string | null
  customerRole?: string
  customerSigUrl?: string | null
  agentName?: string | null
  agentSigUrl?: string | null
  /** When true: only agent signature shown (commission/co-agent docs) */
  showAgent?: boolean
}

// ─── Image fetch helper ───────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

// ─── OOXML helper: XML-escape a string ───────────────────────────

function xmlEsc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ─── OOXML: inline image drawing XML ─────────────────────────────
// cx/cy in EMU. 1 inch = 914400 EMU. ~3.6cm × 1.0cm = 1296000 × 360000 EMU

function buildInlineImageXml(rId: string, docPrId: number, cx = 1296000, cy = 360000): string {
  return [
    `<w:drawing>`,
    `<wp:inline distT="0" distB="0" distL="0" distR="0">`,
    `<wp:extent cx="${cx}" cy="${cy}"/>`,
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>`,
    `<wp:docPr id="${docPrId}" name="sig${docPrId}"/>`,
    `<wp:cNvGraphicFramePr>`,
    `<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>`,
    `</wp:cNvGraphicFramePr>`,
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`,
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`,
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`,
    `<pic:nvPicPr>`,
    `<pic:cNvPr id="${docPrId}" name="sig${docPrId}.png"/>`,
    `<pic:cNvPicPr/>`,
    `</pic:nvPicPr>`,
    `<pic:blipFill>`,
    `<a:blip r:embed="${rId}"/>`,
    `<a:stretch><a:fillRect/></a:stretch>`,
    `</pic:blipFill>`,
    `<pic:spPr>`,
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`,
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
    `</pic:spPr>`,
    `</pic:pic>`,
    `</a:graphicData>`,
    `</a:graphic>`,
    `</wp:inline>`,
    `</w:drawing>`,
  ].join('')
}

// ─── OOXML: footer cell XML ───────────────────────────────────────

interface SigSlot {
  rId: string | null
  docPrId: number
  name: string
  role: string
  colWidthTwips: number
}

function buildSigCell(slot: SigSlot): string {
  const nameEsc = xmlEsc(slot.name)
  const roleEsc = xmlEsc(slot.role)

  const imgParagraph = slot.rId
    ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="0"/></w:pPr><w:r>${buildInlineImageXml(slot.rId, slot.docPrId)}</w:r></w:p>`
    : `<w:p><w:pPr><w:spacing w:before="200" w:after="0"/></w:pPr></w:p>`

  return [
    `<w:tc>`,
    `<w:tcPr>`,
    `<w:tcW w:w="${slot.colWidthTwips}" w:type="dxa"/>`,
    `<w:tcBorders>`,
    `<w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>`,
    `<w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>`,
    `</w:tcBorders>`,
    `<w:vAlign w:val="top"/>`,
    `</w:tcPr>`,
    imgParagraph,
    `<w:p>`,
    `<w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>`,
    `<w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:b/><w:color w:val="222222"/></w:rPr>`,
    `<w:t xml:space="preserve">${nameEsc}</w:t></w:r>`,
    `</w:p>`,
    `<w:p>`,
    `<w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="40"/></w:pPr>`,
    `<w:r><w:rPr><w:sz w:val="14"/><w:szCs w:val="14"/><w:color w:val="888888"/></w:rPr>`,
    `<w:t xml:space="preserve">${roleEsc}</w:t></w:r>`,
    `</w:p>`,
    `</w:tc>`,
  ].join('')
}

// ─── OOXML: complete footer XML ───────────────────────────────────
// pageWidthTwips: A4 at 1-inch margins ≈ 9072 twips

function buildSigFooterXml(slots: SigSlot[]): string {
  const totalWidth = slots.reduce((s, c) => s + c.colWidthTwips, 0)
  const gridCols = slots.map(s => `<w:gridCol w:w="${s.colWidthTwips}"/>`).join('')
  const cells = slots.map(buildSigCell).join('')

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<w:ftr`,
    ` xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`,
    ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
    ` xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"`,
    ` xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"`,
    ` xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`,
    `<w:tbl>`,
    `<w:tblPr>`,
    `<w:tblW w:w="${totalWidth}" w:type="dxa"/>`,
    `<w:tblLayout w:type="fixed"/>`,
    `<w:tblCellMar>`,
    `<w:top w:w="0" w:type="dxa"/>`,
    `<w:left w:w="100" w:type="dxa"/>`,
    `<w:bottom w:w="0" w:type="dxa"/>`,
    `<w:right w:w="100" w:type="dxa"/>`,
    `</w:tblCellMar>`,
    `</w:tblPr>`,
    `<w:tblGrid>${gridCols}</w:tblGrid>`,
    `<w:tr>`,
    `<w:trPr><w:trHeight w:val="900" w:hRule="atLeast"/></w:trPr>`,
    cells,
    `</w:tr>`,
    `</w:tbl>`,
    `</w:ftr>`,
  ].join('')
}

// ─── OOXML: footer relationships XML ─────────────────────────────

function buildFooterRelsXml(rels: Array<{ id: string; filename: string }>): string {
  if (rels.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
  }
  const relXmls = rels.map(r =>
    `  <Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${r.filename}"/>`
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${relXmls}\n</Relationships>`
}

// ─── Footer injection into zip ────────────────────────────────────

async function injectFooterIntoZip(zip: PizZip, sigs: DocxSignatureData): Promise<void> {
  // Build the list of signature slots
  type RawSlot = { name: string; role: string; sigUrl: string | null | undefined }
  const rawSlots: RawSlot[] = []

  if (sigs.showAgent) {
    rawSlots.push({
      name: sigs.agentName ?? '-',
      role: 'ตัวแทน / นายหน้า',
      sigUrl: sigs.agentSigUrl,
    })
  } else {
    if (sigs.ownerName !== undefined) {
      rawSlots.push({
        name: sigs.ownerName ?? '-',
        role: sigs.ownerRole ?? 'ผู้ให้เช่า',
        sigUrl: sigs.ownerSigUrl,
      })
    }
    if (sigs.customerName !== undefined) {
      rawSlots.push({
        name: sigs.customerName ?? '-',
        role: sigs.customerRole ?? 'ผู้เช่า',
        sigUrl: sigs.customerSigUrl,
      })
    }
  }

  if (rawSlots.length === 0) return

  // Fetch images and build slots
  const imageRels: Array<{ id: string; filename: string }> = []
  const colWidthTwips = Math.floor(9072 / rawSlots.length)

  const slots: SigSlot[] = await Promise.all(
    rawSlots.map(async (raw, i) => {
      const rId = `rIdDocSig${i + 1}`
      const filename = `sig_footer_${i + 1}.png`

      if (raw.sigUrl) {
        const buf = await fetchImageBuffer(raw.sigUrl)
        if (buf) {
          zip.file(`word/media/${filename}`, buf)
          imageRels.push({ id: rId, filename })
          return { rId, docPrId: 100 + i, name: raw.name, role: raw.role, colWidthTwips }
        }
      }

      return { rId: null, docPrId: 100 + i, name: raw.name, role: raw.role, colWidthTwips }
    })
  )

  // Write footer1.xml
  zip.file('word/footer1.xml', buildSigFooterXml(slots))

  // Write footer1.xml.rels
  zip.file('word/_rels/footer1.xml.rels', buildFooterRelsXml(imageRels))

  // Update [Content_Types].xml — add footer part override
  const ctFile = zip.files['[Content_Types].xml']
  if (ctFile) {
    let ct = ctFile.asText()
    if (!ct.includes('/word/footer1.xml')) {
      ct = ct.replace(
        '</Types>',
        '  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>\n</Types>',
      )
      zip.file('[Content_Types].xml', ct)
    }
  }

  // Update word/_rels/document.xml.rels — add footer relationship
  const docRelsFile = zip.files['word/_rels/document.xml.rels']
  if (docRelsFile) {
    let docRels = docRelsFile.asText()
    if (!docRels.includes('rIdProppsySigFtr')) {
      docRels = docRels.replace(
        '</Relationships>',
        '  <Relationship Id="rIdProppsySigFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>\n</Relationships>',
      )
      zip.file('word/_rels/document.xml.rels', docRels)
    }
  }

  // Update word/document.xml — add footerReference to every sectPr
  const docXmlFile = zip.files['word/document.xml']
  if (docXmlFile) {
    let docXml = docXmlFile.asText()
    // Remove any existing Proppsy sig footer references to avoid duplicates on re-gen
    docXml = docXml.replace(/<w:footerReference w:type="default" r:id="rIdProppsySigFtr"\/>/g, '')
    // Inject before each </w:sectPr>
    docXml = docXml.replace(
      /<\/w:sectPr>/g,
      '<w:footerReference w:type="default" r:id="rIdProppsySigFtr"/></w:sectPr>',
    )
    zip.file('word/document.xml', docXml)
  }
}

// ─── Main generator ───────────────────────────────────────────────

/**
 * Fill a .docx template with variable values.
 * Uses docxtemplater with custom delimiters << >> to match the canonical templates.
 * Appends the Proppsy footer notice and (optionally) a per-page signature footer.
 *
 * @param filename   - filename of the template in public/template-doc/
 * @param variables  - all <<variable>> values keyed by their Thai names
 * @param signatures - optional signature data for per-page footer
 * @returns          - filled .docx as a Buffer
 */
export async function generateDocx(
  filename: string,
  variables: Record<string, string>,
  signatures?: DocxSignatureData,
): Promise<Buffer> {
  const templateBuffer = loadTemplateBuffer(filename)
  const zip = new PizZip(templateBuffer)

  // Custom parser allows any key name including spaces, dashes, Thai chars, parens
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '<<', end: '>>' },
    paragraphLoop: true,
    linebreaks: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parser: (tag: string) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (scope: any) => {
        const key = tag.trim()
        const val = scope[key]
        return val !== undefined && val !== null ? String(val) : ''
      },
    }),
  })

  doc.render(variables)

  // Append Proppsy text notice to document body
  const filledZip = doc.getZip()
  const docXmlFile = filledZip.files['word/document.xml']
  if (docXmlFile) {
    filledZip.file('word/document.xml', appendFooterToXml(docXmlFile.asText()))
  }

  // Inject per-page signature footer
  if (signatures) {
    await injectFooterIntoZip(filledZip, signatures)
  }

  return filledZip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
}
