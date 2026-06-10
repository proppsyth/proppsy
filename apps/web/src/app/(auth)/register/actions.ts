'use server'

import { createAdminClient } from '@/lib/supabase/server'

type RegisterProfileData = {
  name: string
  nickname?: string | null
  phone: string
  line_id?: string | null
  position?: string | null
  company_name?: string | null
  address_no?: string | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
  id_card_url?: string | null
  national_id?: string | null
}

/** Pre-check called before signUp to prevent orphan auth accounts. */
export async function checkNationalIdExists(nationalId: string): Promise<boolean> {
  if (!nationalId.trim()) return false
  const admin = await createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('national_id', nationalId.trim())
    .limit(1)
    .maybeSingle()
  return !!data
}

export async function updateRegisterProfile(data: RegisterProfileData): Promise<{ error?: string }> {
  const admin = await createAdminClient()
  const { data: { user } } = await admin.auth.getUser()
  if (!user) return { error: 'ไม่พบผู้ใช้' }

  // Definitive uniqueness check (guards against race conditions)
  if (data.national_id?.trim()) {
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('national_id', data.national_id.trim())
      .neq('id', user.id)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return { error: 'บัญชีนี้เคยลงทะเบียนแล้ว กรุณาติดต่อผู้ดูแลระบบ' }
    }
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('profiles')
    .update({
      name: data.name,
      nickname: data.nickname || null,
      phone: data.phone,
      line_id: data.line_id || null,
      position: data.position || null,
      company_name: data.company_name || null,
      address_no: data.address_no || null,
      address_road: data.address_road || null,
      province: data.province || null,
      district: data.district || null,
      subdistrict: data.subdistrict || null,
      zip: data.zip || null,
      id_card_url: data.id_card_url || null,
      national_id: data.national_id?.trim() || null,
      account_status: 'approved',
      accepted_terms_at: now,
      accepted_privacy_at: now,
      accepted_data_controller_confirmation_at: now,
    })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'บัญชีนี้เคยลงทะเบียนแล้ว กรุณาติดต่อผู้ดูแลระบบ' }
    }
    return { error: error.message }
  }
  return {}
}
