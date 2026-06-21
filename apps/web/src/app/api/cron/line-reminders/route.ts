import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  LEASE_REMINDER_SELECT, rentReminderMessage, expiryReminderMessage, pushAndLog,
  type LeaseForReminder,
} from '@/lib/line/send'
import { removeContractFiles, signContractFile } from '@/lib/upload/storageServer'

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
  if (tokenByAgent.size === 0) return NextResponse.json({ ok: true, sent: 0, note: 'no enabled integrations' })

  // Leases that have a bound group and at least one reminder enabled.
  const { data: leases } = await admin
    .from('contracts')
    .select(`${LEASE_REMINDER_SELECT}, agent_uid, line_group_id, line_rent_reminder_enabled, line_expiry_reminder_enabled, line_last_rent_reminded_on, line_last_expiry_reminded_on`)
    .eq('contract_category', 'lease')
    .is('deleted_at', null)
    .not('line_group_id', 'is', null)
    .in('status', ['active', 'signed', 'completed'])

  let rentSent = 0
  let expirySent = 0

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

    // ── Monthly rent reminder ──
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
          await admin.from('contracts').update({ line_last_rent_reminded_on: now.ymd }).eq('id', contractId)
        }
      }
    }

    // ── 30-day expiry reminder (once, when entering the window) ──
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

  return NextResponse.json({ ok: true, date: now.ymd, rentSent, expirySent, purged })
}
