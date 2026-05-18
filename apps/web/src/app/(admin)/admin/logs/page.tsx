import type { Metadata } from 'next'
import { ScrollText, Shield, Activity } from 'lucide-react'

export const metadata: Metadata = { title: 'System Logs — Admin' }

const LOG_CATEGORIES = [
  { label: 'Auth Events', icon: Shield, desc: 'Login, logout, failed attempts', color: 'blue' },
  { label: 'Admin Actions', icon: Activity, desc: 'User approvals, credit adjustments, role changes', color: 'yellow' },
  { label: 'Edge Function Logs', icon: ScrollText, desc: 'Supabase Edge Function executions', color: 'purple' },
]

export default function AdminLogsPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ScrollText className="w-5 h-5 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">System Logs</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">Audit logs, admin actions และ system events</p>
      </div>

      {/* Log category cards */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {LOG_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <div key={cat.label} className="bg-white rounded-xl border border-gray-100 p-5 opacity-60">
              <Icon className="w-6 h-6 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700 text-sm">{cat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <ScrollText className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Audit Log System</p>
        <p className="text-gray-400 text-sm mt-1">
          บันทึกทุก action ของแอดมิน — การอนุมัติ การปรับเครดิต การเปลี่ยนสิทธิ์
        </p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
