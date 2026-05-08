'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const PRICES = {
  professional: { monthly: 990, yearly: 8900 },
  business: { monthly: 2990, yearly: 26900 },
} as const

const DESCRIPTIONS = {
  professional: { monthly: 'Proppsy Professional (รายเดือน)', yearly: 'Proppsy Professional (รายปี)' },
  business: { monthly: 'Proppsy Business (รายเดือน)', yearly: 'Proppsy Business (รายปี)' },
} as const

export async function createOmiseCharge(params: {
  plan: 'professional' | 'business'
  billing: 'monthly' | 'yearly'
  token: string
}): Promise<{ error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อเรา' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

  const { plan, billing, token } = params
  const amount = PRICES[plan][billing]
  const description = DESCRIPTIONS[plan][billing]

  // Create charge via Omise REST API
  const resp = await fetch('https://api.omise.co/charges', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(amount * 100), // satang
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

  // Set plan expiry
  const expires = new Date()
  if (billing === 'yearly') expires.setFullYear(expires.getFullYear() + 1)
  else expires.setMonth(expires.getMonth() + 1)

  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ plan, plan_expires_at: expires.toISOString() })
    .eq('id', user.id)

  if (dbErr) return { error: 'ชำระเงินสำเร็จแต่อัปเดตแพ็กเกจล้มเหลว กรุณาติดต่อเรา' }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return {}
}
