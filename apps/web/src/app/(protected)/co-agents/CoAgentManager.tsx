'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { createCoAgent, updateCoAgent, deleteCoAgent, type CoAgentInput } from './actions'

interface CoAgent {
  id: string
  prefix_th: string | null
  prefix_en: string | null
  first_name_th: string
  last_name_th: string
  first_name_en: string | null
  last_name_en: string | null
  address_no: string | null
  moo: string | null
  soi: string | null
  road: string | null
  subdistrict: string | null
  district: string | null
  province: string | null
  zip: string | null
  bank_name: string | null
  bank_account_name: string | null
  bank_account_no: string | null
  national_id: string | null
  tax_id: string | null
}

const EMPTY: CoAgentInput = {
  prefix_th: '',
  prefix_en: '',
  first_name_th: '',
  last_name_th: '',
  first_name_en: '',
  last_name_en: '',
  address_no: '',
  moo: '',
  soi: '',
  road: '',
  subdistrict: '',
  district: '',
  province: '',
  zip: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_no: '',
  national_id: '',
  tax_id: '',
}

function fullNameTh(p: CoAgent): string {
  return [p.prefix_th, p.first_name_th, p.last_name_th].filter(Boolean).join(' ')
}

export default function CoAgentManager({ initialCoAgents }: { initialCoAgents: CoAgent[] }) {
  const [coAgents, setCoAgents] = useState<CoAgent[]>(initialCoAgents)
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [form, setForm]             = useState<CoAgentInput>(EMPTY)
  const [error, setError]           = useState('')
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof CoAgentInput, v: string) => setForm(f => ({ ...f, [k]: v }))

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setError('')
    setShowForm(true)
  }

  function openEdit(p: CoAgent) {
    setEditingId(p.id)
    setForm({
      prefix_th:        p.prefix_th ?? '',
      prefix_en:        p.prefix_en ?? '',
      first_name_th:    p.first_name_th,
      last_name_th:     p.last_name_th,
      first_name_en:    p.first_name_en ?? '',
      last_name_en:     p.last_name_en ?? '',
      address_no:       p.address_no ?? '',
      moo:              p.moo ?? '',
      soi:              p.soi ?? '',
      road:             p.road ?? '',
      subdistrict:      p.subdistrict ?? '',
      district:         p.district ?? '',
      province:         p.province ?? '',
      zip:              p.zip ?? '',
      bank_name:        p.bank_name ?? '',
      bank_account_name: p.bank_account_name ?? '',
      bank_account_no:  p.bank_account_no ?? '',
      national_id:      p.national_id ?? '',
      tax_id:           p.tax_id ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  function handleSave() {
    if (!form.first_name_th.trim() || !form.last_name_th.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล')
      return
    }
    setError('')
    startTransition(async () => {
      const t = (v: string | undefined) => v?.trim() || undefined
      const clean: CoAgentInput = {
        first_name_th:     form.first_name_th.trim(),
        last_name_th:      form.last_name_th.trim(),
        prefix_th:         t(form.prefix_th),
        prefix_en:         t(form.prefix_en),
        first_name_en:     t(form.first_name_en),
        last_name_en:      t(form.last_name_en),
        address_no:        t(form.address_no),
        moo:               t(form.moo),
        soi:               t(form.soi),
        road:              t(form.road),
        subdistrict:       t(form.subdistrict),
        district:          t(form.district),
        province:          t(form.province),
        zip:               t(form.zip),
        bank_name:         t(form.bank_name),
        bank_account_name: t(form.bank_account_name),
        bank_account_no:   t(form.bank_account_no),
        national_id:       t(form.national_id),
        tax_id:            t(form.tax_id),
      }

      let result: { error?: string; id?: string }
      if (editingId) {
        result = await updateCoAgent(editingId, clean)
      } else {
        result = await createCoAgent(clean)
      }

      if (result.error) { setError(result.error); return }

      // Refresh list in-place (optimistic)
      if (editingId) {
        setCoAgents(prev => prev.map(p =>
          p.id === editingId
            ? { ...p, ...clean, first_name_th: clean.first_name_th, last_name_th: clean.last_name_th } as CoAgent
            : p
        ))
      } else if (result.id) {
        const newEntry: CoAgent = {
          id:                result.id!,
          prefix_th:         clean.prefix_th ?? null,
          prefix_en:         clean.prefix_en ?? null,
          first_name_th:     clean.first_name_th,
          last_name_th:      clean.last_name_th,
          first_name_en:     clean.first_name_en ?? null,
          last_name_en:      clean.last_name_en ?? null,
          address_no:        clean.address_no ?? null,
          moo:               clean.moo ?? null,
          soi:               clean.soi ?? null,
          road:              clean.road ?? null,
          subdistrict:       clean.subdistrict ?? null,
          district:          clean.district ?? null,
          province:          clean.province ?? null,
          zip:               clean.zip ?? null,
          bank_name:         clean.bank_name ?? null,
          bank_account_name: clean.bank_account_name ?? null,
          bank_account_no:   clean.bank_account_no ?? null,
          national_id:       clean.national_id ?? null,
          tax_id:            clean.tax_id ?? null,
        }
        setCoAgents(prev => [newEntry, ...prev])
      }
      closeForm()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCoAgent(id)
      if (result.error) { setError(result.error); return }
      setCoAgents(prev => prev.filter(p => p.id !== id))
      setConfirmId(null)
    })
  }

  return (
    <div>
      {/* List */}
      {coAgents.length === 0 && !showForm ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          ยังไม่มี Co-Agent — กดปุ่มด้านบนเพื่อเพิ่ม
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {coAgents.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{fullNameTh(p)}</p>
                {(p.first_name_en || p.last_name_en) && (
                  <p className="text-xs text-gray-400">{[p.prefix_en, p.first_name_en, p.last_name_en].filter(Boolean).join(' ')}</p>
                )}
                {p.bank_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{p.bank_name} · {p.bank_account_no}</p>
                )}
                {p.national_id && (
                  <p className="text-xs text-gray-400">{p.national_id}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button type="button" onClick={() => openEdit(p)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmId === p.id ? (
                  <>
                    <button type="button" onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded">ยืนยัน</button>
                    <button type="button" onClick={() => setConfirmId(null)}
                      className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-50 rounded">ยกเลิก</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline form */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">
              {editingId ? 'แก้ไข Co-Agent' : 'เพิ่ม Co-Agent ใหม่'}
            </p>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">ชื่อ</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="คำนำหน้า (ไทย)" value={form.prefix_th ?? ''} onChange={v => set('prefix_th', v)} placeholder="นาย / นาง / น.ส." />
              <Field label="คำนำหน้า (EN)" value={form.prefix_en ?? ''} onChange={v => set('prefix_en', v)} placeholder="Mr./Mrs./Ms." />
              <Field label="ชื่อ (ไทย) *" value={form.first_name_th} onChange={v => set('first_name_th', v)} placeholder="ชื่อ" />
              <Field label="นามสกุล (ไทย) *" value={form.last_name_th} onChange={v => set('last_name_th', v)} placeholder="นามสกุล" />
              <Field label="First Name (EN)" value={form.first_name_en ?? ''} onChange={v => set('first_name_en', v)} placeholder="First name" />
              <Field label="Last Name (EN)" value={form.last_name_en ?? ''} onChange={v => set('last_name_en', v)} placeholder="Last name" />
            </div>

            <p className="text-xs font-semibold text-gray-500 mt-2">ที่อยู่</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="บ้านเลขที่" value={form.address_no ?? ''} onChange={v => set('address_no', v)} placeholder="123/4" />
              <Field label="หมู่ที่" value={form.moo ?? ''} onChange={v => set('moo', v)} placeholder="ไม่บังคับ" />
              <Field label="ซอย" value={form.soi ?? ''} onChange={v => set('soi', v)} placeholder="ไม่บังคับ" />
              <Field label="ถนน" value={form.road ?? ''} onChange={v => set('road', v)} placeholder="ถนนสุขุมวิท" />
              <Field label="แขวง/ตำบล" value={form.subdistrict ?? ''} onChange={v => set('subdistrict', v)} placeholder="คลองเตย" />
              <Field label="เขต/อำเภอ" value={form.district ?? ''} onChange={v => set('district', v)} placeholder="คลองเตย" />
              <Field label="จังหวัด" value={form.province ?? ''} onChange={v => set('province', v)} placeholder="กรุงเทพมหานคร" />
              <Field label="รหัสไปรษณีย์" value={form.zip ?? ''} onChange={v => set('zip', v)} placeholder="10110" />
            </div>

            <p className="text-xs font-semibold text-gray-500 mt-2">ตัวตน</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="เลขบัตรประชาชน" value={form.national_id ?? ''} onChange={v => set('national_id', v)} placeholder="13 หลัก" />
              <Field label="เลขผู้เสียภาษี" value={form.tax_id ?? ''} onChange={v => set('tax_id', v)} placeholder="ถ้าต่างจากบัตร" />
            </div>

            <p className="text-xs font-semibold text-gray-500 mt-2">ธนาคาร</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ชื่อธนาคาร" value={form.bank_name ?? ''} onChange={v => set('bank_name', v)} placeholder="กสิกรไทย" />
              <Field label="เลขบัญชี" value={form.bank_account_no ?? ''} onChange={v => set('bank_account_no', v)} placeholder="xxx-x-xxxxx-x" />
              <div className="col-span-2">
                <Field label="ชื่อบัญชี" value={form.bank_account_name ?? ''} onChange={v => set('bank_account_name', v)} placeholder="ชื่อเจ้าของบัญชี" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={closeForm}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition">
              ยกเลิก
            </button>
            <button type="button" onClick={handleSave} disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40">
              {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">
          <Plus className="w-4 h-4" />
          เพิ่ม Co-Agent
        </button>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
