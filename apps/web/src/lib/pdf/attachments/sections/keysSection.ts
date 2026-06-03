import type { KeyItem } from '../types'
import type { SignerData } from '../buildAttachments'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtPenalty(amount: number): string {
  return new Intl.NumberFormat('th-TH').format(amount)
}

function sigBox(label: string, labelEn: string, subLabel: string, subLabelEn: string, sigDataUrl: string | null, dateText: string): string {
  return `<div class="att-sig-box">
    <div class="att-sig-img">${sigDataUrl ? `<img src="${sigDataUrl}" />` : ''}</div>
    <div class="att-sig-line"></div>
    <div class="att-sig-label">${esc(label)} / ${esc(labelEn)}</div>
    <div class="att-sig-date">${esc(subLabel)} / ${esc(subLabelEn)}<br/>${dateText}</div>
  </div>`
}

export function buildKeysSection(params: {
  sectionNum: number
  items?: KeyItem[]
  signerData: SignerData
}): string {
  const items = params.items ?? []
  const { signerData } = params
  const dateText = signerData.contractDate
    ? `วันที่ / Date: ${esc(signerData.contractDate)}`
    : 'วันที่ / Date: ................................'

  if (items.length === 0) {
    return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">การส่งมอบกุญแจและอุปกรณ์</div>
    <div class="att-section-en">Key &amp; Equipment Handover · Move-in</div>
  </div>
</div>
<div style="padding:24pt 0;text-align:center;color:#9BA8B9;font-size:9pt">
  ยังไม่มีรายการกุญแจและอุปกรณ์ · No key/equipment items recorded
</div>`
  }

  const rows = items.map((k, i) => `<tr>
  <td class="att-td-num">${i + 1}</td>
  <td>
    ${esc(k.name)}
    ${k.nameEn ? `<br/><span style="font-size:7.5pt;color:#6B7A99">${esc(k.nameEn)}</span>` : ''}
  </td>
  <td class="att-td-qty" style="text-align:center;vertical-align:middle">${k.quantity}</td>
  <td class="att-td-penalty" style="text-align:right;vertical-align:middle;white-space:nowrap">฿${fmtPenalty(k.penalty_amount)}</td>
  <td class="att-td-check" style="height:20pt"></td>
</tr>`).join('\n')

  return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">การส่งมอบกุญแจและอุปกรณ์</div>
    <div class="att-section-en">Key &amp; Equipment Handover · Move-in</div>
  </div>
</div>
<div class="att-note">กรุณาตรวจสอบจำนวนและลงนามรับมอบ · Please verify quantities and sign upon receipt. ค่าปรับกรณีสูญหายคำนวณต่อชิ้น / Lost penalty is per item.</div>
<table class="att-table">
  <thead>
    <tr>
      <th class="att-td-num">#</th>
      <th class="att-th-left">รายการ / Item</th>
      <th class="att-td-qty">จำนวน<br/>Qty</th>
      <th class="att-td-penalty">ค่าปรับกรณีสูญหาย<br/>Lost Penalty</th>
      <th class="att-td-check">รับมอบ<br/>Received ✓</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr>
      <td class="att-td-num" style="color:#B0BDD0">${items.length + 1}</td>
      <td colspan="4" style="color:#8090B0;font-size:8pt">อื่นๆ / Other: .........................................................................</td>
    </tr>
  </tbody>
</table>
<div class="att-sig-row" style="margin-top:16pt">
  ${sigBox('ผู้ให้เช่า', 'Landlord', 'ส่งมอบกุญแจ', 'Handover', signerData.ownerSignatureDataUrl, dateText)}
  ${sigBox('ผู้เช่า', 'Tenant', 'รับมอบกุญแจ', 'Received', signerData.customerSignatureDataUrl, dateText)}
</div>`
}
