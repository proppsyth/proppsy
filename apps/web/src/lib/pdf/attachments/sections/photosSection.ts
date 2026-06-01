function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

export function buildPhotosSection(params: {
  sectionNum: number
  stockUnitNo: string
  stockProjectName: string
  photoDataUrls: string[]
  contractDate: string
}): string {
  const { photoDataUrls } = params

  const photoCells = photoDataUrls.map((url, i) => `<div class="att-photo-cell">
  <img class="att-photo-img" src="${url}" alt="Photo ${i + 1}" />
  <div class="att-photo-num">ภาพที่ ${i + 1} / Photo ${i + 1}</div>
</div>`).join('\n')

  const noPhotos = photoDataUrls.length === 0
    ? `<div class="att-placeholder">
        <div class="att-placeholder-text">ไม่พบรูปถ่าย / No photos on file</div>
       </div>`
    : ''

  return `<div class="att-section-header">
  <div class="att-section-num">${params.sectionNum}</div>
  <div>
    <div class="att-section-title">รูปถ่ายสภาพห้อง</div>
    <div class="att-section-en">Property Photos — Unit ${esc(params.stockUnitNo)}, ${esc(params.stockProjectName)}</div>
  </div>
</div>
<div class="att-note">รูปถ่ายสภาพห้องและทรัพย์สิน ณ วันที่ ${esc(params.contractDate)} / Property condition photos as of ${esc(params.contractDate)} · ${photoDataUrls.length} ภาพ / photos</div>
${noPhotos}
<div class="att-photo-grid">
  ${photoCells}
</div>
<div class="att-sig-row">
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้ให้เช่าตรวจรับ / Landlord confirmed</div>
    <div class="att-sig-date">วันที่ / Date: ................................</div>
  </div>
  <div class="att-sig-box">
    <div class="att-sig-line"></div>
    <div class="att-sig-label">ผู้เช่าตรวจรับ / Tenant confirmed</div>
    <div class="att-sig-date">วันที่ / Date: ................................</div>
  </div>
</div>`
}
