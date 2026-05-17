export interface PlaceRecord { th: string; en: string }
export interface SubdistrictRecord extends PlaceRecord { zip: string }

export interface PlacesData {
  provinces: PlaceRecord[]
  districts: Record<string, PlaceRecord[]>
  subdistricts: Record<string, SubdistrictRecord[]>
}

export interface NormalizedAddress {
  province_th: string
  province_en: string
  district_th: string
  district_en: string
  subdistrict_th: string
  subdistrict_en: string
  zip: string
}

export interface AddressFields {
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
}
