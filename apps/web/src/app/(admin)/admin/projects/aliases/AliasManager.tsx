'use client'

import { useState, useMemo, useTransition } from 'react'
import { Tags, X, Plus, Loader2, Search } from 'lucide-react'
import { addProjectAlias, removeProjectAlias } from '../alias-actions'
import type { AliasRow } from '../alias-actions'

interface Props {
  aliases: AliasRow[]
  projects: { id: string; name_th: string; name_en: string | null }[]
}

const LANG_OPTIONS: { value: 'th' | 'en' | 'other'; label: string }[] = [
  { value: 'th',    label: 'ไทย' },
  { value: 'en',    label: 'English' },
  { value: 'other', label: 'อื่นๆ' },
]

const LANG_BADGE: Record<string, string> = {
  th:    'bg-blue-100 text-blue-700',
  en:    'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-500',
}

export default function AliasManager({ aliases: initial, projects }: Props) {
  const [aliases, setAliases] = useState<AliasRow[]>(initial)
  const [filter, setFilter]   = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Add-alias form state
  const [projectId, setProjectId]   = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [aliasName, setAliasName]   = useState('')
  const [language, setLanguage]     = useState<'th' | 'en' | 'other'>('th')
  const [addError, setAddError]     = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const selectedProject = projects.find(p => p.id === projectId)

  const filteredProjects = useMemo(() =>
    projectSearch.trim()
      ? projects.filter(p =>
          p.name_th.toLowerCase().includes(projectSearch.toLowerCase()) ||
          (p.name_en ?? '').toLowerCase().includes(projectSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(projectSearch.toLowerCase())
        ).slice(0, 8)
      : [],
    [projects, projectSearch]
  )

  const filteredAliases = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return aliases
    return aliases.filter(a =>
      a.alias_name.toLowerCase().includes(q) ||
      a.project_name_th.toLowerCase().includes(q) ||
      (a.project_name_en ?? '').toLowerCase().includes(q)
    )
  }, [aliases, filter])

  function handleAdd() {
    if (!projectId) { setAddError('กรุณาเลือกโครงการ'); return }
    if (!aliasName.trim()) { setAddError('กรุณาระบุชื่อ alias'); return }
    setAddError('')
    startTransition(async () => {
      const result = await addProjectAlias(projectId, aliasName.trim(), language)
      if (result.error) {
        setAddError(result.error)
      } else {
        const proj = projects.find(p => p.id === projectId)
        const newRow: AliasRow = {
          id:              result.id!,
          project_id:      projectId,
          alias_name:      aliasName.trim(),
          language,
          created_at:      new Date().toISOString(),
          project_name_th: proj?.name_th ?? '-',
          project_name_en: proj?.name_en ?? null,
        }
        setAliases(prev => [newRow, ...prev])
        setAliasName('')
        setProjectId('')
        setProjectSearch('')
        setLanguage('th')
      }
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeProjectAlias(id)
      if (!result.error) {
        setAliases(prev => prev.filter(a => a.id !== id))
        setConfirmId(null)
      }
    })
  }

  return (
    <div className="space-y-5">

      {/* ── Add Alias form ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-700">เพิ่ม Alias ใหม่</h2>
        </div>

        <div className="space-y-3">
          {/* Project picker */}
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">โครงการ</label>
            {selectedProject ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-indigo-300 rounded-lg bg-indigo-50">
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{selectedProject.name_th}</span>
                <span className="text-xs text-gray-400">{selectedProject.id}</span>
                <button onClick={() => { setProjectId(''); setProjectSearch('') }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={projectSearch}
                  onChange={e => { setProjectSearch(e.target.value); setShowPicker(true) }}
                  onFocus={() => setShowPicker(true)}
                  placeholder="ค้นหาโครงการ..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                {showPicker && filteredProjects.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredProjects.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProjectId(p.id); setProjectSearch(''); setShowPicker(false) }}
                        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{p.id}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">{p.name_th}</p>
                          {p.name_en && <p className="text-xs text-gray-400 truncate">{p.name_en}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alias name + language row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">ชื่อ Alias</label>
              <input
                type="text"
                value={aliasName}
                onChange={e => setAliasName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                placeholder="เช่น Fuse Sense BK, ฟิวส์ บางแค"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-gray-500 mb-1">ภาษา</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as 'th' | 'en' | 'other')}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                {LANG_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {addError && <p className="text-xs text-red-500">{addError}</p>}

          <button
            onClick={handleAdd}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            เพิ่ม Alias
          </button>
        </div>
      </div>

      {/* ── Filter + list ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
          <Tags className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 flex-1">Aliases ทั้งหมด</h2>
          <span className="text-xs text-gray-400">{aliases.length} รายการ</span>
        </div>

        <div className="px-4 py-3 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="ค้นหาชื่อโครงการหรือ alias..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {filteredAliases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">ยังไม่มี alias</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">โครงการ</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Alias Name</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium w-20">ภาษา</th>
                  <th className="w-24 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAliases.map((a, i) => (
                  <tr key={a.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{a.project_name_th}</p>
                      <p className="text-[10px] text-gray-400">{a.project_id}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{a.alias_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${LANG_BADGE[a.language] ?? LANG_BADGE.other}`}>
                        {a.language}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmId === a.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => handleRemove(a.id)} disabled={isPending} className="text-xs text-red-600 font-medium">ยืนยัน</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400">ยกเลิก</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(a.id)} className="text-xs text-gray-400 hover:text-red-500 transition">ลบ</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
