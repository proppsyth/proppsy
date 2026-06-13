'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { FileImage, X } from 'lucide-react'
import { uploadPublic } from '@/lib/upload/storageService'
import { processToWebp } from '@/lib/upload/imageProcessor'
import { updateRegisterProfile } from '@/app/(auth)/register/actions'
import AddressSelector from '@/components/shared/AddressSelector'

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

interface Props {
  name: string
  avatarUrl: string | null
}

export default function ProfileSetupForm({ name, avatarUrl }: Props) {
  const [form, setForm] = useState({
    name: name,
    phone: '',
    line_id: '',
    national_id: '',
    company_name: '',
    address_no: '',
    address_road: '',
    province: '',
    district: '',
    subdistrict: '',
    zip: '',
  })

  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState('')
  const idCardRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleIdCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIdCardFile(file)
    setIdCardPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('กรุณากรอกชื่อ-นามสกุล'); return }
    if (!form.phone.trim()) { setError('กรุณากรอกเบอร์โทรศัพท์'); return }
    if (!form.national_id.trim()) { setError('กรุณากรอกเลขบัตรประชาชน'); return }
    if (!/^\d{13}$/.test(form.national_id.trim())) { setError('เลขบัตรประชาชนต้องมี 13 หลัก'); return }
    if (!idCardFile) { setError('กรุณาแนบสำเนาบัตรประชาชน'); return }

    setLoading(true)
    try {
      // Upload ID card
      const webpBlob = await processToWebp(idCardFile, 1280)
      const path = `id-cards/${Date.now()}.webp`
      const idCardUrl = await uploadPublic('documents', path, webpBlob)

      const result = await updateRegisterProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        line_id: form.line_id.trim() || null,
        national_id: form.national_id.trim(),
        company_name: form.company_name.trim() || null,
        address_no: form.address_no || null,
        address_road: form.address_road.trim() || null,
        province: form.province || null,
        district: form.district || null,
        subdistrict: form.subdistrict || null,
        zip: form.zip || null,
        id_card_url: idCardUrl,
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      {avatarUrl && (
        <div className="flex justify-center mb-2">
          <Image src={avatarUrl} alt="avatar" width={64} height={64} className="rounded-full object-cover border-2 border-gray-100" />
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
        <input className={INPUT_CLS} value={form.name} onChange={set('name')} placeholder="ชื่อ นามสกุล" />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
        <input className={INPUT_CLS} type="tel" value={form.phone} onChange={set('phone')} placeholder="0x-xxxx-xxxx" />
      </div>

      {/* Line ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Line ID</label>
        <input className={INPUT_CLS} value={form.line_id} onChange={set('line_id')} placeholder="ไม่บังคับ" />
      </div>

      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบริษัท / เอเจนซี</label>
        <input className={INPUT_CLS} value={form.company_name} onChange={set('company_name')} placeholder="ไม่บังคับ" />
      </div>

      {/* National ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประชาชน <span className="text-red-500">*</span></label>
        <input
          className={INPUT_CLS}
          value={form.national_id}
          onChange={e => setForm(f => ({ ...f, national_id: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
          placeholder="13 หลัก"
          inputMode="numeric"
        />
      </div>

      {/* ID Card upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">สำเนาบัตรประชาชน <span className="text-red-500">*</span></label>
        {idCardPreview ? (
          <div className="relative inline-block">
            <Image src={idCardPreview} alt="บัตรประชาชน" width={200} height={130} className="rounded-xl object-cover border border-gray-200" />
            <button
              type="button"
              onClick={() => { setIdCardFile(null); setIdCardPreview('') }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => idCardRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition w-full justify-center"
          >
            <FileImage className="w-4 h-4" />
            อัปโหลดสำเนาบัตรประชาชน
          </button>
        )}
        <input ref={idCardRef} type="file" accept="image/*" className="hidden" onChange={handleIdCardChange} />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
        <AddressSelector
          province={form.province}
          district={form.district}
          subdistrict={form.subdistrict}
          zip={form.zip}
          onChange={(field, value) => setForm(f => ({ ...f, [field]: value }))}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className={INPUT_CLS} value={form.address_no} onChange={set('address_no')} placeholder="บ้านเลขที่" />
          <input className={INPUT_CLS} value={form.address_road} onChange={set('address_road')} placeholder="ถนน" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl text-sm transition"
      >
        {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลและเข้าใช้งาน'}
      </button>
    </form>
  )
}
