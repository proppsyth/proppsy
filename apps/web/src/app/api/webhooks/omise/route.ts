import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

// Omise signs the raw body with HMAC-SHA256 and puts the hex digest in X-Omise-Webhook-Key
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.OMISE_WEBHOOK_SECRET_KEY
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}

function planExpiry(billing: string): string {
  const d = new Date()
  if (billing === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

// Map legacy plan slugs used in checkout to canonical Plan values in profiles
function canonicalPlan(plan: string): string {
  const MAP: Record<string, string> = {
    standard:     'professional',
    ai_pro:       'professional',
    professional: 'professional',
    business:     'business',
  }
  return MAP[plan] ?? 'professional'
}

type OmiseChargeData = {
  id?: string
  status?: string
  amount?: number  // satang (÷100 = THB)
  metadata?: {
    userId?: string
    type?: string
    credits?: string
    plan?: string
    billing?: string
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-omise-webhook-key')

  if (!verifySignature(rawBody, signature)) {
    console.warn('[omise-webhook] invalid signature')
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let body: { key: string; data?: OmiseChargeData }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { key, data } = body
  const admin = await createAdminClient()
  const chargeId = data?.id
  const meta = data?.metadata
  const userId = meta?.userId
  const amountThb = Math.round((data?.amount ?? 0) / 100)

  // ─── charge.create: record pending transaction for audit ────
  if (key === 'charge.create' && chargeId && userId) {
    await admin.from('payment_transactions').upsert({
      omise_charge_id: chargeId,
      user_id:         userId,
      amount_thb:      amountThb,
      type:            meta?.type === 'credit_topup' ? 'credit_topup' : 'plan_subscription',
      plan:            meta?.plan ? canonicalPlan(meta.plan) : null,
      billing_period:  meta?.billing ?? null,
      credits_granted: meta?.credits ? parseInt(meta.credits, 10) : null,
      status:          'pending',
      omise_event_key: key,
      metadata:        data,
    }, { onConflict: 'omise_charge_id', ignoreDuplicates: true })
    return NextResponse.json({ received: true })
  }

  // ─── charge.complete ────────────────────────────────────────
  if (key !== 'charge.complete') return NextResponse.json({ received: true })

  // Mark failed charges
  if (data?.status !== 'successful') {
    if (chargeId) {
      await admin.from('payment_transactions')
        .update({ status: data?.status ?? 'failed', updated_at: new Date().toISOString() })
        .eq('omise_charge_id', chargeId)
    }
    return NextResponse.json({ received: true })
  }

  if (!userId || !chargeId) {
    console.warn('[omise-webhook] charge.complete missing userId/chargeId', { chargeId, userId })
    return NextResponse.json({ received: true })
  }

  // ─── Credit top-up ─────────────────────────────────────────
  if (meta?.type === 'credit_topup') {
    const credits = parseInt(meta.credits ?? '0', 10)
    if (credits > 0) {
      await admin.rpc('grant_credits', {
        p_user_id:      userId,
        p_amount:       credits,
        p_tx_type:      'topup',
        p_description:  `เติมเครดิต ${credits} เครดิต (Omise)`,
        p_reference_id: chargeId,
        p_is_reset:     false,
      })
    }
    await admin.from('payment_transactions').upsert({
      omise_charge_id: chargeId,
      user_id:         userId,
      amount_thb:      amountThb,
      type:            'credit_topup',
      credits_granted: credits,
      status:          'successful',
      omise_event_key: key,
      metadata:        data,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'omise_charge_id' })
  }

  // ─── Plan subscription ─────────────────────────────────────
  else if (meta?.plan) {
    const plan     = canonicalPlan(meta.plan)
    const billing  = meta.billing ?? 'monthly'
    const expiresAt = planExpiry(billing)

    await admin.from('profiles')
      .update({ plan, plan_expires_at: expiresAt })
      .eq('id', userId)

    if (plan === 'professional') {
      await admin.rpc('grant_credits', {
        p_user_id:     userId,
        p_amount:      50,
        p_tx_type:     'reset',
        p_description: 'เครดิต Professional (เดือนแรก)',
        p_is_reset:    true,
      })
    }

    await admin.from('payment_transactions').upsert({
      omise_charge_id: chargeId,
      user_id:         userId,
      amount_thb:      amountThb,
      type:            'plan_subscription',
      plan,
      billing_period:  billing,
      status:          'successful',
      omise_event_key: key,
      metadata:        data,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'omise_charge_id' })
  }

  return NextResponse.json({ received: true })
}
