function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

function idCardBlock(params: {
  role: string
  roleEn: string
  name: string
  nationalId: string
  dataUrl: string | null
}): string {
  const imgHtml = params.dataUrl
    ? `<div class="att-idcard-wrapper">
        <img class="att-idcard-img" src="${params.dataUrl}" alt="ID card" />
        <div class="att-idcard-watermark">สำเนาถูกต้อง</div>
       </div>`
    : `<div class="att-idcard-none">ไม่พบไฟล์บัตรประชาชน<br/>ID card not on file</div>`

  return `<div class="att-idcard-block">
  <div class="att-idcard-person">${esc(params.role)} / ${esc(params.roleEn)}: ${esc(params.name)}</div>
  ${params.nationalId ? `<div class="att-idcard-meta">เลขบัตรประชาชน / National ID: ${esc(params.nationalId)}</div>` : ''}
  ${imgHtml}
</div>`
}

export function buildIdCardSection(params: {
  sectionNum: number
  ownerName: string
  ownerNationalId: string
  ownerDataUrl: string | null
  customerName: string
  customerNationalId: string
  customerDataUrl: string | null
}): string {
  return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">สำเนาบัตรประชาชน</div>
    <div class="att-section-en">ID Card Copies</div>
  </div>
</div>
<div class="att-note">สำเนาบัตรประชาชนฉบับนี้ใช้ประกอบการทำสัญญาเช่าเท่านั้น / These ID card copies are for lease agreement purposes only.</div>
${idCardBlock({ role: 'ผู้ให้เช่า', roleEn: 'Landlord', name: params.ownerName, nationalId: params.ownerNationalId, dataUrl: params.ownerDataUrl })}
${idCardBlock({ role: 'ผู้เช่า', roleEn: 'Tenant', name: params.customerName, nationalId: params.customerNationalId, dataUrl: params.customerDataUrl })}
<div class="att-sig-row">
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้ให้เช่ารับรองสำเนาถูกต้อง / Landlord certifies copy</div>
    <div class="att-sig-date">วันที่ / Date: ................................</div>
  </div>
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้เช่ารับรองสำเนาถูกต้อง / Tenant certifies copy</div>
    <div class="att-sig-date">วันที่ / Date: ................................</div>
  </div>
</div>`
}
