import type { ProjectFacility } from '../types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

export function buildFacilitiesSection(params: {
  sectionNum: number
  stockProjectName: string
  /** Phase 3: project facility records from DB (project_facilities table TBD). */
  facilities?: ProjectFacility[]
}): string {
  const { facilities } = params
  const hasFacilities = facilities && facilities.length > 0

  const facilityRows = hasFacilities
    ? facilities!.map((f, i) => `<tr>
  <td class="att-td-num">${i + 1}</td>
  <td style="font-weight:700">${esc(f.name)}</td>
  <td>${esc(f.detail ?? '')}</td>
  <td class="att-td-check">${esc(f.hours ?? '')}</td>
</tr>`).join('\n')
    : ''

  const facilityTable = hasFacilities ? `<table class="att-table" style="margin-bottom:12pt">
  <thead>
    <tr>
      <th class="att-td-num">#</th>
      <th class="att-th-left">สิ่งอำนวยความสะดวก / Facility</th>
      <th class="att-th-left">รายละเอียด / Details</th>
      <th class="att-td-check">เวลาเปิด / Hours</th>
    </tr>
  </thead>
  <tbody>${facilityRows}</tbody>
</table>` : `<div class="att-placeholder">
  <div class="att-placeholder-text">ข้อมูลสิ่งอำนวยความสะดวกของโครงการ</div>
  <div class="att-placeholder-note">Project facilities data will be available once the project profile is completed (Phase 3).<br/>ข้อมูลสิ่งอำนวยความสะดวกจะแสดงเมื่อกรอกข้อมูลโครงการครบถ้วน</div>
</div>`

  return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">สิ่งอำนวยความสะดวกของโครงการ</div>
    <div class="att-section-en">Project Facilities — ${esc(params.stockProjectName)}</div>
  </div>
</div>
${facilityTable}
<div style="margin-top:14pt">
  <div style="font-size:8.5pt;font-weight:700;color:#1B3B6F;margin-bottom:6pt">บันทึก / Notes for Resident</div>
  <div style="border:0.5pt solid #D0DBF0;border-radius:4pt;min-height:60pt;padding:8pt;background:#FAFBFF;font-size:8.5pt;color:#888">
    ${hasFacilities ? '' : 'กรอกข้อมูลที่เป็นประโยชน์สำหรับผู้พักอาศัย / Useful information for residents...'}
  </div>
</div>
<div class="att-sig-row">
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้ให้เช่า / Landlord</div>
    <div class="att-sig-date">วันที่ / Date: ................................</div>
  </div>
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้เช่า / Tenant</div>
    <div class="att-sig-date">วันที่ / Date: ................................</div>
  </div>
</div>`
}
