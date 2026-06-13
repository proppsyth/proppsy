'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { approveUser, rejectUser, updateUser, deactivateUser, restoreUser, deleteUser } from '../actions'
import type { Profile, Role, AccountStatus, Plan } from '@/types'
import { PLAN_META, resolvePlan } from '@/types'

const ROLE_OPTS: { value: Role; label: string }[] = [
  { value: 'user', label: 'เอเจนต์' },
  { value: 'manager', label: 'ผู้จัดการ' },
  { value: 'admin', label: 'แอดมิน' },
]
const STATUS_OPTS: { value: AccountStatus; label: string }[] = [
  { value: 'pending', label: 'รอการอนุมัติ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ปฏิเสธแล้ว' },
]
const PLAN_OPTS: { value: Plan; label: string }[] = [
  { value: 'starter', label: 'Starter (ฟรี)' },
  { value: 'professional', label: 'Professional' },
  { value: 'business', label: 'Business' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'รอการอนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว',
}

interface Props {
  profile: Profile
  idCardDisplayUrl: string | null
}

export default function AdminUserDetailForm({ profile, idCardDisplayUrl }: Props) {
  const plan = resolvePlan(profile.plan)
  const planMeta = PLAN_META[plan]
  const isGoogle = profile.auth_provider === 'google'
  const isDeactivated = !!profile.deleted_at

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()
  const [approvePending, startApprove] = useTransition()
  const [rejectPending, startReject] = useTransition()
  const [deactivatePending, startDeactivate] = useTransition()
  const [restorePending, startRestore] = useTransition()
  const [deletePending, startDelete] = useTransition()

  const [form, setForm] = useState({
    name: profile.name ?? '',
    nickname: profile.nickname ?? '',
    phone: profile.phone ?? '',
    line_id: profile.line_id ?? '',
    position: profile.position ?? '',
    company_name: profile.company_name ?? '',
    tax_id: profile.tax_id ?? '',
    national_id: profile.national_id ?? '',
    address_no: profile.address_no ?? '',
    address_road: profile.address_road ?? '',
    subdistrict: profile.subdistrict ?? '',
    district: profile.district ?? '',
    province: profile.province ?? '',
    zip: profile.zip ?? '',
    role: profile.role,
    account_status: profile.account_status,
    plan: plan,
  })

  const busy = isPending || approvePending || rejectPending || deactivatePending || restorePending || deletePending

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    setError(''); setSuccess('')
    startTransition(async () => {
      const res = await updateUser(profile.id, {
        name: form.name || undefined,
        nickname: form.nickname || undefined,
        phone: form.phone || undefined,
        line_id: form.line_id || undefined,
        position: form.position || undefined,
        company_name: form.company_name || undefined,
        tax_id: form.tax_id || undefined,
        national_id: form.national_id || undefined,
        address_no: form.address_no || undefined,
        address_road: form.address_road || undefined,
        subdistrict: form.subdistrict || undefined,
        district: form.district || undefined,
        province: form.province || undefined,
        zip: form.zip || undefined,
        role: form.role,
        account_status: form.account_status,
        plan: form.plan,
      })
      if (res.error) { setError(res.error); return }
      setSuccess('บันทึกแล้ว ✓')
      setEditing(false)
    })
  }

  const createdDate = new Date(profile.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.name ?? ''} className="w-full h-full object-cover" />
          ) : (
            ((profile.nickname || profile.name || profile.email || 'U').charAt(0)).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-lg">{profile.name || '—'}</p>
          <p className="text-sm text-gray-500">{profile.email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${isDeactivated ? 'bg-gray-100 text-gray-500 border-gray-200' : STATUS_COLORS[profile.account_status]}`}>
              {isDeactivated ? 'ปิดการใช้งาน' : STATUS_LABELS[profile.account_status]}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${planMeta.badge}`}>
              {planMeta.label}
            </span>
            {isGoogle && (
              <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600">Google</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!editing ? (
            <button onClick={() => { setEditing(true); setSuccess('') }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              ✏️ แก้ไข
            </button>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setError(''); setForm({ name: profile.name ?? '', nickname: profile.nickname ?? '', phone: profile.phone ?? '', line_id: profile.line_id ?? '', position: profile.position ?? '', company_name: profile.company_name ?? '', tax_id: profile.tax_id ?? '', national_id: profile.national_id ?? '', address_no: profile.address_no ?? '', address_road: profile.address_road ?? '', subdistrict: profile.subdistrict ?? '', district: profile.district ?? '', province: profile.province ?? '', zip: profile.zip ?? '', role: profile.role, account_status: profile.account_status, plan: resolvePlan(profile.plan) }) }} disabled={busy}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={busy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition">
                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Approve / Reject */}
      {profile.account_status === 'pending' && !isDeactivated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">⏳ รอการพิจารณา</p>
          <div className="flex gap-3">
            <button
              onClick={() => startApprove(async () => { await approveUser(profile.id); window.location.reload() })}
              disabled={busy}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold rounded-lg transition"
            >
              {approvePending ? 'กำลังอนุมัติ...' : '✅ อนุมัติ'}
            </button>
            <button
              onClick={() => {
                if (!confirm(`ยืนยันปฏิเสธบัญชี "${profile.name || profile.email}"?`)) return
                startReject(async () => { await rejectUser(profile.id); window.location.reload() })
              }}
              disabled={busy}
              className="flex-1 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition"
            >
              {rejectPending ? 'กำลังปฏิเสธ...' : '❌ ปฏิเสธ'}
            </button>
          </div>
        </div>
      )}

      {/* Identity Documents */}
      <Section title="เอกสารยืนยันตัวตน">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ID Card */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">สำเนาบัตรประชาชน</p>
            {idCardDisplayUrl ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={idCardDisplayUrl}
                  alt="สำเนาบัตรประชาชน"
                  className="w-full object-contain max-h-56 bg-gray-50"
                />
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center text-gray-400 text-sm">
                ยังไม่มีสำเนาบัตรประชาชน
              </div>
            )}
          </div>

          {/* Bank Book */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">สมุดบัญชีธนาคาร</p>
            {profile.bank_book_url ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.bank_book_url}
                  alt="สมุดบัญชี"
                  className="w-full object-contain max-h-56 bg-gray-50"
                />
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center text-gray-400 text-sm">
                ยังไม่มีสมุดบัญชี
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Personal Info */}
      <Section title="ข้อมูลส่วนตัว">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditField label="ชื่อ-นามสกุล" value={form.name} onChange={v => set('name', v)} editing={editing} />
          <EditField label="ชื่อเล่น" value={form.nickname} onChange={v => set('nickname', v)} editing={editing} />
          <EditField label="เบอร์โทรศัพท์" value={form.phone} onChange={v => set('phone', v)} editing={editing} />
          <EditField label="LINE ID" value={form.line_id} onChange={v => set('line_id', v)} editing={editing} />
          <div className="sm:col-span-2">
            <EditField label="เลขบัตรประชาชน" value={form.national_id} onChange={v => set('national_id', v)} editing={editing} mono />
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-400">อีเมล</p>
            <p className="text-sm text-gray-700 mt-0.5">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">วิธีสมัคร</p>
            <p className="text-sm text-gray-700 mt-0.5">{isGoogle ? '🔵 Google OAuth' : '📧 อีเมล'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">วันที่สมัคร</p>
            <p className="text-sm text-gray-700 mt-0.5">{createdDate}</p>
          </div>
        </div>
      </Section>

      {/* Business Info */}
      <Section title="ข้อมูลบริษัท / ทีม">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <EditField label="บริษัท / ทีม" value={form.company_name} onChange={v => set('company_name', v)} editing={editing} />
            {!form.company_name && !editing && (
              <p className="text-xs text-amber-600 mt-1">⚠️ ยังไม่ได้กรอกชื่อบริษัท</p>
            )}
          </div>
          <EditField label="ตำแหน่ง" value={form.position} onChange={v => set('position', v)} editing={editing} />
          <div>
            <EditField label="เลขประจำตัวผู้เสียภาษี" value={form.tax_id} onChange={v => set('tax_id', v)} editing={editing} mono />
            {!form.tax_id && !editing && (
              <p className="text-xs text-amber-600 mt-1">⚠️ ยังไม่ได้กรอกเลขผู้เสียภาษี</p>
            )}
          </div>
        </div>
      </Section>

      {/* Bank Info */}
      <Section title="ข้อมูลธนาคาร">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">ธนาคาร</p>
            <p className="text-sm text-gray-700 mt-0.5">{profile.bank_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ชื่อบัญชี</p>
            <p className="text-sm text-gray-700 mt-0.5">{profile.bank_account_name || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-400">เลขที่บัญชี</p>
            <p className="text-sm font-mono text-gray-700 mt-0.5">{profile.bank_account_no || '—'}</p>
          </div>
        </div>
      </Section>

      {/* Address */}
      <Section title="ที่อยู่">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditField label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} editing={editing} />
          <EditField label="ถนน / ซอย" value={form.address_road} onChange={v => set('address_road', v)} editing={editing} />
          <EditField label="ตำบล / แขวง" value={form.subdistrict} onChange={v => set('subdistrict', v)} editing={editing} />
          <EditField label="อำเภอ / เขต" value={form.district} onChange={v => set('district', v)} editing={editing} />
          <EditField label="จังหวัด" value={form.province} onChange={v => set('province', v)} editing={editing} />
          <EditField label="รหัสไปรษณีย์" value={form.zip} onChange={v => set('zip', v)} editing={editing} />
        </div>
      </Section>

      {/* Account Settings */}
      <Section title="ตั้งค่าบัญชี">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">สถานะบัญชี</label>
            {editing ? (
              <select
                value={form.account_status}
                onChange={e => set('account_status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_COLORS[profile.account_status]}`}>
                {STATUS_LABELS[profile.account_status]}
              </span>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">บทบาท</label>
            {editing ? (
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <p className="text-sm text-gray-700">
                {ROLE_OPTS.find(r => r.value === profile.role)?.label ?? profile.role}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">แพ็กเกจ</label>
            {editing ? (
              <select
                value={form.plan}
                onChange={e => set('plan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PLAN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${planMeta.badge}`}>
                {planMeta.label}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="จัดการบัญชี">
        <div className="flex flex-wrap gap-3">
          {isDeactivated ? (
            <button
              onClick={() => {
                if (!confirm(`กู้คืนบัญชี "${profile.name || profile.email}"?`)) return
                startRestore(async () => { await restoreUser(profile.id); window.location.reload() })
              }}
              disabled={busy}
              className="px-4 py-2 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {restorePending ? '...' : '♻️ กู้คืนบัญชี'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (!confirm(`ปิดการใช้งานบัญชี "${profile.name || profile.email}"?`)) return
                startDeactivate(async () => { await deactivateUser(profile.id); window.location.reload() })
              }}
              disabled={busy}
              className="px-4 py-2 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {deactivatePending ? '...' : '🚫 ปิดบัญชี'}
            </button>
          )}
          <button
            onClick={() => {
              if (!confirm(`⚠️ ลบบัญชี "${profile.name || profile.email}" ถาวร?\nข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้`)) return
              if (!confirm('ยืนยันอีกครั้ง — การลบนี้ถาวรและไม่สามารถย้อนกลับได้')) return
              startDelete(async () => {
                const res = await deleteUser(profile.id)
                if (res.error) { setError(res.error); return }
                window.location.href = '/admin/users'
              })
            }}
            disabled={busy}
            className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {deletePending ? '...' : '🗑️ ลบบัญชีถาวร'}
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function EditField({
  label, value, onChange, editing, mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      ) : (
        <p className={`text-sm text-gray-900 min-h-[1.25rem] ${mono ? 'font-mono tracking-wide' : ''}`}>
          {value || '—'}
        </p>
      )}
    </div>
  )
}
