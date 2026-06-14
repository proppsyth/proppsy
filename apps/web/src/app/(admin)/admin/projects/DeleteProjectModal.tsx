'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Trash2, X, AlertTriangle, Search, ArrowRight } from 'lucide-react'
import { deleteProject } from './alias-actions'

interface ProjectRow {
  id: string
  name_th: string
  stockCount: number
}

interface Props {
  project: ProjectRow
  allProjects: ProjectRow[]
}

export default function DeleteProjectModal({ project, allProjects }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'confirm' | 'pick'>('confirm')
  const [replacement, setReplacement] = useState<ProjectRow | null>(null)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasStock = project.stockCount > 0
  const candidates = allProjects.filter(
    (p) =>
      p.id !== project.id &&
      (query.trim() === '' ||
        p.name_th.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase())),
  )

  useEffect(() => {
    if (step === 'pick' && inputRef.current) inputRef.current.focus()
  }, [step])

  function handleOpen() {
    setOpen(true)
    setStep(hasStock ? 'pick' : 'confirm')
    setReplacement(null)
    setQuery('')
    setError(null)
  }

  function handleClose() {
    if (isPending) return
    setOpen(false)
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteProject(project.id, replacement?.id)
      if (res.error) {
        setError(res.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="ลบโครงการ"
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">ลบโครงการ</p>
                  <p className="text-[11px] text-gray-400 font-mono">{project.id}</p>
                </div>
              </div>
              <button onClick={handleClose} disabled={isPending} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Project name */}
              <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {project.name_th}
              </p>

              {hasStock ? (
                <>
                  {/* Warning */}
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      โครงการนี้มีทรัพย์อยู่ <strong>{project.stockCount} รายการ</strong>{' '}
                      กรุณาเลือกโครงการใหม่เพื่อย้ายทรัพย์ก่อนลบ
                    </p>
                  </div>

                  {/* Replacement picker */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      ย้ายทรัพย์ไปโครงการ
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setReplacement(null) }}
                        placeholder="ค้นหาชื่อโครงการ..."
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {replacement ? (
                      <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold text-blue-800">{replacement.name_th}</p>
                          <p className="text-[10px] font-mono text-blue-400">{replacement.id}</p>
                        </div>
                        <button onClick={() => setReplacement(null)} className="text-blue-400 hover:text-blue-600 ml-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                        {candidates.slice(0, 20).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setReplacement(p); setQuery(p.name_th) }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 transition"
                          >
                            <p className="text-xs font-medium text-gray-800">{p.name_th}</p>
                            <p className="text-[10px] font-mono text-gray-400">{p.id} · {p.stockCount} ทรัพย์</p>
                          </button>
                        ))}
                        {candidates.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-3">ไม่พบโครงการ</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
                  <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    โครงการนี้ไม่มีทรัพย์อยู่ กดยืนยันเพื่อลบออกจากระบบ
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending || (hasStock && !replacement)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : hasStock && replacement ? (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    ย้ายทรัพย์ &amp; ลบ
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบโครงการ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
