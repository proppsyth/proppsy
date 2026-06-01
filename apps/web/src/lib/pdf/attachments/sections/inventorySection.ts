import type { FurnitureItem } from '../types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

const CONDITION_TH: Record<FurnitureItem['condition'], string> = {
  good:    'ดี',
  fair:    'พอใช้',
  damaged: 'ชำรุด',
  missing: 'ไม่มี',
}

export function buildInventorySection(params: {
  sectionNum: number
  stockUnitNo: string
  contractDate: string
  items: FurnitureItem[]
}): string {
  const { items } = params

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
    .map((item, i) => `<tr>
  <td class="att-td-num">${i + 1}</td>
  <td>${esc(item.item_name)}${item.serial_no ? `<br/><span style="font-size:7.5pt;color:#6B7A99">S/N: ${esc(item.serial_no)}</span>` : ''}</td>
  <td class="att-td-qty" style="text-align:center">${item.quantity}</td>
  <td class="att-td-check" style="text-align:center">${esc(CONDITION_TH[item.condition])}</td>
  <td class="att-td-note" style="font-size:8pt;color:#555">${esc(item.notes ?? '')}</td>
  <td class="att-td-check" style="height:20pt"></td>
  <td class="att-td-note" style="height:20pt"></td>
</tr>`).join('\n')

  return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">บัญชีรายการทรัพย์สิน</div>
    <div class="att-section-en">Inventory Checklist — Unit ${esc(params.stockUnitNo)}</div>
  </div>
</div>
<div class="att-note">สภาพขาเข้าบันทึกไว้แล้ว · กรอกสภาพขาออกเมื่อคืนห้อง / Move-in condition recorded · Fill move-out condition on checkout.</div>
<table class="att-table">
  <thead>
    <tr>
      <th class="att-td-num">#</th>
      <th class="att-th-left">รายการ / Item</th>
      <th class="att-td-qty">จำนวน<br/>Qty</th>
      <th class="att-td-check">สภาพขาเข้า<br/>Move-in</th>
      <th class="att-td-note">หมายเหตุ / Note</th>
      <th class="att-td-check">สภาพขาออก<br/>Move-out</th>
      <th class="att-td-note">หมายเหตุ / Note</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
<div class="att-sig-row">
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้ให้เช่า / Landlord</div>
    <div class="att-sig-date">วันที่รับมอบ / Move-in date: ................................</div>
  </div>
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้เช่า / Tenant</div>
    <div class="att-sig-date">วันที่รับมอบ / Move-in date: ................................</div>
  </div>
</div>
<div class="att-sig-row" style="margin-top:12pt">
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้ให้เช่า / Landlord</div>
    <div class="att-sig-date">วันที่คืนมอบ / Move-out date: ................................</div>
  </div>
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้เช่า / Tenant</div>
    <div class="att-sig-date">วันที่คืนมอบ / Move-out date: ................................</div>
  </div>
</div>`
}
