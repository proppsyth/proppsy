import type { Metadata } from 'next'
import { FileCode, Check, X } from 'lucide-react'
import { TEMPLATE_REGISTRY, LANGUAGE_LABELS } from '@/lib/contracts/templateRegistry'
import type { LanguageVersion } from '@/lib/contracts/templateRegistry'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'

export const metadata: Metadata = { title: 'เทมเพลต — Admin' }

const LANGUAGE_BADGE: Record<LanguageVersion, string> = {
  th: 'bg-gray-100 text-gray-600',
  th_en: 'bg-blue-100 text-blue-700',
  th_en_zh: 'bg-orange-100 text-orange-700',
}

export default function AdminTemplatesPage() {
  // Group by docType
  const grouped = new Map<string, typeof TEMPLATE_REGISTRY>()
  for (const t of TEMPLATE_REGISTRY) {
    if (!grouped.has(t.docType)) grouped.set(t.docType, [])
    grouped.get(t.docType)!.push(t)
  }

  const docTypes = [...grouped.keys()]
  const allLanguages = [...new Set(TEMPLATE_REGISTRY.map((t) => t.language))]

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileCode className="w-5 h-5 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Template Management</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">เทมเพลตถูกจัดการในโค้ด — ต้องอัปเดตผ่าน deployment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'เทมเพลตทั้งหมด', value: TEMPLATE_REGISTRY.length },
          { label: 'ประเภทเอกสาร', value: docTypes.length },
          { label: 'ภาษา', value: allLanguages.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl mb-6 text-xs text-amber-700">
        <FileCode className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>เทมเพลตถูกกำหนดใน <code className="font-mono bg-amber-100 px-1 rounded">src/lib/contracts/templateRegistry.ts</code> — การเพิ่ม/แก้ไข/ลบเทมเพลตต้องทำผ่าน code deployment เท่านั้น</span>
      </div>

      {/* Group by docType */}
      <div className="space-y-4">
        {[...grouped.entries()].map(([docType, templates]) => (
          <div key={docType} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-900 text-sm">
                {DOC_TYPE_LABELS[docType as ContractDocType] ?? docType}
              </span>
              <span className="text-xs font-mono text-gray-400">({docType})</span>
              <span className="ml-auto text-xs text-gray-400">{templates.length} เทมเพลต</span>
            </div>
            <div className="divide-y divide-gray-50">
              {templates.map((t) => (
                <div key={t.slug} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded">{t.slug}</code>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${LANGUAGE_BADGE[t.language]}`}>
                        {LANGUAGE_LABELS[t.language]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{t.filename}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                    <TemplateTag label={`${t.requiredVars.length} vars`} />
                    {t.imageVars.length > 0 && <TemplateTag label={`${t.imageVars.length} images`} />}
                    <BoolBadge value={t.hasFurniture} label="เฟอร์นิเจอร์" />
                    <BoolBadge value={t.hasPaymentSchedule} label="ตารางชำระ" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TemplateTag({ label }: { label: string }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{label}</span>
  )
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${value ? 'text-green-600' : 'text-gray-300'}`}>
      {value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}
