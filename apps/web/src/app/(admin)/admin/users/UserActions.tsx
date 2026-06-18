'use client'

import { useState, useTransition } from 'react'
import { approveUser, rejectUser, updateUser, deactivateUser, restoreUser } from './actions'
import type { Profile, Role, AccountStatus, Plan } from '@/types'
import { PLAN_META, resolvePlan } from '@/types'

interface Props {
  user: Profile
}

const ROLE_OPTS: { value: Role; label: string }[] = [
  { value: 'user', label: 'เอเจนต์' },
  { value: 'manager', label: 'ผู้จัดการ' },
  { value: 'admin', label: 'แอดมิน' },
]

const STATUS_OPTS: { value: AccountStatus; label: string }[] = [
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'pending', label: 'รอการอนุมัติ' },
  { value: 'rejected', label: 'ปฏิเสธแล้ว' },
]

const PLAN_OPTS: { value: Plan; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'business', label: 'Business' },
]

export default function UserActions({ user }: Props) {
  const [approvePending, startApprove] = useTransition()
  const [rejectPending, startReject] = useTransition()
  const [deactivatePending, startDeactivate] = useTransition()
  const [restorePending, startRestore] = useTransition()
  const [editPending, startEdit] = useTransition()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: user.name ?? '',
    nickname: user.nickname ?? '',
    phone: user.phone ?? '',
    role: user.role,
    account_status: user.account_status,
    plan: resolvePlan(user.plan),
  })

  const busy = approvePending || rejectPending || deactivatePending || restorePending || editPending

  if (editing) {
    return (
      <div className="pt-3 border-t border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">แก้ไขข้อมูล</p>
        <div className="space-y-2">
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ชื่อ-นามสกุล"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={form.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            placeholder="ชื่อเล่น"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="เบอร์โทร"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">สถานะ</label>
              <select
                value={form.account_status}
                onChange={e => setForm(f => ({ ...f, account_status: e.target.value as AccountStatus }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">บทบาท</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">แพ็กเกจ</label>
            <select
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value as Plan }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {PLAN_OPTS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setError('') }} disabled={busy}
            className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
            ยกเลิก
          </button>
          <button
            onClick={() => {
              setError('')
              startEdit(async () => {
                const res = await updateUser(user.id, {
                  name: form.name || undefined,
                  nickname: form.nickname || undefined,
                  phone: form.phone || undefined,
                  role: form.role,
                  account_status: form.account_status,
                  plan: form.plan,
                })
                if (res.error) { setError(res.error); return }
                setEditing(false)
              })
            }}
            disabled={busy}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition disabled:bg-blue-300">
            {editPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-3 border-t border-gray-100 space-y-2">
      {user.account_status === 'pending' && !user.deleted_at && (
        <div className="flex gap-2">
          <button
            onClick={() => startApprove(async () => { await approveUser(user.id) })}
            disabled={busy}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition">
            {approvePending ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
          </button>
          <button
            onClick={() => {
              if (!confirm(`ยืนยันปฏิเสธบัญชีของ "${user.name || user.email}"?`)) return
              startReject(async () => { await rejectUser(user.id) })
            }}
            disabled={busy}
            className="flex-1 py-2 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-medium rounded-lg transition">
            {rejectPending ? 'กำลังปฏิเสธ...' : 'ปฏิเสธ'}
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} disabled={busy}
          className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
          ✏️ แก้ไข
        </button>
        {user.deleted_at ? (
          <button
            onClick={() => {
              if (!confirm(`กู้คืนบัญชี "${user.name || user.email}"?\nผู้ใช้จะสามารถเข้าสู่ระบบได้อีกครั้ง`)) return
              startRestore(async () => {
                const res = await restoreUser(user.id)
                if (res.error) setError(res.error)
              })
            }}
            disabled={busy}
            className="py-2 px-3 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg transition disabled:opacity-50">
            {restorePending ? '...' : 'กู้คืนบัญชี'}
          </button>
        ) : (
          <button
            onClick={() => {
              if (!confirm(`ปิดการใช้งานบัญชี "${user.name || user.email}"?\nผู้ใช้จะไม่สามารถเข้าสู่ระบบได้\nข้อมูลทั้งหมดยังถูกเก็บไว้และสามารถกู้คืนได้`)) return
              startDeactivate(async () => {
                const res = await deactivateUser(user.id)
                if (res.error) setError(res.error)
              })
            }}
            disabled={busy}
            className="py-2 px-3 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-medium rounded-lg transition disabled:opacity-50">
            {deactivatePending ? '...' : 'ปิดบัญชี'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
