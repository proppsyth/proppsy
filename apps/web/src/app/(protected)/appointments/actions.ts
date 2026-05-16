'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AppointmentInput = {
  title: string
  description?: string | null
  stock_id?: string | null
  customer_id?: string | null
  meeting_datetime: string
}

export async function createAppointment(
  input: AppointmentInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase.from('appointments').insert({
    agent_uid: user.id,
    title: input.title,
    description: input.description || null,
    stock_id: input.stock_id || null,
    customer_id: input.customer_id || null,
    start_time: input.meeting_datetime,
    reminder_sent: false,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }
  revalidatePath('/appointments')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteAppointment(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('agent_uid', user.id)

  if (error) return { error: error.message }
  revalidatePath('/appointments')
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  return {}
}
