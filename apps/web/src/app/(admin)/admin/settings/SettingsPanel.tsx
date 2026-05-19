'use client'

import { useState, useTransition } from 'react'
import { Globe, Zap, Link2 } from 'lucide-react'
import { updateSetting } from './actions'

interface Setting {
  key: string
  value: unknown
  label: string
  description: string
  updated_at: string
}

interface SettingsPanelProps {
  settings: Setting[]
}

const SECTIONS = [
  {
    id: 'platform',
    label: 'Platform',
    icon: Globe,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    keys:  ['site_name', 'maintenance_mode', 'allow_registration', 'require_approval'],
  },
  {
    id: 'features',
    label: 'Features',
    icon: Zap,
    color: 'text-purple-600',
    bg:    'bg-purple-50',
    keys:  ['ai_enabled', 'max_free_stock'],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Link2,
    color: 'text-teal-600',
    bg:    'bg-teal-50',
    keys:  ['contact_email', 'line_notify_token'],
  },
]

function formatUpdatedAt(ts: string) {
  return new Date(ts).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SettingRow({ setting }: { setting: Setting }) {
  const isBoolean = typeof setting.value === 'boolean'
  const isNumber  = typeof setting.value === 'number'

  const [boolVal, setBoolVal]     = useState(isBoolean ? (setting.value as boolean) : false)
  const [textVal, setTextVal]     = useState(
    setting.value === null ? '' :
    isBoolean ? '' :
    String(setting.value)
  )
  const [saved, setSaved]         = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]         = useState('')

  function handleToggle() {
    const next = !boolVal
    setBoolVal(next)
    startTransition(async () => {
      const res = await updateSetting(setting.key, next)
      if (res.error) { setError(res.error); setBoolVal(!next); return }
      setSaved(true)
      setError('')
      setTimeout(() => setSaved(false), 2500)
    })
  }

  function handleSave() {
    setError('')
    startTransition(async () => {
      let saveValue: unknown = textVal.trim() === '' ? null : textVal.trim()
      if (isNumber && saveValue !== null) {
        const n = Number(saveValue)
        if (isNaN(n)) { setError('กรุณากรอกตัวเลข'); return }
        saveValue = n
      }
      const res = await updateSetting(setting.key, saveValue)
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{setting.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
        <p className="text-xs text-gray-300 mt-0.5">อัปเดต: {formatUpdatedAt(setting.updated_at)}</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {isBoolean ? (
          <>
            <button
              type="button"
              onClick={handleToggle}
              disabled={pending}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${boolVal ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${boolVal ? 'translate-x-5' : ''}`} />
            </button>
            {saved && <span className="text-xs text-green-600 font-medium">บันทึกแล้ว ✓</span>}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type={isNumber ? 'number' : 'text'}
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              placeholder={setting.value === null ? '(ว่าง)' : ''}
              className="w-40 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition"
            >
              {pending ? '...' : 'บันทึก'}
            </button>
            {saved && <span className="text-xs text-green-600 font-medium whitespace-nowrap">บันทึกแล้ว ✓</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPanel({ settings }: SettingsPanelProps) {
  const settingsMap = new Map(settings.map(s => [s.key, s]))

  return (
    <div className="space-y-5">
      {SECTIONS.map(section => {
        const Icon = section.icon
        const sectionSettings = section.keys
          .map(k => settingsMap.get(k))
          .filter((s): s is Setting => s !== undefined)

        if (sectionSettings.length === 0) return null

        return (
          <div key={section.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
              <div className={`w-8 h-8 ${section.bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${section.color}`} />
              </div>
              <h2 className="text-sm font-semibold text-gray-700">{section.label}</h2>
            </div>
            <div className="px-5">
              {sectionSettings.map(s => (
                <SettingRow key={s.key} setting={s} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Ungrouped settings */}
      {(() => {
        const groupedKeys = new Set(SECTIONS.flatMap(s => s.keys))
        const ungrouped = settings.filter(s => !groupedKeys.has(s.key))
        if (ungrouped.length === 0) return null
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">อื่นๆ</h2>
            </div>
            <div className="px-5">
              {ungrouped.map(s => (
                <SettingRow key={s.key} setting={s} />
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
