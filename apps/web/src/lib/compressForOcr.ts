// Resize + JPEG-compress an image client-side before sending to a server action.
// Keeps the longest edge ≤ 1280 px and quality at 0.85 — typically reduces a
// 5 MB phone photo to ~200 KB, well under the 10 MB server action body limit.
export async function compressForOcr(
  file: File,
  maxEdge = 1280,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      const [meta, base64] = dataUrl.split(',')
      resolve({ base64: base64 ?? '', mimeType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}
