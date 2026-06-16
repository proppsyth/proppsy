'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, Plus } from 'lucide-react'
import { createAppointment } from './actions'
import EntityCombobox from '@/components/shared/EntityCombobox'
import {
  searchStocks, searchCustomers,
  type StockSearchResult, type CustomerSearchResult,
} from '@/app/(protected)/contracts/search-actions'
import QuickStockModal from '@/app/(protected)/contracts/QuickStockModal'
import CustomerDrawer from '@/app/(protected)/contracts/CustomerDrawer'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function AppointmentForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingDatetime, setMeetingDatetime] = useState('')
  const [stockId, setStockId] = useState('')
  const [stockLabel, setStockLabel] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerLabel, setCustomerLabel] = useState('')
  const [showQuickStock, setShowQuickStock] = useState(false)
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false)

  function handleStockSelect(r: StockSearchResult | null) {
    setStockId(r?.id ?? '')
    setStockLabel(r ? [r.project_name, r.unit_no, r.room_type].filter(Boolean).join(' · ') || r.id : '')
  }

  function handleCustomerSelect(r: CustomerSearchResult | null) {
    setCustomerId(r?.id ?? '')
    setCustomerLabel(r ? (r.nickname || [r.first_name_th, r.last_name_th].filter(Boolean).join(' ') || r.id) : '')
  }

  function handleSubmit() {
    if (!title.trim()) { setError('กรุณาระบุชื่อนัดหมาย'); return }
    if (!meetingDatetime) { setError('กรุณาระบุวันและเวลานัดหมาย'); return }
    setError('')
    startTransition(async () => {
      const res = await createAppointment({
        title: title.trim(),
        description: description.trim() || null,
        stock_id: stockId || null,
        customer_id: customerId || null,
        meeting_datetime: new Date(meetingDatetime).toISOString(),
      })
      if (res.error) { setError(res.error); return }
      router.push('/appointments')
    })
  }

  return (
    <>
    <div className="max-w-xl space-y-4">
      <div>
        <Label>ชื่อนัดหมาย *</Label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="เช่น พาชมห้อง, ลงนามสัญญา"
          className={inputCls}
        />
      </div>

      <div>
        <Label>วัน-เวลานัดหมาย *</Label>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="datetime-local"
            value={meetingDatetime}
            onChange={e => setMeetingDatetime(e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>
      </div>

      <div>
        <Label>ทรัพย์ที่เกี่ยวข้อง</Label>
        <EntityCombobox
          kind="stock"
          value={stockId}
          selectedLabel={stockLabel}
          onSelect={handleStockSelect}
          searchFn={searchStocks}
          placeholder="ค้นหาโครงการ, ห้อง, อาคาร..."
        />
        <button
          type="button"
          onClick={() => setShowQuickStock(true)}
          className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มทรัพย์ใหม่
        </button>
      </div>

      <div>
        <Label>ลูกค้า</Label>
        <EntityCombobox
          kind="customer"
          value={customerId}
          selectedLabel={customerLabel}
          onSelect={handleCustomerSelect}
          searchFn={searchCustomers}
          placeholder="ค้นหาลูกค้า / ผู้เช่า..."
        />
        <button
          type="button"
          onClick={() => setShowCustomerDrawer(true)}
          className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      <div>
        <Label>รายละเอียด</Label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="รายละเอียดเพิ่มเติม..."
          className={`${inputCls} resize-none`}
        />
      </div>

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

    {showQuickStock && (
      <QuickStockModal
        onCreated={(id, label) => { setStockId(id); setStockLabel(label); setShowQuickStock(false) }}
        onClose={() => setShowQuickStock(false)}
      />
    )}
    {showCustomerDrawer && (
      <CustomerDrawer
        onCreated={(id, label) => { setCustomerId(id); setCustomerLabel(label); setShowCustomerDrawer(false) }}
        onClose={() => setShowCustomerDrawer(false)}
      />
    )}
    </>
  )
}
