import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Omise sends POST events to this endpoint.
// Register the URL in your Omise dashboard under Webhooks.
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    key: string
    data?: {
      id?: string
      status?: string
      metadata?: {
        userId?: string
        type?: string
        credits?: string
        plan?: string
        billing?: string
      }
    }
  }

  // Only handle successful charges
  if (body.key !== 'charge.complete' || body.data?.status !== 'successful') {
    return NextResponse.json({ received: true })
  }

  const meta = body.data.metadata
  if (!meta?.userId) return NextResponse.json({ received: true })

  const supabase = await createAdminClient()

  if (meta.type === 'credit_topup') {
    const credits = parseInt(meta.credits ?? '0', 10)
    if (credits > 0) {
      await supabase.rpc('grant_credits', {
        p_user_id:      meta.userId,
        p_amount:       credits,
        p_tx_type:      'topup',
        p_description:  `เติมเครดิต ${credits} เครดิต (PromptPay)`,
        p_reference_id: body.data.id ?? null,
        p_is_reset:     false,
      })
    }
  } else if (meta.plan && meta.billing) {
    // Plan subscription paid via PromptPay (async path)
    const expiry = new Date()
    if (meta.billing === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1)
    else expiry.setMonth(expiry.getMonth() + 1)

    await supabase
      .from('profiles')
      .update({ plan: meta.plan, plan_expires_at: expiry.toISOString() })
      .eq('id', meta.userId)

    // Seed Professional credits on first payment
    if (meta.plan === 'professional') {
      await supabase.rpc('grant_credits', {
        p_user_id:     meta.userId,
        p_amount:      100,
        p_tx_type:     'reset',
        p_description: 'เครดิต Professional เดือนแรก (100 เครดิต)',
        p_is_reset:    true,
      })
    }
  }

  return NextResponse.json({ received: true })
}
