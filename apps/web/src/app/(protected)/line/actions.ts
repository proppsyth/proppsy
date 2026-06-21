'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getBotInfo, getGroupSummary } from '@/lib/line/client'
import { signContractFile } from '@/lib/upload/storageServer'
import { LEASE_REMINDER_SELECT, rentReminderMessage, pushAndLog, type LeaseForReminder } from '@/lib/line/send'

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

// ─── Per-lease group binding + reminder toggles ──────────────

export interface LineGroupOption { groupId: string; groupName: string | null }

export interface LeaseLineRow {
  id: string
  projectUnit: string
  tenantName: string
  rentPrice: number | null
  endDate: string | null
  groupId: string | null
  rentEnabled: boolean
  expiryEnabled: boolean
}

export async function listLineGroups(): Promise<LineGroupOption[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('line_groups')
    .select('group_id, group_name')
    .eq('agent_uid', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })

  const groups = (data ?? []).map(g => ({ groupId: g.group_id as string, groupName: (g.group_name as string | null) ?? null }))

  // Lazily fill in display names for groups the webhook captured without one
  // (the webhook skips the LINE summary API to stay fast). Best-effort.
  const missing = groups.filter(g => !g.groupName)
  if (missing.length > 0) {
    const { data: integ } = await supabase
      .from('line_integrations')
      .select('channel_access_token')
      .eq('agent_uid', user.id)
      .maybeSingle()
    const token = integ?.channel_access_token as string | undefined
    if (token) {
      const admin = await createAdminClient()
      await Promise.all(missing.map(async g => {
        const name = await getGroupSummary(token, g.groupId)
        if (name) {
          g.groupName = name
          await admin.from('line_groups').update({ group_name: name })
            .eq('agent_uid', user.id).eq('group_id', g.groupId)
        }
      }))
    }
  }

  return groups
}

export async function listLeasesForLine(): Promise<LeaseLineRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('contracts')
    .select(LEASE_REMINDER_SELECT)
    .eq('agent_uid', user.id)
    .eq('contract_category', 'lease')
    .is('deleted_at', null)
    .in('status', ['active', 'signed', 'completed'])
    .order('created_at', { ascending: false })

  return (data ?? []).map(raw => {
    const l = raw as unknown as LeaseForReminder
    const proj = l.stock?.project?.name_en || l.stock?.project?.name_th || l.stock?.project_name || '-'
    const projectUnit = l.stock?.unit_no ? `${proj} · ห้อง ${l.stock.unit_no}` : proj
    const c = l.customer
    const tenantName = c ? (c.nickname || [c.first_name_th, c.last_name_th].filter(Boolean).join(' ') || '-') : '-'
    return {
      id: l.id,
      projectUnit,
      tenantName,
      rentPrice: l.rent_price ?? null,
      endDate: l.end_date ?? null,
      groupId: (raw as { line_group_id?: string | null }).line_group_id ?? null,
      rentEnabled: !!(raw as { line_rent_reminder_enabled?: boolean }).line_rent_reminder_enabled,
      expiryEnabled: !!(raw as { line_expiry_reminder_enabled?: boolean }).line_expiry_reminder_enabled,
    }
  })
}

export async function bindLeaseGroup(contractId: string, groupId: string | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const patch: Record<string, unknown> = { line_group_id: groupId }
  // Unbinding a group also turns reminders off to avoid sending to nowhere.
  if (!groupId) { patch.line_rent_reminder_enabled = false; patch.line_expiry_reminder_enabled = false }

  const { error } = await supabase
    .from('contracts')
    .update(patch)
    .eq('id', contractId)
    .eq('agent_uid', user.id)
  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }
  revalidatePath('/line')
  return {}
}

export async function setLeaseReminder(
  contractId: string,
  field: 'rent' | 'expiry',
  value: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const col = field === 'rent' ? 'line_rent_reminder_enabled' : 'line_expiry_reminder_enabled'
  const { error } = await supabase
    .from('contracts')
    .update({ [col]: value })
    .eq('id', contractId)
    .eq('agent_uid', user.id)
  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }
  revalidatePath('/line')
  return {}
}

