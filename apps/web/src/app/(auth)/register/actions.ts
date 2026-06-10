'use server'

import { createClient } from '@/lib/supabase/server'

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
}

export async function updateRegisterProfile(data: RegisterProfileData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่พบผู้ใช้' }

  const now = new Date().toISOString()
  const { error } = await supabase
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
      account_status: 'approved',
      accepted_terms_at: now,
      accepted_privacy_at: now,
      accepted_data_controller_confirmation_at: now,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}
