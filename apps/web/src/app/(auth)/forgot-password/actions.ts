'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function checkEmailExists(email: string): Promise<{ exists: boolean }> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  return { exists: !!data }
}
