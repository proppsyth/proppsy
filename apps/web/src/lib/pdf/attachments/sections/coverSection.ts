import type { AttachmentSection } from '../types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

const SECTION_LABELS: Record<AttachmentSection, string> = {
  'id-cards':  'สำเนาบัตรประชาชน / ID Card Copies',
  'inventory': 'บัญชีรายการทรัพย์สิน / Inventory Checklist',
  'photos':    'รูปถ่ายสภาพห้อง / Property Photos',
  'facilities':'สิ่งอำนวยความสะดวก / Project Facilities',
  'keys':      'การส่งมอบกุญแจ / Key Handover Form',
}

export function buildCoverSection(params: {
  contractId: string
  contractDate: string
  stockUnitNo: string
  stockProjectName: string
  sections: AttachmentSection[]
}): string {
  const tocItems = params.sections
    .map((s, i) => `<div class="att-toc-item">${i + 1}. ${esc(SECTION_LABELS[s])}</div>`)
    .join('')

  return `<div class="att-cover">
  <div class="att-cover-label">LEASE AGREEMENT</div>
  <div class="att-cover-title">เอกสารแนบประกอบสัญญาเช่า</div>
  <div class="att-cover-subtitle">Lease Agreement Attachments</div>
  <div class="att-cover-rule"></div>
  <div class="att-cover-meta">เลขที่สัญญา / Contract No: <strong>${esc(params.contractId)}</strong></div>
  <div class="att-cover-meta">ห้อง / Unit: <strong>${esc(params.stockUnitNo)}</strong></div>
  <div class="att-cover-meta">โครงการ / Project: <strong>${esc(params.stockProjectName)}</strong></div>
  <div class="att-cover-meta">วันที่ / Date: <strong>${esc(params.contractDate)}</strong></div>
  <div class="att-cover-toc">
    <div class="att-cover-toc-title">สารบัญเอกสาร / Table of Contents</div>
    ${tocItems}
  </div>
</div>`
}
