'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Plan = 'standard' | 'ai_pro' | 'professional' | 'business'
type Billing = 'monthly' | 'yearly'

const PRICES: Record<string, Record<string, number>> = {
  professional: { monthly: 990, yearly: 8900 },
  standard: { monthly: 990, yearly: 8900 },
  ai_pro: { monthly: 1290, yearly: 11900 },
  business: { monthly: 2990, yearly: 26900 },
}

const PLAN_LABELS: Record<string, string> = {
  professional: 'Proppsy Standard',
  standard: 'Proppsy Standard',
  ai_pro: 'Proppsy AI Pro',
  business: 'Proppsy Business',
}

function authHeader(secretKey: string) {
  return `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
}

function planExpiry(billing: Billing): Date {
  const d = new Date()
  if (billing === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

// ─── Credit card charge (Omise token) ────────────────────────

export async function createOmiseCharge(params: {
  plan: 'standard' | 'ai_pro'
  billing: Billing
  token: string
}): Promise<{ error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อเรา' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

  const { plan, billing, token } = params
  const amount = PRICES[plan]?.[billing]
  if (!amount) return { error: 'แพ็กเกจไม่ถูกต้อง' }
  const description = `${PLAN_LABELS[plan]} (${billing === 'yearly' ? 'รายปี' : 'รายเดือน'})`

  const resp = await fetch('https://api.omise.co/charges', {
    method: 'POST',
    headers: {
      Authorization: authHeader(secretKey),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(amount * 100),
      currency: 'thb',
      card: token,
      description,
      'metadata[userId]': user.id,
      'metadata[plan]': plan,
      'metadata[billing]': billing,
    }).toString(),
  })

  const charge = await resp.json() as { status?: string; failure_message?: string }

  if (!resp.ok || charge.status === 'failed') {
    return { error: charge.failure_message ?? 'การชำระเงินล้มเหลว กรุณาลองใหม่หรือเปลี่ยนบัตร' }
  }

  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ plan, plan_expires_at: planExpiry(billing).toISOString() })
    .eq('id', user.id)

  if (dbErr) return { error: 'ชำระเงินสำเร็จแต่อัปเดตแพ็กเกจล้มเหลว กรุณาติดต่อเรา' }

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return {}
}

// ─── PromptPay charge ─────────────────────────────────────────

export async function createPromptPayCharge(params: {
  plan: 'standard' | 'ai_pro'
  billing: Billing
}): Promise<{ error?: string; qr_url?: string; chargeId?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อเรา' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

  const { plan, billing } = params
  const amount = PRICES[plan]?.[billing]
  if (!amount) return { error: 'แพ็กเกจไม่ถูกต้อง' }
  const auth = authHeader(secretKey)

  // 1. Create PromptPay source
  const sourceResp = await fetch('https://api.omise.co/sources', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      type: 'promptpay',
      amount: String(amount * 100),
      currency: 'thb',
    }).toString(),
  })
  const source = await sourceResp.json() as { id?: string }
  if (!sourceResp.ok || !source.id) return { error: 'ไม่สามารถสร้าง QR Code ได้ กรุณาลองใหม่' }

  // 2. Create charge
  const chargeResp = await fetch('https://api.omise.co/charges', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      amount: String(amount * 100),
      currency: 'thb',
      source: source.id,
      description: `${PLAN_LABELS[plan]} (${billing === 'yearly' ? 'รายปี' : 'รายเดือน'})`,
      'metadata[userId]': user.id,
      'metadata[plan]': plan,
      'metadata[billing]': billing,
    }).toString(),
  })

  const charge = await chargeResp.json() as {
    id?: string
    source?: { scannable_code?: { image?: { download_uri?: string } } }
    failure_message?: string
  }

  if (!chargeResp.ok || !charge.id) {
    return { error: charge.failure_message ?? 'ไม่สามารถสร้างคำสั่งชำระได้' }
  }

  const qr_url = charge.source?.scannable_code?.image?.download_uri
  if (!qr_url) return { error: 'ไม่สามารถสร้าง QR Code ได้ กรุณาติดต่อเรา' }

  return { qr_url, chargeId: charge.id }
}

// ─── Charge with saved card (Omise Customer + card_id) ───────

export async function chargeWithSavedCard(params: {
  plan: 'standard' | 'ai_pro'
  billing: Billing
  cardId: string
}): Promise<{ error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อเรา' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('omise_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.omise_customer_id) return { error: 'ไม่พบข้อมูลบัตรที่บันทึก' }

  const { plan, billing, cardId } = params
  const amount = PRICES[plan]?.[billing]
  if (!amount) return { error: 'แพ็กเกจไม่ถูกต้อง' }
  const description = `${PLAN_LABELS[plan]} (${billing === 'yearly' ? 'รายปี' : 'รายเดือน'})`

  const resp = await fetch('https://api.omise.co/charges', {
    method: 'POST',
    headers: {
      Authorization: authHeader(secretKey),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(amount * 100),
      currency: 'thb',
      customer: profile.omise_customer_id,
      card: cardId,
      description,
      'metadata[userId]': user.id,
      'metadata[plan]': plan,
      'metadata[billing]': billing,
    }).toString(),
  })

  const charge = await resp.json() as { status?: string; failure_message?: string }
  if (!resp.ok || charge.status === 'failed') {
    return { error: charge.failure_message ?? 'การชำระเงินล้มเหลว กรุณาลองใหม่หรือเปลี่ยนบัตร' }
  }

  await supabase
    .from('profiles')
    .update({ plan, plan_expires_at: planExpiry(billing).toISOString() })
    .eq('id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return {}
}

// ─── Poll charge status + activate plan on success ───────────

export async function pollAndActivate(params: {
  chargeId: string
  plan: 'standard' | 'ai_pro'
  billing: Billing
}): Promise<{ status: string; error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { status: 'error', error: 'ระบบชำระเงินยังไม่พร้อมใช้งาน' }

  const resp = await fetch(`https://api.omise.co/charges/${params.chargeId}`, {
    headers: { Authorization: authHeader(secretKey) },
  })
  const charge = await resp.json() as { status?: string }
  const status = charge.status ?? 'pending'

  if (status === 'successful') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ plan: params.plan, plan_expires_at: planExpiry(params.billing).toISOString() })
        .eq('id', user.id)
      revalidatePath('/dashboard')
      revalidatePath('/profile')
    }
  }

  return { status }
}