/** Send a sample rent-reminder card into the lease's bound group right now. */
export async function sendTestReminder(contractId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const [{ data: integ }, { data: leaseRaw }] = await Promise.all([
    supabase.from('line_integrations').select('channel_access_token, enabled, card_brand_name, card_image_url').eq('agent_uid', user.id).maybeSingle(),
    supabase.from('contracts').select(LEASE_REMINDER_SELECT).eq('id', contractId).eq('agent_uid', user.id).maybeSingle(),
  ])

  if (!integ?.channel_access_token) return { error: 'ยังไม่ได้เชื่อมต่อ LINE OA' }
  if (!integ.enabled) return { error: 'การเชื่อมต่อ LINE ถูกปิดอยู่' }
  if (!leaseRaw) return { error: 'ไม่พบสัญญาเช่า' }
  const groupId = (leaseRaw as { line_group_id?: string | null }).line_group_id ?? null
  if (!groupId) return { error: 'ยังไม่ได้ผูกกลุ่ม LINE กับสัญญานี้' }

  const branding = { brandName: integ.card_brand_name as string | null, heroImageUrl: integ.card_image_url as string | null }
  const lease = leaseRaw as unknown as LeaseForReminder
  const signedContract = await signContractFile(lease.finalized_pdf_url || lease.pdf_url || null, 60 * 60 * 24 * 30)
  const admin = await createAdminClient()
  const res = await pushAndLog(admin, {
    agentUid: user.id,
    token: integ.channel_access_token,
    groupId,
    contractId,
    kind: 'test',
    message: rentReminderMessage(lease, new Date(), branding, signedContract),
  })
  if (!res.ok) return { error: 'ส่งไม่สำเร็จ: ' + (res.error ?? '') }
  return {}
}

// ─── Card branding (editable card) ───────────────────────────

export interface CardSettings {
  brandName: string | null
  imageUrl: string | null
  defaultBrandName: string  // suggested value from the agent's profile
}

export async function getCardSettings(): Promise<CardSettings | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: integ }, { data: profile }] = await Promise.all([
    supabase.from('line_integrations').select('card_brand_name, card_image_url').eq('agent_uid', user.id).maybeSingle(),
    supabase.from('profiles').select('company_name, name').eq('id', user.id).maybeSingle(),
  ])
  if (!integ) return null
  const defaultBrandName = (profile?.company_name as string | null) || (profile?.name as string | null) || ''
  return {
    brandName: (integ.card_brand_name as string | null) ?? null,
    imageUrl: (integ.card_image_url as string | null) ?? null,
    defaultBrandName,
  }
}

export async function saveCardSettings(input: { brandName: string | null; imageUrl: string | null }): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const brand = input.brandName?.trim() || null
  const { error } = await supabase
    .from('line_integrations')
    .update({ card_brand_name: brand, card_image_url: input.imageUrl || null, updated_at: new Date().toISOString() })
    .eq('agent_uid', user.id)
  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }
  revalidatePath('/line')
  return {}
}

// ─── Send history ────────────────────────────────────────────

export interface LineHistoryRow {
  id: string
  kind: string
  status: string
  error: string | null
  createdAt: string
  contractId: string | null
  projectUnit: string | null
}

export async function listLineHistory(limit = 100): Promise<LineHistoryRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('line_message_log')
    .select('id, kind, status, error, created_at, contract_id, contract:contracts(stock:stock(unit_no, project_name, project:projects(name_en, name_th)))')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(r => {
    const stock = (r as { contract?: { stock?: { unit_no?: string | null; project_name?: string | null; project?: { name_en?: string | null; name_th?: string | null } | null } | null } | null }).contract?.stock
    const proj = stock?.project?.name_en || stock?.project?.name_th || stock?.project_name || null
    const projectUnit = proj ? (stock?.unit_no ? `${proj} · ห้อง ${stock.unit_no}` : proj) : null
    return {
      id: r.id as string,
      kind: r.kind as string,
      status: r.status as string,
      error: (r.error as string | null) ?? null,
      createdAt: r.created_at as string,
      contractId: (r.contract_id as string | null) ?? null,
      projectUnit,
    }
  })
}
