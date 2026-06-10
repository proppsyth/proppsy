import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserActivity } from '@/lib/activity/log'
import type { EntityType, ActivityLogEntry } from '@/lib/activity/log'

export const metadata: Metadata = { title: 'กิจกรรม — Proppsy' }

const ENTITY_ICON: Record<EntityType, string> = {
  stock:       '🏠',
  project:     '🏗️',
  owner:       '👤',
  tenant:      '👤',
  booking:     '📋',
  lease:       '📄',
  renewal:     '🔄',
  termination: '📝',
  esign:       '✍️',
  invoice:     '🧾',
  receipt:     '🧾',
  commission:  '💰',
  coagent:     '🤝',
}

const ACTION_ICON: Record<string, string> = {
  created:     '✨',
  updated:     '✏️',
  published:   '🌐',
  unpublished: '🔒',
  signed:      '✍️',
  opened:      '👁️',
  sent:        '📤',
  cancelled:   '❌',
  alias_added: '🏷️',
}

const ENTITY_LABEL: Record<EntityType, string> = {
  stock:       'ทรัพย์สิน',
  project:     'โครงการ',
  owner:       'เจ้าของ',
  tenant:      'ลูกค้า',
  booking:     'ใบจอง',
  lease:       'สัญญาเช่า',
  renewal:     'ต่อสัญญา',
  termination: 'บอกเลิก',
  esign:       'E-Sign',
  invoice:     'ใบแจ้งหนี้',
  receipt:     'ใบเสร็จ',
  commission:  'ค่าคอม',
  coagent:     'Co-Agent',
}

const ENTITY_HREF: Partial<Record<EntityType, (id: string) => string>> = {
  stock:   id => `/stock/${id}`,
  owner:   id => `/owners/${id}`,
  tenant:  id => `/customers/${id}`,
  booking: id => `/contracts/${id}`,
  lease:   id => `/contracts/${id}`,
  renewal: id => `/contracts/${id}`,
  esign:   id => `/contracts/${id}`,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins < 1)    return 'เพิ่งสักครู่'
  if (mins < 60)   return `${mins} นาทีที่แล้ว`
  if (hours < 24)  return `${hours} ชั่วโมงที่แล้ว`
  if (days < 7)    return `${days} วันที่แล้ว`
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const icon = ACTION_ICON[entry.action] ?? ENTITY_ICON[entry.entity_type] ?? '📌'
  const href = ENTITY_HREF[entry.entity_type]?.(entry.entity_id)
  const categoryLabel = ENTITY_LABEL[entry.entity_type]

  const inner = (
    <div className="flex items-start gap-3 py-3.5 px-4">
      <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-gray-800 font-medium leading-snug">{entry.title}</p>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
            {categoryLabel}
          </span>
        </div>
        {entry.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.description}</p>
        )}
      </div>
      <p className="text-[11px] text-gray-400 flex-shrink-0 pt-1 whitespace-nowrap">
        {timeAgo(entry.created_at)}
      </p>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
        {inner}
      </Link>
    )
  }

  return <div className="border-b border-gray-50 last:border-0">{inner}</div>
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entries = await getUserActivity(user.id, 60)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900">กิจกรรมทั้งหมด</h1>
        </div>
        <span className="ml-auto text-sm text-gray-400">{entries.length} รายการล่าสุด</span>
      </div>

      {/* Feed */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 flex flex-col items-center text-gray-400">
          <Activity className="w-10 h-10 mb-3 text-gray-200" />
          <p className="text-sm font-medium">ยังไม่มีกิจกรรม</p>
          <p className="text-xs mt-1 text-gray-300">เริ่มต้นโดยการเพิ่มทรัพย์สินหรือลูกค้า</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {entries.map(e => <ActivityRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  )
}
