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
  // Insert a page-break section then footer paragraphs before </w:body>
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

// ─── Main generator ───────────────────────────────────────────────

/**
 * Fill a .docx template with variable values.
 * Uses docxtemplater with custom delimiters << >> to match the canonical templates.
 * Appends the Proppsy footer notice at the end.
 *
 * @param filename   - filename of the template in public/template-doc/
 * @param variables  - all <<variable>> values keyed by their Thai names
 * @returns          - filled .docx as a Buffer
 */
export function generateDocx(
  filename: string,
  variables: Record<string, string>,
): Buffer {
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

  // Get the filled zip and append footer before generating output
  const filledZip = doc.getZip()
  const docXmlFile = filledZip.files['word/document.xml']
  if (docXmlFile) {
    filledZip.file('word/document.xml', appendFooterToXml(docXmlFile.asText()))
  }

  return filledZip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
}
