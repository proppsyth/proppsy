'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Plus, Minus } from 'lucide-react'
import { adminAdjustCredits } from './actions'

interface Props {
  userId: string
  currentBalance: number
}

export default function CreditAdjustForm({ userId, currentBalance }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const parsed = parseInt(amount, 10)
  const valid = !isNaN(parsed) && parsed > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) { setError('กรุณาระบุจำนวนเครดิตที่ถูกต้อง'); return }
    setError('')
    setSuccess('')
    const finalAmount = mode === 'add' ? parsed : -parsed
    start(async () => {
      const res = await adminAdjustCredits({ userId, amount: finalAmount, note: note.trim() || (mode === 'add' ? 'เพิ่มเครดิตโดยแอดมิน' : 'หักเครดิตโดยแอดมิน') })
      if (res.error) {
        setError(res.error)
        return
      }
      setSuccess(`สำเร็จ! ยอดเครดิตใหม่: ${res.newBalance?.toLocaleString() ?? '—'} เครดิต`)
      setAmount('')
      setNote('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => setMode('add')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition ${
            mode === 'add' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Plus className="w-4 h-4" />
          เพิ่มเครดิต
        </button>
        <button
          type="button"
          onClick={() => setMode('deduct')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition ${
            mode === 'deduct' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Minus className="w-4 h-4" />
          หักเครดิต
        </button>
      </div>

      {/* Quick amounts */}
      <div className="flex flex-wrap gap-1.5">
        {[10, 50, 100, 300, 500].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${
              amount === String(v)
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">จำนวนเครดิต</label>
        <div className="relative">
          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            placeholder="0"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {valid && (
          <p className="text-xs text-gray-400 mt-1">
            ยอดหลังปรับ:{' '}
            <span className="font-semibold text-gray-700">
              {(currentBalance + (mode === 'add' ? parsed : -parsed)).toLocaleString()}
            </span>{' '}
            เครดิต
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">หมายเหตุ (ไม่บังคับ)</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="เหตุผลหรือ Reference..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !valid}
        className={`w-full py-3 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 ${
          mode === 'add'
            ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
            : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
        }`}
      >
        {pending
          ? 'กำลังดำเนินการ...'
          : mode === 'add'
            ? `เพิ่ม ${parsed > 0 ? parsed.toLocaleString() : '—'} เครดิต`
            : `หัก ${parsed > 0 ? parsed.toLocaleString() : '—'} เครดิต`
        }
      </button>
    </form>
  )
}
