'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function authHeader(secretKey: string) {
  return `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
}

export interface SavedCard {
  id: string
  brand: string
  last_digits: string
  expiration_month: number
  expiration_year: number
  name: string
  is_default: boolean
}

// ─── List saved cards ─────────────────────────────────────────

export async function getSavedCards(): Promise<{ cards?: SavedCard[]; error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { cards: [] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('omise_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.omise_customer_id) return { cards: [] }

  const resp = await fetch(`https://api.omise.co/customers/${profile.omise_customer_id}/cards`, {
    headers: { Authorization: authHeader(secretKey) },
  })

  if (!resp.ok) return { cards: [] }

  const data = await resp.json() as {
    data?: Array<{
      id: string
      brand: string
      last_digits: string
      expiration_month: number
      expiration_year: number
      name: string
    }>
  }

  const { data: customerResp } = await supabase
    .from('profiles')
    .select('omise_customer_id')
    .eq('id', user.id)
    .single()

  // Fetch customer to get default card
  let defaultCardId: string | null = null
  if (customerResp?.omise_customer_id) {
    const custResp = await fetch(`https://api.omise.co/customers/${customerResp.omise_customer_id}`, {
      headers: { Authorization: authHeader(secretKey) },
    })
    if (custResp.ok) {
      const cust = await custResp.json() as { default_card?: string }
      defaultCardId = cust.default_card ?? null
    }
  }

  const cards: SavedCard[] = (data.data ?? []).map(c => ({
    id: c.id,
    brand: c.brand,
    last_digits: c.last_digits,
    expiration_month: c.expiration_month,
    expiration_year: c.expiration_year,
    name: c.name,
    is_default: c.id === defaultCardId,
  }))

  return { cards }
}

// ─── Add card (save Omise token as customer card) ─────────────

export async function addCard(token: string): Promise<{ error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อม' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('omise_customer_id, email, name')
    .eq('id', user.id)
    .single()

  let customerId = profile?.omise_customer_id

  if (!customerId) {
    // Create new Omise customer
    const resp = await fetch('https://api.omise.co/customers', {
      method: 'POST',
      headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: profile?.email ?? user.email ?? '',
        description: profile?.name ?? user.id,
        card: token,
      }).toString(),
    })

    const customer = await resp.json() as { id?: string; message?: string }
    if (!resp.ok || !customer.id) {
      return { error: customer.message ?? 'เพิ่มบัตรไม่สำเร็จ' }
    }

    customerId = customer.id
    await supabase.from('profiles').update({ omise_customer_id: customerId }).eq('id', user.id)
  } else {
    // Add card to existing customer
    const resp = await fetch(`https://api.omise.co/customers/${customerId}/cards`, {
      method: 'POST',
      headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ card: token }).toString(),
    })

    if (!resp.ok) {
      const err = await resp.json() as { message?: string }
      return { error: err.message ?? 'เพิ่มบัตรไม่สำเร็จ' }
    }
  }

  revalidatePath('/billing')
  return {}
}

// ─── Remove card ──────────────────────────────────────────────

export async function removeCard(cardId: string): Promise<{ error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อม' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('omise_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.omise_customer_id) return { error: 'ไม่พบข้อมูลบัตร' }

  const resp = await fetch(
    `https://api.omise.co/customers/${profile.omise_customer_id}/cards/${cardId}`,
    { method: 'DELETE', headers: { Authorization: authHeader(secretKey) } }
  )

  if (!resp.ok) return { error: 'ลบบัตรไม่สำเร็จ กรุณาลองใหม่' }

  revalidatePath('/billing')
  return {}
}

// ─── Set default card ─────────────────────────────────────────

export async function setDefaultCard(cardId: string): Promise<{ error?: string }> {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) return { error: 'ระบบชำระเงินยังไม่พร้อม' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('omise_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.omise_customer_id) return { error: 'ไม่พบข้อมูลบัตร' }

  const resp = await fetch(`https://api.omise.co/customers/${profile.omise_customer_id}`, {
    method: 'PATCH',
    headers: { Authorization: authHeader(secretKey), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ default_card: cardId }).toString(),
  })

  if (!resp.ok) return { error: 'ตั้งค่าบัตรหลักไม่สำเร็จ' }

  revalidatePath('/billing')
  return {}
}
