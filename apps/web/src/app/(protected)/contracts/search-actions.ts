'use server'

import { createClient } from '@/lib/supabase/server'

export interface StockSearchResult {
  kind: 'stock'
  id: string
  project_name?: string | null
  unit_no?: string | null
  room_type?: string | null
  building?: string | null
  floor?: number | null
  status: string
  rent_price?: number | null
  owner_id?: string | null
}

export interface OwnerSearchResult {
  kind: 'owner'
  id: string
  first_name_th?: string | null
  last_name_th?: string | null
  nickname?: string | null
  phone?: string | null
}

export interface CustomerSearchResult {
  kind: 'customer'
  id: string
  first_name_th?: string | null
  last_name_th?: string | null
  nickname?: string | null
  phone?: string | null
}

export interface ContractSearchResult {
  kind: 'contract'
  id: string
  doc_type: string
  stock_id?: string | null
  owner_id?: string | null
  customer_id?: string | null
  move_in_date?: string | null
  end_date?: string | null
}

export type EntitySearchResult = StockSearchResult | OwnerSearchResult | CustomerSearchResult | ContractSearchResult

export async function searchContracts(query: string): Promise<ContractSearchResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()
  let req = supabase
    .from('contracts')
    .select('id, doc_type, stock_id, owner_id, customer_id, move_in_date, end_date')
    .eq('agent_uid', user.id)
    .in('doc_type', ['rental', 'renewal', 'reservation'])
    .not('status', 'in', '("cancelled","completed")')
    .order('created_at', { ascending: false })
    .limit(20)

  if (q) {
    req = req.or(`id.ilike.%${q}%,stock_id.ilike.%${q}%`)
  }

  const { data } = await req
  return (data ?? []).map(r => ({ kind: 'contract' as const, ...r }))
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()
  let req = supabase
    .from('stock')
    .select('id, project_name, unit_no, room_type, building, floor, status, rent_price, owner_id')
    .eq('agent_uid', user.id)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(20)

  if (q) {
    req = req.or(
      `project_name.ilike.%${q}%,unit_no.ilike.%${q}%,building.ilike.%${q}%,id.ilike.%${q}%`
    )
  }

  const { data } = await req
  return (data ?? []).map(r => ({ kind: 'stock' as const, ...r }))
}

export async function searchOwners(query: string): Promise<OwnerSearchResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()
  let req = supabase
    .from('owners')
    .select('id, first_name_th, last_name_th, nickname, phone')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (q) {
    req = req.or(
      `first_name_th.ilike.%${q}%,last_name_th.ilike.%${q}%,nickname.ilike.%${q}%,phone.ilike.%${q}%,id.ilike.%${q}%`
    )
  }

  const { data } = await req
  return (data ?? []).map(r => ({ kind: 'owner' as const, ...r }))
}

export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()
  let req = supabase
    .from('customers')
    .select('id, first_name_th, last_name_th, nickname, phone')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (q) {
    req = req.or(
      `first_name_th.ilike.%${q}%,last_name_th.ilike.%${q}%,nickname.ilike.%${q}%,phone.ilike.%${q}%,national_id.ilike.%${q}%,id.ilike.%${q}%`
    )
  }

  const { data } = await req
  return (data ?? []).map(r => ({ kind: 'customer' as const, ...r }))
}
