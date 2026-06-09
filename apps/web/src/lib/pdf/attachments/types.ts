export type AttachmentSection = 'id-cards' | 'inventory' | 'photos' | 'keys'

/** Matches contract_furniture_items table. */
export interface FurnitureItem {
  id: string
  item_name: string
  item_name_en?: string | null
  quantity: number
  condition: 'good' | 'fair' | 'damaged' | 'missing'
  notes?: string | null
  serial_no?: string | null
  sort_order: number
}

/** Matches contract_key_items table (migration 036). */
export interface KeyItem {
  id: string
  name: string         // item_name_th, e.g. "กุญแจห้อง"
  nameEn: string       // item_name_en, e.g. "Room Key"
  quantity: number
  penalty_amount: number
}

/** Phase 3: project-level facility records (table TBD). */
export interface ProjectFacility {
  name: string
  detail?: string
  hours?: string
}

/** Input passed to buildAttachmentHtml. Image URLs are fetched and embedded internally. */
export interface AttachmentInput {
  contractId: string
  contractDate: string

  ownerName: string
  ownerNationalId: string
  ownerIdCardUrl: string | null

  customerName: string
  customerNationalId: string
  customerIdCardUrl: string | null

  stockUnitNo: string
  stockProjectName: string
  /** Prefer photo_thumb_urls (400px). Max 16 photos are used. */
  stockPhotoUrls: string[]

  agentName: string
  sections: AttachmentSection[]

  /** Owner e-signature URL (public documents bucket, full URL). */
  ownerSignatureUrl?: string | null
  /** Customer e-signature URL (public documents bucket, full URL). */
  customerSignatureUrl?: string | null

  /** Inventory items from contract_furniture_items table. */
  furnitureItems?: FurnitureItem[]

  /** Key/device handover records from contract_key_items table. */
  keyItems?: KeyItem[]

  /** Phase 3 — project facility records (no table yet). */
  projectFacilities?: ProjectFacility[]
}
