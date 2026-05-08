'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const str = (key: string) => (formData.get(key) as string)?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({
      name: str('name'),
      nickname: str('nickname'),
      phone: str('phone'),
      line_id: str('line_id'),
      position: str('position'),
      company_name: str('company_name'),
      tax_id: str('tax_id'),
      national_id: str('national_id'),
      address_no: str('address_no'),
      address_road: str('address_road'),
      subdistrict: str('subdistrict'),
      district: str('district'),
      province: str('province'),
      zip: str('zip'),
      bank_name: str('bank_name'),
      bank_account_no: str('bank_account_no'),
      bank_account_name: str('bank_account_name'),
      signature_url: str('signature_url'),
    })
    .eq('id', user.id)

  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateSignatureUrl(
  url: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('profiles')
    .update({ signature_url: url || null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  return {}
}
