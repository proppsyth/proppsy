import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import CommissionList from './CommissionList'
import type { CommissionRow } from './CommissionList'

export const metadata: Metadata = { title: 'คอมมิชชัน' }

// ─── Helpers ─────────────────────────────────────────────────

function displayName(row: {
  nickname?: string | null
  first_name_th?: string | null
  last_name_th?: string | null
} | null | undefined): string | null {
  if (!row) return null
  return row.nickname || [row.first_name_th, row.last_name_th].filter(Boolean).join(' ') || null
}

// ─── Page ─────────────────────────────────────────────────────

export default async function CommissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Step 1: commission records
  const { data: rawRecords } = await supabase
    .from('commission_records')
    .select('*')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })

  const records = (rawRecords ?? []) as {
    id: string
    reservation_id: string | null
    lease_id: string | null
    amount: number
    commission_type: 'new_lease' | 'renewal'
    status: 'pipeline' | 'earned' | 'received'
    earned_at: string | null
    received_at: string | null
    created_at: string
  }[]

  // Step 2: collect all contract IDs we need to resolve
  const contractIds = [...new Set([
    ...records.map(r => r.reservation_id).filter((x): x is string => !!x),
    ...records.map(r => r.lease_id).filter((x): x is string => !!x),
  ])]

  const { data: contractRows } = contractIds.length > 0
    ? await supabase
        .from('contracts')
        .select('id, status, stock_id, customer_id')
        .in('id', contractIds)
    : { data: [] }

  // Step 3: collect stock + customer IDs
  const stockIds = [...new Set(
    (contractRows ?? []).map(c => c.stock_id).filter((x): x is string => !!x)
  )]
  const customerIds = [...new Set(
    (contractRows ?? []).map(c => c.customer_id).filter((x): x is string => !!x)
  )]

  const [{ data: stockRows }, { data: customerRows }] = await Promise.all([
    stockIds.length > 0
      ? supabase.from('stock').select('id, unit_no, project_name').in('id', stockIds)
      : { data: [] },
    customerIds.length > 0
      ? supabase.from('customers').select('id, nickname, first_name_th, last_name_th').in('id', customerIds)
      : { data: [] },
  ])

  // Build lookup maps
  const contractMap = new Map((contractRows ?? []).map(c => [c.id, c]))
  const stockMap    = new Map((stockRows ?? []).map(s => [s.id, s]))
  const customerMap = new Map((customerRows ?? []).map(c => [c.id, c]))

  // Enrich commission records
  const enriched: CommissionRow[] = records.map(r => {
    const reservationContract = r.reservation_id ? contractMap.get(r.reservation_id) : null
    const leaseContract       = r.lease_id       ? contractMap.get(r.lease_id)       : null

    // Stock comes from the reservation contract first, then lease
    const sourceContract = reservationContract ?? leaseContract
    const stock    = sourceContract?.stock_id    ? stockMap.get(sourceContract.stock_id)    : null
    const customer = sourceContract?.customer_id ? customerMap.get(sourceContract.customer_id) : null

    return {
      id:                 r.id,
      reservation_id:     r.reservation_id,
      lease_id:           r.lease_id,
      amount:             r.amount,
      commission_type:    r.commission_type,
      status:             r.status,
      earned_at:          r.earned_at,
      received_at:        r.received_at,
      created_at:         r.created_at,
      stock_unit:         stock?.unit_no ?? null,
      project_name:       stock?.project_name ?? null,
      tenant_name:        displayName(customer),
      lease_status:       leaseContract?.status ?? null,
      reservation_status: reservationContract?.status ?? null,
    }
  })

  // Summary stats
  const pipeline    = enriched.filter(r => r.status === 'pipeline').reduce((s, r) => s + r.amount, 0)
  const earned      = enriched.filter(r => r.status !== 'pipeline').reduce((s, r) => s + r.amount, 0)
  const received    = enriched.filter(r => r.status === 'received').reduce((s, r) => s + r.amount, 0)
  const outstanding = earned - received

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">คอมมิชชัน</h1>
          <p className="text-xs text-gray-400">
            Pipeline → Earned (เมื่อสร้างสัญญาเช่า) → Received (เมื่อรับเงินแล้ว)
          </p>
        </div>
      </div>

      <CommissionList
        records={enriched}
        pipeline={pipeline}
        earned={earned}
        received={received}
        outstanding={outstanding}
      />
    </div>
  )
}
