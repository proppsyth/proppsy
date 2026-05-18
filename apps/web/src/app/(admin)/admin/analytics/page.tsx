import type { Metadata } from 'next'
import { BarChart3 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Analytics — Admin' }

export default async function AdminAnalyticsPage() {
  const admin = await createAdminClient()

  const [
    { count: totalUsers },
    { count: approvedUsers },
    { count: proUsers },
    { count: totalStock },
    { count: publishedStock },
    { count: totalContracts },
    { count: signedContracts },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved').neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).in('plan', ['professional', 'business']),
    admin.from('stock').select('*', { count: 'exact', head: true }),
    admin.from('stock').select('*', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('contracts').select('*', { count: 'exact', head: true }),
    admin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['signed', 'completed']),
  ])

  const userActivationRate = totalUsers ? Math.round((approvedUsers ?? 0) / (totalUsers ?? 1) * 100) : 0
  const publishRate = totalStock ? Math.round((publishedStock ?? 0) / (totalStock ?? 1) * 100) : 0
  const contractSignRate = totalContracts ? Math.round((signedContracts ?? 0) / (totalContracts ?? 1) * 100) : 0
  const paidConversionRate = approvedUsers ? Math.round((proUsers ?? 0) / (approvedUsers ?? 1) * 100) : 0

  const metrics = [
    { label: 'User Activation Rate', value: `${userActivationRate}%`, sub: `${approvedUsers ?? 0} / ${totalUsers ?? 0} users`, color: 'blue' },
    { label: 'Listing Publish Rate', value: `${publishRate}%`, sub: `${publishedStock ?? 0} / ${totalStock ?? 0} listings`, color: 'green' },
    { label: 'Contract Sign Rate', value: `${contractSignRate}%`, sub: `${signedContracts ?? 0} / ${totalContracts ?? 0} contracts`, color: 'indigo' },
    { label: 'Paid Conversion Rate', value: `${paidConversionRate}%`, sub: `${proUsers ?? 0} paid users`, color: 'purple' },
  ]

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">Platform metrics, conversion rates และ usage statistics</p>
      </div>

      {/* Key metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-3xl font-bold text-gray-900">{m.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{m.label}</p>
            <p className="text-xs text-gray-400">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Advanced Analytics</p>
        <p className="text-gray-400 text-sm mt-1">
          Charts, trends, retention, revenue graphs และ AI/OCR usage analytics
        </p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-violet-50 text-violet-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
