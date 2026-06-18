import type { EntityType, ActivityLogEntry } from '@/lib/activity/log'
import { getEntityActivity } from '@/lib/activity/log'
import ActivityIcon from './ActivityIcon'

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

function ActivityItem({ entry }: { entry: ActivityLogEntry }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <ActivityIcon action={entry.action} entityType={entry.entity_type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium leading-snug">{entry.title}</p>
        {entry.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.description}</p>
        )}
      </div>
      <p className="text-[11px] text-gray-400 flex-shrink-0 pt-0.5">{timeAgo(entry.created_at)}</p>
    </div>
  )
}

interface Props {
  entityType: EntityType | EntityType[]
  entityId: string
  limit?: number
}

export default async function ActivityPanel({ entityType, entityId, limit = 15 }: Props) {
  const entries = await getEntityActivity(entityType, entityId, limit)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">กิจกรรม</h3>
        <span className="text-xs text-gray-400">{entries.length} รายการ</span>
      </div>

      {entries.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">ยังไม่มีกิจกรรม</div>
      ) : (
        <div className="px-4 divide-y divide-gray-50">
          {entries.map(e => <ActivityItem key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  )
}
