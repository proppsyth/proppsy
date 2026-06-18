import type { FurnitureItem } from '../types'
import type { SignerData } from '../buildAttachments'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

const CONDITION_BILINGUAL: Record<FurnitureItem['condition'], string> = {
  good:    'ดี / Good',
  fair:    'พอใช้ / Fair',
  damaged: 'ชำรุด / Damaged',
  missing: 'ไม่มี / Missing',
}

function sigBox(label: string, labelEn: string, subLabel: string, subLabelEn: string, name: string, sigDataUrl: string | null, dateText: string): string {
  return `<div class="att-sig-box">
    <div class="att-sig-img">${sigDataUrl ? `<img src="${sigDataUrl}" />` : ''}</div>
    <div class="att-sig-line"></div>
    <div class="att-sig-label">${esc(label)} / ${esc(labelEn)}</div>
    <div class="att-sig-date">(${esc(name)})<br/>${esc(subLabel)} / ${esc(subLabelEn)}<br/>${dateText}</div>
  </div>`
}

export function buildInventorySection(params: {
  sectionNum: number
  stockUnitNo: string
  contractDate: string
  items: FurnitureItem[]
  signerData: SignerData
}): string {
  const { items, signerData } = params
  const dateText = signerData.contractDate
    ? `วันที่ / Date: ${esc(signerData.contractDate)}`
    : 'วันที่ / Date: ................................'

  if (items.length === 0) {
    return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">บัญชีรายการทรัพย์สิน</div>
    <div class="att-section-en">Inventory Checklist — Unit ${esc(params.stockUnitNo)}</div>
  </div>
</div>
<div class="att-placeholder">
  <div class="att-placeholder-text">ยังไม่มีรายการทรัพย์สิน</div>
  <div class="att-placeholder-note">บันทึกรายการทรัพย์สินในหน้าสัญญาเช่าเพื่อแสดงรายการที่นี่ / Add furniture items in the rental contract page to populate this list.</div>
</div>`
  }

  const rows = [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, i) => {
      const nameCell = item.item_name_en
        ? `${esc(item.item_name)}<br/><span style="font-size:7.5pt;color:#6B7A99">${esc(item.item_name_en)}</span>`
        : esc(item.item_name)
      return `<tr>
  <td class="att-td-num">${i + 1}</td>
  <td>${nameCell}${item.serial_no ? `<br/><span style="font-size:7.5pt;color:#6B7A99">S/N: ${esc(item.serial_no)}</span>` : ''}</td>
  <td class="att-td-qty" style="text-align:center">${item.quantity}</td>
  <td class="att-td-check" style="text-align:center;font-size:8pt">${esc(CONDITION_BILINGUAL[item.condition])}</td>
  <td class="att-td-note" style="font-size:8pt;color:#555">${esc(item.notes ?? '')}</td>
</tr>`
    }).join('\n')

  return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">บัญชีรายการทรัพย์สิน</div>
    <div class="att-section-en">Inventory Checklist — Unit ${esc(params.stockUnitNo)}</div>
  </div>
</div>
<div class="att-note">สภาพขาเข้าบันทึก ณ วันรับมอบ / Move-in condition recorded on handover.</div>
<table class="att-table">
  <thead>
    <tr>
      <th class="att-td-num">#</th>
      <th class="att-th-left">รายการ / Item</th>
      <th class="att-td-qty">จำนวน<br/>Qty</th>
      <th class="att-td-check">สภาพขาเข้า<br/>Move-in</th>
      <th class="att-td-note">หมายเหตุ / Note</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
<div class="att-sig-row">
  ${sigBox('ผู้ให้เช่า', 'Landlord', 'ลงนามรับมอบ', 'Move-in', signerData.ownerName, signerData.ownerSignatureDataUrl, dateText)}
  ${sigBox('ผู้เช่า', 'Tenant', 'ลงนามรับมอบ', 'Move-in', signerData.customerName, signerData.customerSignatureDataUrl, dateText)}
</div>`
}
