'use client'

import { useTransition } from 'react'
import { approveUser, rejectUser } from './actions'

interface Props {
  userId: string
  userName: string
}

export default function UserActions({ userId, userName }: Props) {
  const [approvePending, startApprove] = useTransition()
  const [rejectPending, startReject] = useTransition()
  const busy = approvePending || rejectPending

  function handleApprove() {
    startApprove(async () => {
      await approveUser(userId)
    })
  }

  function handleReject() {
    if (!confirm(`ยืนยันปฏิเสธบัญชีของ "${userName}"?`)) return
    startReject(async () => {
      await rejectUser(userId)
    })
  }

  return (
    <div className="flex gap-2 pt-3 border-t border-gray-100">
      <button
        onClick={handleApprove}
        disabled={busy}
        className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition"
      >
        {approvePending ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
      </button>
      <button
        onClick={handleReject}
        disabled={busy}
        className="flex-1 py-2 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-medium rounded-lg transition"
      >
        {rejectPending ? 'กำลังปฏิเสธ...' : 'ปฏิเสธ'}
      </button>
    </div>
  )
}
