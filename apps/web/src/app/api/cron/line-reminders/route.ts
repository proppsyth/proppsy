import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  LEASE_REMINDER_SELECT, rentReminderMessage, expiryReminderMessage, pushAndLog,
  type LeaseForReminder,
} from '@/lib/line/send'
import { removeContractFiles, signContractFile } from '@/lib/upload/storageServer'
import { notify } from '@/lib/notifications/notify'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifiedRecently(admin: any, userId: string, type: string, sinceIso: string, urlContains?: string) {
  let q = admin.from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('type', type).gte('created_at', sinceIso)
  if (urlContains) q = q.ilike('url', `%${urlContains}%`)
  const { count } = await q
  return (count ?? 0) > 0
}

export const runtime = 'nodejs'
export const maxDuration = 60

// Current date in Asia/Bangkok (cron runs in UTC).
function bangkokNow() {
  const d = new Date(Date.now() + 7 * 3600 * 1000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),       // 0-based
    day: d.getUTCDate(),
    ymd: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
  }
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when the env var is set.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const admin = await createAdminClient()
  const now = bangkokNow()
  const todayDate = new Date(`${now.ymd}T00:00:00Z`)

  // Agents with an enabled LINE integration → token + branding map.
  const { data: integrations } = await admin
    .from('line_integrations')
    .select('agent_uid, channel_access_token, enabled, card_brand_name, card_image_url')
    .eq('enabled', true)

  const tokenByAgent = new Map<string, string>()
  const brandingByAgent = new Map<string, { brandName: string | null; heroImageUrl: string | null }>()
  for (const i of integrations ?? []) {
    tokenByAgent.set(i.agent_uid as string, i.channel_access_token as string)
    brandingByAgent.set(i.agent_uid as string, {
      brandName: (i.card_brand_name as string | null) ?? null,
      heroImageUrl: (i.card_image_url as string | null) ?? null,
    })
  }

  const nowIso = new Date().toISOString()

  // ── A) Plan expiring within 7 days (paid plans only) ──
  let planExpiring = 0
  {
    const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString()
    const { data: rows } = await admin
      .from('profiles')
      .select('id, plan, plan_expires_at')
      .in('plan', ['professional', 'business'])
      .gte('plan_expires_at', nowIso)
      .lte('plan_expires_at', in7)
    for (const p of rows ?? []) {
      if (await notifiedRecently(admin, p.id as string, 'plan_expiring', new Date(Date.now() - 14 * 86_400_000).toISOString())) continue
      const d = new Date(p.plan_expires_at as string).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })
      await notify({ user_id: p.id as string, type: 'plan_expiring',
        title: '⏳ แพ็กเกจใกล้หมดอายุ', message: `แพ็กเกจของคุณจะหมดอายุ ${d} — ต่ออายุเพื่อใช้งานต่อเนื่อง`, url: '/billing' })
      planExpiring++
    }
  }

  // ── B) Lease ending / room freeing within 30 days (rented stock) ──
  let expiryNotified = 0
  {
    const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
    const { data: rows } = await admin
      .from('stock')
      .select('id, agent_uid, project_name, unit_no, contract_end_date')
      .eq('status', 'rented')
      .gte('contract_end_date', now.ymd)
      .lte('contract_end_date', in30)
    for (const s of rows ?? []) {
      const end = new Date(`${s.contract_end_date}T00:00:00Z`)
      const daysLeft = Math.round((end.getTime() - todayDate.getTime()) / 86_400_000)
      const type = daysLeft <= 7 ? 'lease_expiry_7' : 'lease_expiry_30'
      // Dedup per stock+type within 20 days (so each window fires once).
      if (await notifiedRecently(admin, s.agent_uid as string, type, new Date(Date.now() - 20 * 86_400_000).toISOString(), `/stock/${s.id}`)) continue
      const label = [s.project_name, s.unit_no].filter(Boolean).join(' ') || s.id
      await notify({ user_id: s.agent_uid as string, type,
        title: daysLeft <= 7 ? `⚠️ สัญญาเช่าหมดในอีก ${daysLeft} วัน` : `📅 สัญญาเช่าใกล้หมด (อีก ${daysLeft} วัน)`,
        message: `${label} — ห้องจะว่างวันที่ ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}`,
        url: `/stock/${s.id}` })
      expiryNotified++
    }
  }

  // ── C) Appointments today (Bangkok) — uses reminder_sent as the dedup flag ──
  let apptNotified = 0
  {
    const dayStart = new Date(`${now.ymd}T00:00:00+07:00`).toISOString()
    const dayEnd = new Date(new Date(`${now.ymd}T00:00:00+07:00`).getTime() + 86_400_000).toISOString()
    const { data: appts } = await admin
      .from('appointments')
      .select('id, agent_uid, title, start_time')
      .gte('start_time', dayStart)
      .lt('start_time', dayEnd)
      .eq('reminder_sent', false)
    for (const a of appts ?? []) {
      const t = new Date(a.start_time as string).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
      await notify({ user_id: a.agent_uid as string, type: 'appointment_today',
        title: '📅 นัดหมายวันนี้', message: `${t} น. — ${a.title ?? 'นัดหมาย'}`, url: '/calendar' })
      await admin.from('appointments').update({ reminder_sent: true }).eq('id', a.id)
      apptNotified++
    }
  }

  // ── LINE rent / expiry cards (only for agents with an enabled integration) ──
  let rentSent = 0
  let expirySent = 0
  const rentSentByAgent = new Map<string, number>()

  if (tokenByAgent.size > 0) {
    const { data: leases } = await admin
      .from('contracts')
      .select(`${LEASE_REMINDER_SELECT}, agent_uid, line_group_id, line_rent_reminder_enabled, line_expiry_reminder_enabled, line_last_rent_reminded_on, line_last_expiry_reminded_on`)
      .eq('contract_category', 'lease')
      .is('deleted_at', null)
      .not('line_group_id', 'is', null)
      .in('status', ['active', 'signed', 'completed'])

    for (const raw of leases ?? []) {
      const r = raw as Record<string, unknown>
      const agentUid = r.agent_uid as string
      const token = tokenByAgent.get(agentUid)
      if (!token) continue
      const groupId = r.line_group_id as string | null
      if (!groupId) continue

      const lease = raw as unknown as LeaseForReminder
      const contractId = lease.id
      const branding = brandingByAgent.get(agentUid)

      if (r.line_rent_reminder_enabled) {
        const payDay = (lease.payment_day_of_month ?? 0) || 0
        const effDay = payDay > 0 ? Math.min(payDay, lastDayOfMonth(now.year, now.month)) : 0
        const alreadyToday = (r.line_last_rent_reminded_on as string | null) === now.ymd
        if (effDay === now.day && !alreadyToday) {
          const signed = await signContractFile(lease.finalized_pdf_url || lease.pdf_url || null, 60 * 60 * 24 * 30)
          const res = await pushAndLog(admin, {
            agentUid, token, groupId, contractId,
            kind: 'rent_reminder', message: rentReminderMessage(lease, todayDate, branding, signed),
          })
          if (res.ok) {
            rentSent++
            rentSentByAgent.set(agentUid, (rentSentByAgent.get(agentUid) ?? 0) + 1)
            await admin.from('contracts').update({ line_last_rent_reminded_on: now.ymd }).eq('id', contractId)
          }
        }
      }

      if (r.line_expiry_reminder_enabled && lease.end_date) {
        const end = new Date(`${lease.end_date}T00:00:00Z`)
        const daysLeft = Math.round((end.getTime() - todayDate.getTime()) / 86_400_000)
        const alreadyReminded = !!(r.line_last_expiry_reminded_on as string | null)
        if (daysLeft <= 30 && daysLeft >= 0 && !alreadyReminded) {
          const signed = await signContractFile(lease.finalized_pdf_url || lease.pdf_url || null, 60 * 60 * 24 * 30)
          const res = await pushAndLog(admin, {
            agentUid, token, groupId, contractId,
            kind: 'expiry_reminder', message: expiryReminderMessage(lease, daysLeft, branding, signed),
          })
          if (res.ok) {
            expirySent++
            await admin.from('contracts').update({ line_last_expiry_reminded_on: now.ymd }).eq('id', contractId)
          }
        }
      }
    }

    // Tell each agent (in-app bell) that today's LINE rent reminders went out.
    for (const [agentUid, count] of rentSentByAgent) {
      await notify({ user_id: agentUid, type: 'rent_reminder_sent',
        title: '💬 ส่งแจ้งเตือนค่าเช่าทาง LINE แล้ว',
        message: `วันนี้ส่งแจ้งเตือนค่าเช่าให้ผู้เช่า ${count} ราย`, url: '/line/history' })
    }
  }

  // ── Housekeeping: permanently remove contracts cancelled (soft-deleted)
  //    more than 30 days ago, freeing their generated files too. ──
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: stale } = await admin
    .from('contracts')
    .select('id, pdf_url, docx_url, finalized_pdf_url, finalized_docx_url, attachment_pdf_url')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)

  let purged = 0
  for (const row of stale ?? []) {
    const { error } = await admin.from('contracts').delete().eq('id', row.id)
    if (error) continue
    purged++
    await removeContractFiles([
      row.pdf_url, row.docx_url, row.finalized_pdf_url, row.finalized_docx_url, row.attachment_pdf_url,
    ])
  }

  return NextResponse.json({ ok: true, date: now.ymd, rentSent, expirySent, purged, planExpiring, expiryNotified, apptNotified })
}
