'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from './actions'
import type { Profile } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'แอดมิน',
  manager: 'ผู้จัดการ',
  user: 'เอเจนต์',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  const createdDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <form
      key={editing ? 'edit' : profile.updated_at}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Header: badges + action buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[profile.account_status]}`}>
            {STATUS_LABELS[profile.account_status]}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>

        <div className="flex gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              แก้ไข
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setEditing(false); setError('') }}
                disabled={isPending}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition"
              >
                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ข้อมูลส่วนตัว */}
      <Section title="ข้อมูลส่วนตัว">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ชื่อ-นามสกุล" name="name" value={profile.name} editing={editing} />
          <Field label="ชื่อเล่น" name="nickname" value={profile.nickname} editing={editing} />
          <Field label="เบอร์โทรศัพท์" name="phone" value={profile.phone} editing={editing} inputMode="tel" />
          <Field label="LINE ID" name="line_id" value={profile.line_id} editing={editing} />
          <Field label="ตำแหน่ง" name="position" value={profile.position} editing={editing} />
          <Field label="บริษัท / ทีม" name="company_name" value={profile.company_name} editing={editing} />
        </div>
      </Section>

      {/* ข้อมูลทางการ */}
      <Section title="ข้อมูลทางการ">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="เลขประจำตัวผู้เสียภาษี"
            name="tax_id"
            value={profile.tax_id}
            editing={editing}
          />
          <Field
            label="เลขบัตรประชาชน (13 หลัก)"
            name="national_id"
            value={profile.national_id}
            editing={editing}
            inputMode="numeric"
            maxLength={13}
          />
        </div>
      </Section>

      {/* ที่อยู่ */}
      <Section title="ที่อยู่">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="เลขที่" name="address_no" value={profile.address_no} editing={editing} />
          <Field label="ถนน" name="address_road" value={profile.address_road} editing={editing} />
          <Field label="แขวง / ตำบล" name="subdistrict" value={profile.subdistrict} editing={editing} />
          <Field label="เขต / อำเภอ" name="district" value={profile.district} editing={editing} />
          <Field label="จังหวัด" name="province" value={profile.province} editing={editing} />
          <Field
            label="รหัสไปรษณีย์"
            name="zip"
            value={profile.zip}
            editing={editing}
            inputMode="numeric"
            maxLength={5}
          />
        </div>
      </Section>

      {/* ข้อมูลธนาคาร */}
      <Section title="ข้อมูลธนาคาร">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ธนาคาร" name="bank_name" value={profile.bank_name} editing={editing} />
          <Field
            label="เลขบัญชี"
            name="bank_account_no"
            value={profile.bank_account_no}
            editing={editing}
            inputMode="numeric"
          />
          <div className="sm:col-span-2">
            <Field
              label="ชื่อบัญชี"
              name="bank_account_name"
              value={profile.bank_account_name}
              editing={editing}
            />
          </div>
        </div>
      </Section>

      {/* ข้อมูลบัญชี (read-only) */}
      <Section title="ข้อมูลบัญชี">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnly label="อีเมล" value={profile.email} />
          <ReadOnly label="วันที่สมัคร" value={createdDate} />
        </div>
      </Section>
    </form>
  )
}

// ─── Sub-components ───────────────────────────────────────────

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

interface FieldProps {
  label: string
  name: string
  value?: string | null
  editing: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
}

function Field({ label, name, value, editing, inputMode, maxLength }: FieldProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <input
          name={name}
          defaultValue={value ?? ''}
          inputMode={inputMode}
          maxLength={maxLength}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      ) : (
        <p className="text-sm text-gray-900 min-h-[1.25rem]">{value || '—'}</p>
      )}
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900 min-h-[1.25rem]">{value || '—'}</p>
    </div>
  )
}
