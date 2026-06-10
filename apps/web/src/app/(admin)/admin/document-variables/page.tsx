import {
  DOCUMENT_VARIABLE_REGISTRY,
  VARIABLES_BY_CATEGORY,
  CATEGORY_LABEL,
  CANONICAL_VARIABLES,
  type VariableCategory,
  type VariableSource,
} from '@/lib/document-variable-registry'

const SOURCE_BADGE: Record<VariableSource, { label: string; className: string }> = {
  computed:          { label: 'computed',          className: 'bg-blue-100 text-blue-700' },
  extra_vars:        { label: 'extra_vars',         className: 'bg-amber-100 text-amber-700' },
  computed_or_extra: { label: 'computed / extra',   className: 'bg-purple-100 text-purple-700' },
  alias:             { label: 'alias',              className: 'bg-gray-100 text-gray-500' },
}

export default function DocumentVariablesPage() {
  const totalCount = DOCUMENT_VARIABLE_REGISTRY.length
  const canonicalCount = CANONICAL_VARIABLES.length
  const aliasCount = totalCount - canonicalCount
  const categories = Object.keys(CATEGORY_LABEL) as VariableCategory[]

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-6xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Document Variable Registry</h1>
        <p className="text-sm text-gray-500 mt-1">
          ทะเบียนตัวแปรทั้งหมดที่ใช้ใน template สัญญา — อ่านอย่างเดียว
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">ตัวแปรทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{canonicalCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Canonical keys</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{aliasCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aliases (เก่า)</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <strong className="font-semibold">Source ของตัวแปร:</strong>{' '}
        <span className="font-mono text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">computed</span>
        คำนวณอัตโนมัติจาก DB —{' '}
        <span className="font-mono text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mr-1">extra_vars</span>
        กรอกด้วยตนเองใน extra_vars เท่านั้น —{' '}
        <span className="font-mono text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-1">computed / extra</span>
        คำนวณอัตโนมัติ แต่ extra_vars override ได้ —{' '}
        <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">alias</span>
        ชื่อเก่าที่ยังใช้ได้ (backward compat)
      </div>

      {/* Category sections */}
      <div className="space-y-6">
        {categories.map(category => {
          const vars = VARIABLES_BY_CATEGORY[category]
          if (!vars || vars.length === 0) return null
          return (
            <div key={category} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/60">
                <h2 className="text-sm font-semibold text-gray-700">{CATEGORY_LABEL[category]}</h2>
                <span className="text-xs text-gray-400">{vars.length} ตัวแปร</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-4 py-2 text-gray-400 font-medium w-[220px]">Key (ใส่ใน {'<<'}…{'>>'})</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium w-[170px]">Label</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium">คำอธิบาย</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium w-[130px]">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vars.map((v, i) => {
                      const badge = SOURCE_BADGE[v.source]
                      return (
                        <tr
                          key={v.key}
                          className={`border-b border-gray-50 last:border-0 ${v.source === 'alias' ? 'opacity-60' : ''} ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                        >
                          <td className="px-4 py-2.5 font-mono text-gray-800 whitespace-nowrap">
                            {'<<'}{v.key}{'>>'}
                            {v.aliasOf && (
                              <div className="text-[10px] text-gray-400 mt-0.5 font-sans">
                                → {'<<'}{v.aliasOf}{'>>'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700">{v.label}</td>
                          <td className="px-4 py-2.5 text-gray-500 leading-relaxed">{v.description}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
