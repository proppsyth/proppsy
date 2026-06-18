// Client-side image processing using the Canvas API — no external dependencies.

const WEBP_QUALITY = 0.8
const WATERMARK_TEXT = 'ใช้สำหรับ Proppsy เท่านั้น'

// Ensure the watermark font is actually loaded before drawing to canvas.
// Without this, the canvas falls back to a default font that lacks proper Thai
// metrics — the watermark text renders cut off / misaligned.
async function ensureFont(fontSize: number): Promise<void> {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.load(`bold ${fontSize}px Sarabun`)
      await document.fonts.ready
    }
  } catch {
    // Font loading is best-effort; fall back to whatever is available.
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

function drawToBlob(img: HTMLImageElement, maxWidth: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('canvas toBlob failed')),
      'image/webp',
      WEBP_QUALITY,
    )
  )
}

// Single image → WebP (used for signatures, profiles, news covers).
export async function processToWebp(file: File, maxWidth = 1280): Promise<Blob> {
  const img = await loadImage(file)
  return drawToBlob(img, maxWidth)
}

// Property image → two sizes from one decode pass.
export async function processPropertyImages(
  file: File,
): Promise<{ main: Blob; thumb: Blob }> {
  const img = await loadImage(file)
  const [main, thumb] = await Promise.all([
    drawToBlob(img, 1920),
    drawToBlob(img, 400),
  ])
  return { main, thumb }
}

// Bank book → small "Proppsy" watermark at bottom-right corner (non-intrusive).
export async function applyBankBookWatermark(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const fontSize = Math.max(11, Math.round(canvas.width * 0.025))
  const pad = Math.round(fontSize * 0.5)
  const text = 'Proppsy'

  await ensureFont(fontSize)
  ctx.font = `bold ${fontSize}px 'Sarabun', sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const tw = ctx.measureText(text).width
  const bx = canvas.width - tw - pad * 3
  const by = canvas.height - fontSize - pad * 3

  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.fillRect(bx, by, tw + pad * 2, fontSize + pad * 2)

  ctx.fillStyle = 'rgba(255,255,255,0.90)'
  ctx.fillText(text, bx + pad, by + pad)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('canvas toBlob failed')),
      'image/webp',
      WEBP_QUALITY,
    )
  )
}

// ID card → resize + centred watermark strip overlay.
export async function applyIdCardWatermark(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const fontSize = Math.max(14, Math.round(canvas.width * 0.045))
  await ensureFont(fontSize)
  ctx.font = `bold ${fontSize}px 'Sarabun', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const stripH = fontSize * 2.4
  const stripY = canvas.height / 2 - stripH / 2
  ctx.fillStyle = 'rgba(0,0,0,0.50)'
  ctx.fillRect(0, stripY, canvas.width, stripH)

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText(WATERMARK_TEXT, canvas.width / 2, canvas.height / 2)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('canvas toBlob failed')),
      'image/webp',
      WEBP_QUALITY,
    )
  )
}
