'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity/log'

export async function markCommissionReceived(
  recordId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('commission_records')
    .update({ status: 'received', received_at: now, updated_at: now })
    .eq('id', recordId)
    .eq('agent_uid', user.id)
    .eq('status', 'earned')

  if (error) return { error: error.message }

  await logActivity({
    userId: user.id,
    entityType: 'commission',
    entityId: recordId,
    action: 'received',
    title: 'รับค่าคอมมิชชันแล้ว',
  })

  revalidatePath('/commission')
  return {}
}

export async function unmarkCommissionReceived(
  recordId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('commission_records')
    .update({ status: 'earned', received_at: null, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('agent_uid', user.id)
    .eq('status', 'received')

  if (error) return { error: error.message }

  revalidatePath('/commission')
  return {}
}
