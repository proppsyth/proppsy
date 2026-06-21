'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notify } from '@/lib/notifications/notify'
import type { CreditTransaction } from '@/types'
import {
  CREDIT_COST,
  TOPUP_PACKAGES,
  STARTER_FREE_CREDITS,
} from './constants'
export type { PublishTier } from './constants'
import type { PublishTier } from './constants'

// ─── Read balance ─────────────────────────────────────────────

export async function getCreditBalance(): Promise<{
  balance: number
  totalEarned: number
  totalSpent: number
  lastResetDate: string | null
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { balance: 0, totalEarned: 0, totalSpent: 0, lastResetDate: null, error: 'ไม่ได้รับอนุญาต' }

  const { data, error } = await supabase
    .from('credits')
    .select('balance, total_earned, total_spent, last_reset_date')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { balance: 0, totalEarned: 0, totalSpent: 0, lastResetDate: null, error: error.message }
  return {
    balance: data?.balance ?? 0,
    totalEarned: data?.total_earned ?? 0,
    totalSpent: data?.total_spent ?? 0,
    lastResetDate: data?.last_reset_date ?? null,
  }
}

// ─── Transaction history ──────────────────────────────────────

export async function getTransactions(limit = 30, offset = 0): Promise<{
  transactions: CreditTransaction[]
  total: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { transactions: [], total: 0 }

  const [{ data }, { count }] = await Promise.all([
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('credit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  return { transactions: (data as CreditTransaction[]) ?? [], total: count ?? 0 }
}

// ─── Publish stock (server-side deduction, race-safe via RPC) ─

export async function publishStock(
  stockId: string,
  tier: PublishTier,
): Promise<{ error?: string; balance?: number; insufficientCredits?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  // Block publish for pending users — must be approved first
  const { data: agentProfile } = await supabase
    .from('profiles')
    .select('account_status')
    .eq('id', user.id)
    .single()
  if (agentProfile?.account_status === 'pending') {
    return { error: 'บัญชีของคุณยังอยู่ระหว่างรอการอนุมัติจากแอดมิน ยังไม่สามารถเผยแพร่ทรัพย์ได้' }
  }

  const { data: stock } = await supabase
    .from('stock')
    .select('id, is_published, status, contract_end_date')
    .eq('id', stockId)
    .eq('agent_uid', user.id)
    .single()

  if (!stock) return { error: 'ไม่พบทรัพย์หรือไม่มีสิทธิ์' }
  if (stock.is_published) return { error: 'ทรัพย์นี้เผยแพร่แล้ว' }
  // Available, or a rented unit within 45 days of its lease end ("ว่างเร็วๆนี้").
  const endDate = (stock as { contract_end_date?: string | null }).contract_end_date
  const soonFree = stock.status === 'rented' && !!endDate &&
    (new Date(endDate).getTime() - Date.now()) <= 45 * 86_400_000 &&
    (new Date(endDate).getTime() - Date.now()) >= -1 * 86_400_000
  if (stock.status !== 'available' && !soonFree) {
    return { error: 'เผยแพร่ได้เฉพาะทรัพย์ที่ "ว่าง" หรือทรัพย์เช่าที่ใกล้หมดสัญญา (ภายใน 45 วัน)' }
  }

  const cost = CREDIT_COST[tier]
  const desc = tier === 'premium'
    ? `เผยแพร่แบบ Premium HOT — ${stockId}`
    : `เผยแพร่แบบ Standard — ${stockId}`

  // Service role: spend_credits is SECURITY DEFINER with EXECUTE revoked from
  // anon/authenticated, so it can't be called directly from the browser.
  const admin = createServiceClient()
  const { data: result, error: rpcError } = await admin.rpc('spend_credits', {
    p_user_id:      user.id,
    p_amount:       cost,
    p_tx_type:      'spend',
    p_description:  desc,
    p_reference_id: stockId,
    p_metadata:     { tier, stock_id: stockId },
  })

  if (result?.error === 'insufficient_credits') {
    return { error: 'เครดิตไม่เพียงพอ', balance: result.balance, insufficientCredits: true }
  }
  // Fail closed: never publish unless the deduction actually succeeded.
  if (rpcError || !result?.ok) {
    return { error: 'หักเครดิตไม่สำเร็จ กรุณาลองใหม่' }
  }

  const premiumExpiry = new Date()
  premiumExpiry.setDate(premiumExpiry.getDate() + 30)

  await supabase
    .from('stock')
    .update({
      is_published:       true,
      published_at:       new Date().toISOString(),
      ...(tier === 'premium' ? {
        is_premium:         true,
        premium_expires_at: premiumExpiry.toISOString(),
      } : {}),
    })
    .eq('id', stockId)
    .eq('agent_uid', user.id)

  await notify({
    user_id: user.id,
    type:    'credit_spent',
    title:   `💳 ใช้เครดิต ${cost} เครดิต`,
    message: `${tier === 'premium' ? 'เผยแพร่ Premium HOT' : 'เผยแพร่'} ${stockId} · คงเหลือ ${result.balance} เครดิต`,
    url:     `/stock/${stockId}`,
  })

  revalidatePath('/stock')
  revalidatePath(`/stock/${stockId}`)
  revalidatePath('/listing')
  return { balance: result.balance }
}

// ─── Unpublish stock (no credit refund) ──────────────────────

export async function unpublishStock(stockId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('stock')
    .update({ is_published: false, is_premium: false, premium_expires_at: null })
    .eq('id', stockId)
    .eq('agent_uid', user.id)

  if (error) return { error: error.message }
  revalidatePath('/stock')
  revalidatePath(`/stock/${stockId}`)
  revalidatePath('/listing')
  return {}
}

// ─── Credit top-up via Omise (card) ──────────────────────────

function omiseAuth(key: string) {
  return `Basic ${Buffer.from(key + ':').toString('base64')}`
}

export async function createCreditTopup(params: {
  credits: number
  token: string
}): Promise<{ error?: string; balance?: number }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อมใช้งาน' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

  const pkg = TOPUP_PACKAGES.find(p => p.credits === params.credits)
  if (!pkg) return { error: 'แพ็กเกจเครดิตไม่ถูกต้อง' }

  const resp = await fetch('https://api.omise.co/charges', {
    method: 'POST',
    headers: {
      Authorization: omiseAuth(secretKey),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount:              String(pkg.price * 100),
      currency:            'thb',
      card:                params.token,
      description:         `เติมเครดิต ${pkg.credits} เครดิต (${pkg.price.toLocaleString()} บาท)`,
      'metadata[userId]':  user.id,
      'metadata[type]':    'credit_topup',
      'metadata[credits]': String(pkg.credits),
    }).toString(),
  })

  const charge = await resp.json() as { status?: string; failure_message?: string; id?: string }
  if (!resp.ok || charge.status === 'failed') {
    return { error: charge.failure_message ?? 'การชำระเงินล้มเหลว กรุณาลองใหม่' }
  }

  const admin = createServiceClient()
  const { data: result } = await admin.rpc('grant_credits', {
    p_user_id:      user.id,
    p_amount:       pkg.credits,
    p_tx_type:      'topup',
    p_description:  `เติมเครดิต ${pkg.credits} เครดิต (${pkg.price.toLocaleString()} บาท)`,
    p_reference_id: charge.id ?? null,
    p_is_reset:     false,
  })

  if (!result?.ok) return { error: 'ชำระเงินสำเร็จแต่เพิ่มเครดิตล้มเหลว กรุณาติดต่อเรา' }
  revalidatePath('/credits')
  return { balance: result.balance }
}

// ─── Grant starter free credits (call after account approval) ─

export async function grantStarterCredits(userId: string): Promise<void> {
  const admin = createServiceClient()
  await admin.rpc('grant_credits', {
    p_user_id:     userId,
    p_amount:      STARTER_FREE_CREDITS,
    p_tx_type:     'grant',
    p_description: `เครดิตฟรีสำหรับผู้ใช้ใหม่ (Starter)`,
    p_is_reset:    false,
  })
}

// ─── Admin: manual credit adjustment ─────────────────────────

export async function adminGrantCredits(params: {
  userId: string
  amount: number
  description: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'ไม่มีสิทธิ์' }

  const admin = createServiceClient()
  const { data } = await admin.rpc('grant_credits', {
    p_user_id:     params.userId,
    p_amount:      Math.abs(params.amount),
    p_tx_type:     'grant',
    p_description: params.description,
    p_is_reset:    false,
  })
  if (!data?.ok) return { error: data?.error ?? 'ล้มเหลว' }
  return {}
}
