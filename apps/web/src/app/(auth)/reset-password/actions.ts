'use server'

import { createClient } from '@/lib/supabase/server'

export async function updatePasswordAction(password: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'no_session' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return {}
}
