'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getBotInfo } from '@/lib/line/client'

export interface LineConnectionStatus {
  connected: boolean
  enabled: boolean
  botDisplayName?: string | null
  botBasicId?: string | null
  botUserId?: string | null
}

/**
 * Connect (or re-connect) the agent's own LINE OA by validating the channel
 * access token and storing the credentials. The token is validated against
 * /v2/bot/info — if it fails, nothing is saved.
 */
export async function connectLineOa(input: {
  channelAccessToken: string
  channelSecret: string
}): Promise<{ error?: string; botDisplayName?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const token = input.channelAccessToken.trim()
  const secret = input.channelSecret.trim()
  if (!token || !secret) return { error: 'กรุณากรอก Channel access token และ Channel secret' }

  // Validate the token + fetch bot identity (also gives us bot_user_id used by the webhook).
  const { info, error } = await getBotInfo(token)
  if (error || !info) return { error: error ?? 'ตรวจสอบ Token ไม่สำเร็จ' }

  const { error: upErr } = await supabase
    .from('line_integrations')
    .upsert({
      agent_uid:            user.id,
      channel_access_token: token,
      channel_secret:       secret,
      bot_user_id:          info.userId,
      bot_basic_id:         info.basicId,
      bot_display_name:     info.displayName,
      enabled:              true,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'agent_uid' })

  if (upErr) return { error: 'บันทึกไม่สำเร็จ: ' + upErr.message }

  revalidatePath('/line')
  return { botDisplayName: info.displayName }
}

/** Re-validate the stored token against LINE without changing anything. */
export async function testLineConnection(): Promise<{ error?: string; botDisplayName?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: integ } = await supabase
    .from('line_integrations')
    .select('channel_access_token')
    .eq('agent_uid', user.id)
    .maybeSingle()

  if (!integ?.channel_access_token) return { error: 'ยังไม่ได้เชื่อมต่อ LINE OA' }

  const { info, error } = await getBotInfo(integ.channel_access_token)
  if (error || !info) return { error: error ?? 'ทดสอบไม่สำเร็จ' }
  return { botDisplayName: info.displayName }
}

/** Toggle the integration on/off without deleting credentials. */
export async function setLineEnabled(enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('line_integrations')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('agent_uid', user.id)

  if (error) return { error: 'อัปเดตไม่สำเร็จ: ' + error.message }
  revalidatePath('/line')
  return {}
}

/** Remove the agent's LINE OA credentials entirely. */
export async function disconnectLineOa(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('line_integrations')
    .delete()
    .eq('agent_uid', user.id)

  if (error) return { error: 'ตัดการเชื่อมต่อไม่สำเร็จ: ' + error.message }
  revalidatePath('/line')
  return {}
}
