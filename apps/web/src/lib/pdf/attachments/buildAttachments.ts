import type { AttachmentInput, AttachmentSection } from './types'
import { buildCoverSection }      from './sections/coverSection'
import { buildIdCardSection }     from './sections/idCardSection'
import { buildInventorySection }  from './sections/inventorySection'
import { buildPhotosSection }     from './sections/photosSection'
import { buildFacilitiesSection } from './sections/facilitiesSection'
import { buildKeysSection }       from './sections/keysSection'

const MAX_PHOTOS = 16

async function fetchAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface SignerData {
  ownerSignatureDataUrl: string | null
  customerSignatureDataUrl: string | null
  contractDate: string
}

/** Build complete attachment HTML for the requested sections.
 *  All images are fetched concurrently and embedded as data: URLs so Puppeteer
 *  request interception does not block them.
 */
export async function buildAttachmentHtml(input: AttachmentInput): Promise<string> {
  const { sections } = input
  if (sections.length === 0) return ''

  const needsIdCards = sections.includes('id-cards')
  const needsPhotos  = sections.includes('photos')
  const needsSigs    = !!(input.ownerSignatureUrl || input.customerSignatureUrl)

  const photoUrlsToFetch = input.stockPhotoUrls.slice(0, MAX_PHOTOS)

  // Fetch all images concurrently — ID cards, signatures, property photos
  const [
    ownerDataUrl,
    customerDataUrl,
    ownerSigDataUrl,
    customerSigDataUrl,
    ...photoDataUrlsMixed
  ] = await Promise.all([
    needsIdCards ? fetchAsDataUrl(input.ownerIdCardUrl)     : Promise.resolve(null),
    needsIdCards ? fetchAsDataUrl(input.customerIdCardUrl)  : Promise.resolve(null),
    needsSigs    ? fetchAsDataUrl(input.ownerSignatureUrl)    : Promise.resolve(null),
    needsSigs    ? fetchAsDataUrl(input.customerSignatureUrl) : Promise.resolve(null),
    ...(needsPhotos ? photoUrlsToFetch.map(fetchAsDataUrl) : []),
  ])

  const photoDataUrls = (photoDataUrlsMixed as Array<string | null>).filter((u): u is string => u !== null)

  const signerData: SignerData = {
    ownerSignatureDataUrl:    ownerSigDataUrl    ?? null,
    customerSignatureDataUrl: customerSigDataUrl ?? null,
    contractDate:             input.contractDate ?? '',
  }

  const parts: string[] = []
  let sectionNum = 1

  parts.push(buildCoverSection({
    contractId:       input.contractId,
    contractDate:     input.contractDate ?? '',
    stockUnitNo:      input.stockUnitNo,
    stockProjectName: input.stockProjectName,
    sections,
  }))

  for (const section of sections) {
    parts.push('<div class="page-break"></div>')

    switch (section as AttachmentSection) {
      case 'id-cards':
        parts.push(buildIdCardSection({
          sectionNum:         sectionNum++,
          ownerName:          input.ownerName,
          ownerNationalId:    input.ownerNationalId,
          ownerDataUrl:       ownerDataUrl ?? null,
          customerName:       input.customerName,
          customerNationalId: input.customerNationalId,
          customerDataUrl:    customerDataUrl ?? null,
          signerData,
        }))
        break

      case 'inventory':
        parts.push(buildInventorySection({
          sectionNum:   sectionNum++,
          stockUnitNo:  input.stockUnitNo,
          contractDate: input.contractDate ?? '',
          items:        input.furnitureItems ?? [],
          signerData,
        }))
        break

      case 'photos':
        parts.push(buildPhotosSection({
          sectionNum:       sectionNum++,
          stockUnitNo:      input.stockUnitNo,
          stockProjectName: input.stockProjectName,
          photoDataUrls,
          contractDate:     input.contractDate ?? '',
        }))
        break

      case 'facilities':
        parts.push(buildFacilitiesSection({
          sectionNum:       sectionNum++,
          stockProjectName: input.stockProjectName,
          facilities:       input.projectFacilities,
        }))
        break

      case 'keys':
        parts.push(buildKeysSection({
          sectionNum: sectionNum++,
          items:      input.keyItems,
          signerData,
        }))
        break
    }
  }

  return parts.join('\n')
}
