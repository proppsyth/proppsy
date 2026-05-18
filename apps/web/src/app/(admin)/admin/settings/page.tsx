import type { Metadata } from 'next'
import { Settings, Globe, Bell, Zap, Database } from 'lucide-react'

export const metadata: Metadata = { title: 'ตั้งค่าระบบ — Admin' }

const SETTING_GROUPS = [
  {
    label: 'Platform',
    icon: Globe,
    items: ['Site name & branding', 'Maintenance mode', 'Feature flags'],
  },
  {
    label: 'Notifications',
    icon: Bell,
    items: ['Email templates', 'LINE notify settings', 'Webhook endpoints'],
  },
  {
    label: 'AI & Integrations',
    icon: Zap,
    items: ['Claude API config', 'OCR settings', 'Omise payment config'],
  },
  {
    label: 'Database',
    icon: Database,
    items: ['Storage policies', 'RLS audit', 'Migration history'],
  },
]

export default function AdminSettingsPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">Platform configuration, integrations และ feature flags</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {SETTING_GROUPS.map((group) => {
          const Icon = group.icon
          return (
            <div key={group.label} className="bg-white rounded-xl border border-gray-100 p-5 opacity-70">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-gray-500" />
                <p className="font-semibold text-gray-700 text-sm">{group.label}</p>
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-gray-300 rounded-full flex-shrink-0" />
                    <p className="text-xs text-gray-500">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Settings className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">System Settings</p>
        <p className="text-gray-400 text-sm mt-1">
          Platform-wide configuration — ตั้งค่าก็ต่อเมื่อรู้ว่ากำลังทำอะไร
        </p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
