'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, Clock } from 'lucide-react'
import { createAppointment } from './actions'
import type { Stock, Customer } from '@/types'
import { customerDisplayName, stockDisplayTitle } from '@/types'

interface Props {
  stocks: Stock[]
  customers: Customer[]
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function AppointmentForm({ stocks, customers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stockId, setStockId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  function handleSubmit() {
    if (!title.trim()) { setError('กรุณาระบุชื่อนัดหมาย'); return }
    if (!startTime) { setError('กรุณาระบุวันและเวลา'); return }
    setError('')
    startTransition(async () => {
      const res = await createAppointment({
        title: title.trim(),
        description: description.trim() || null,
        stock_id: stockId || null,
        customer_id: customerId || null,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
      })
      if (res.error) { setError(res.error); return }
      router.push('/appointments')
    })
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field>
        <Label>ชื่อนัดหมาย *</Label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="เช่น พาชมห้อง, ลงนามสัญญา"
          className={inputCls}
        />
      </Field>

      <Field>
        <Label>รายละเอียด</Label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="รายละเอียดเพิ่มเติม..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label>วัน-เวลาเริ่ม *</Label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={`${inputCls} pl-8`}
            />
          </div>
        </Field>
        <Field>
          <Label>วัน-เวลาสิ้นสุด</Label>
          <div className="relative">
            <Clock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className={`${inputCls} pl-8`}
            />
          </div>
        </Field>
      </div>

      <Field>
        <Label>ทรัพย์ที่เกี่ยวข้อง</Label>
        <select value={stockId} onChange={e => setStockId(e.target.value)} className={inputCls}>
          <option value="">— ไม่ระบุ —</option>
          {stocks.map(s => (
            <option key={s.id} value={s.id}>{s.id} · {stockDisplayTitle(s)}</option>
          ))}
        </select>
      </Field>

      <Field>
        <Label>ลูกค้า</Label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputCls}>
          <option value="">— ไม่ระบุ —</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.id} · {customerDisplayName(c)}</option>
          ))}
        </select>
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          บันทึกนัดหมาย
        </button>
      </div>
    </div>
  )
}
