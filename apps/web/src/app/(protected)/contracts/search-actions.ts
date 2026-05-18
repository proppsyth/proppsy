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

export interface ParentContractData {
  id: string
  doc_type: string
  stock_id?: string | null
  owner_id?: string | null
  customer_id?: string | null
  rent_price?: number | null
  deposit_months?: number | null
  deposit_amount?: number | null
  contract_months?: number | null
  move_in_date?: string | null
  end_date?: string | null
  water_unit_price?: number | null
  electric_unit_price?: number | null
  internet_fee?: number | null
  common_fee?: number | null
  parking_fee?: number | null
  payment_grace_days?: number | null
  payment_day_of_month?: number | null
  cleaning_fee?: number | null
  ac_count?: number | null
  ac_wash_per_unit?: number | null
  penalty_amount?: number | null
  commission_rate_pct?: number | null
  commission_from_owner?: number | null
  commission_from_customer?: number | null
  vat_7: boolean
  wht_3: boolean
  stock_label: string
  owner_label: string
  customer_label: string
  summary_label: string
}

export async function fetchContractById(id: string): Promise<ParentContractData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('contracts')
    .select(`
      id, doc_type, stock_id, owner_id, customer_id,
      rent_price, deposit_months, deposit_amount, contract_months,
      move_in_date, end_date,
      water_unit_price, electric_unit_price, internet_fee, common_fee, parking_fee,
      payment_grace_days, payment_day_of_month,
      cleaning_fee, ac_count, ac_wash_per_unit, penalty_amount,
      commission_rate_pct, commission_from_owner, commission_from_customer,
      vat_7, wht_3,
      stock:stock(project_name, unit_no, room_type),
      owner:owners(first_name_th, last_name_th, nickname),
      customer:customers(first_name_th, last_name_th, nickname)
    `)
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!data) return null

  const s = data.stock as { project_name?: string; unit_no?: string; room_type?: string } | null
  const o = data.owner as { first_name_th?: string; last_name_th?: string; nickname?: string } | null
  const c = data.customer as { first_name_th?: string; last_name_th?: string; nickname?: string } | null

  const stockLabel = s ? [s.project_name, s.unit_no, s.room_type].filter(Boolean).join(' · ') || data.stock_id || '' : ''
  const ownerLabel = o ? (o.nickname || [o.first_name_th, o.last_name_th].filter(Boolean).join(' ') || data.owner_id || '') : ''
  const customerLabel = c ? (c.nickname || [c.first_name_th, c.last_name_th].filter(Boolean).join(' ') || data.customer_id || '') : ''

  return {
    id: data.id,
    doc_type: data.doc_type,
    stock_id: data.stock_id,
    owner_id: data.owner_id,
    customer_id: data.customer_id,
    rent_price: data.rent_price,
    deposit_months: data.deposit_months,
    deposit_amount: data.deposit_amount,
    contract_months: data.contract_months,
    move_in_date: data.move_in_date,
    end_date: data.end_date,
    water_unit_price: data.water_unit_price,
    electric_unit_price: data.electric_unit_price,
    internet_fee: data.internet_fee,
    common_fee: data.common_fee,
    parking_fee: data.parking_fee,
    payment_grace_days: data.payment_grace_days,
    payment_day_of_month: data.payment_day_of_month,
    cleaning_fee: data.cleaning_fee,
    ac_count: data.ac_count,
    ac_wash_per_unit: data.ac_wash_per_unit,
    penalty_amount: data.penalty_amount,
    commission_rate_pct: data.commission_rate_pct,
    commission_from_owner: data.commission_from_owner,
    commission_from_customer: data.commission_from_customer,
    vat_7: data.vat_7 ?? false,
    wht_3: data.wht_3 ?? false,
    stock_label: stockLabel,
    owner_label: ownerLabel,
    customer_label: customerLabel,
    summary_label: [data.id, stockLabel, data.move_in_date].filter(Boolean).join(' · '),
  }
}

export async function searchContracts(query: string): Promise<ContractSearchResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()
  let req = supabase
    .from('contracts')
    .select('id, doc_type, stock_id, owner_id, customer_id, move_in_date, end_date')
    .eq('agent_uid', user.id)
    .eq('contract_category', 'lease')
    .not('status', 'in', '("cancelled","completed","terminated")')
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
