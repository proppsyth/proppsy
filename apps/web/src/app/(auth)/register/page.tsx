'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, RefreshCw, Upload, X, FileImage } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AddressSelector from '@/components/shared/AddressSelector'
import { updateRegisterProfile } from './actions'

type Step = 1 | 2 | 3

const PREFIX_OPTIONS = ['นาย', 'นาง', 'นางสาว']
const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

const TERMS_CONTENT = `ข้อกำหนดการใช้งาน Proppsy

1. การยอมรับข้อกำหนด
การลงทะเบียนและใช้งาน Proppsy ถือว่าคุณยอมรับข้อกำหนดและเงื่อนไขการใช้งานทั้งหมด

2. การใช้งานระบบ
ระบบ Proppsy ให้บริการเฉพาะสำหรับเอเจนต์และนายหน้าอสังหาริมทรัพย์ที่ได้รับการอนุมัติจากผู้ดูแลระบบเท่านั้น ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องและเป็นความจริงในการลงทะเบียน

3. ความรับผิดชอบของผู้ใช้
ผู้ใช้รับผิดชอบต่อข้อมูลทรัพย์สิน เอกสาร และข้อมูลลูกค้าที่บันทึกในระบบทั้งหมด Proppsy ไม่รับผิดชอบต่อความเสียหายที่เกิดจากการใช้งานที่ไม่ถูกต้อง

4. ข้อมูลส่วนตัว
Proppsy เก็บรวบรวมข้อมูลส่วนตัวเพื่อการให้บริการและตรวจสอบตัวตนเท่านั้น ไม่มีการขายหรือแชร์ข้อมูลให้บุคคลที่สาม

5. การระงับบัญชี
Proppsy มีสิทธิ์ระงับหรือยกเลิกบัญชีหากพบการใช้งานที่ผิดข้อกำหนด หรือให้ข้อมูลเท็จในการลงทะเบียน

6. การเปลี่ยนแปลงข้อกำหนด
Proppsy อาจปรับปรุงข้อกำหนดการใช้งานได้โดยแจ้งให้ทราบล่วงหน้าผ่านอีเมลหรือแจ้งเตือนในระบบ

มีผลบังคับใช้ตั้งแต่ วันที่ 1 มกราคม 2568`

const PRIVACY_CONTENT = `นโยบายความเป็นส่วนตัว Proppsy

1. ข้อมูลที่เก็บรวบรวม
- ข้อมูลส่วนตัว: ชื่อ นามสกุล เบอร์โทร อีเมล LINE ID ที่อยู่
- สำเนาบัตรประชาชน: เก็บเพื่อยืนยันตัวตนสำหรับผู้ดูแลระบบ
- ข้อมูลการทำงาน: ทรัพย์สิน สัญญา ลูกค้า และบันทึกต่างๆ ที่ผู้ใช้บันทึกเข้าระบบ

2. วัตถุประสงค์การใช้ข้อมูล
- ยืนยันตัวตนและอนุมัติการใช้งาน
- ให้บริการจัดการอสังหาริมทรัพย์
- ปรับปรุงและพัฒนาระบบ
- ติดต่อสื่อสารเกี่ยวกับการใช้งาน

3. การเปิดเผยข้อมูล
Proppsy ไม่ขายหรือเปิดเผยข้อมูลส่วนตัวให้แก่บุคคลภายนอก ยกเว้นกรณีที่กฎหมายกำหนดหรือได้รับความยินยอมจากผู้ใช้

4. ความปลอดภัยของข้อมูล
ข้อมูลทั้งหมดถูกจัดเก็บบนเซิร์ฟเวอร์ที่มีระบบรักษาความปลอดภัยระดับสูง (Supabase PostgreSQL + Row Level Security) แต่ละบัญชีเข้าถึงได้เฉพาะข้อมูลของตนเองเท่านั้น

5. สิทธิ์ของผู้ใช้
ผู้ใช้มีสิทธิ์ขอดู แก้ไข หรือลบข้อมูลส่วนตัวได้โดยติดต่อ proppsyth@gmail.com

6. การเก็บรักษาข้อมูล
ข้อมูลจะถูกเก็บรักษาตลอดระยะเวลาที่ใช้งาน และ 1 ปีหลังจากยกเลิกบัญชี เว้นแต่กฎหมายกำหนดเป็นอย่างอื่น

มีผลบังคับใช้ตั้งแต่ วันที่ 1 มกราคม 2568`

function PolicyModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition">
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  // ID card
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState('')
  const idCardRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    prefix: '',
    prefixOther: '',
    first_name_th: '',
    last_name_th: '',
    nickname: '',
    phone: '',
    line_id: '',
    position: '',
    company_name: '',
    address_no: '',
    address_road: '',
    province: '',
    district: '',
    subdistrict: '',
    zip: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function getPrefix() {
    return form.prefix === 'อื่นๆ' ? form.prefixOther : form.prefix
  }

  function getFullName() {
    return [getPrefix(), form.first_name_th, form.last_name_th].filter(Boolean).join(' ')
  }

  function handleIdCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIdCardFile(file)
    const url = URL.createObjectURL(file)
    setIdCardPreview(url)
    e.target.value = ''
  }

  function removeIdCard() {
    setIdCardFile(null)
    if (idCardPreview) URL.revokeObjectURL(idCardPreview)
    setIdCardPreview('')
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.prefix) { setError('กรุณาเลือกคำนำหน้า'); return }
    if (form.prefix === 'อื่นๆ' && !form.prefixOther.trim()) { setError('กรุณากรอกคำนำหน้า'); return }
    if (!form.first_name_th.trim()) { setError('กรุณากรอกชื่อ'); return }
    if (!form.last_name_th.trim()) { setError('กรุณากรอกนามสกุล'); return }
    if (!form.phone.trim()) { setError('กรุณากรอกเบอร์โทร'); return }
    if (!idCardFile) { setError('กรุณาแนบสำเนาบัตรประชาชน'); return }
    if (!form.agreedToTerms) { setError('กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว'); return }
    if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return }
    if (form.password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: getFullName(),
          phone: form.phone,
          position: form.position,
          company_name: form.company_name,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message.toLowerCase().includes('already registered')
        ? 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ'
        : signUpError.message)
      setLoading(false)
      return
    }

    // Supabase returns success but empty identities when email is already registered
    if (signUpData.user?.identities?.length === 0) {
      setError('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบ')
      setLoading(false)
      return
    }

    setStep(2)
    setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (otp.length < 6) { setError('กรุณากรอกรหัส OTP ให้ครบ'); return }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: form.email,
        token: otp,
        type: 'signup',
      })

      if (verifyError) {
        setError('รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่')
        setLoading(false)
        return
      }

      // Upload ID card
      let idCardUrl: string | null = null
      if (idCardFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const ext = idCardFile.name.split('.').pop() ?? 'jpg'
          const path = `id-cards/${user.id}-${Date.now()}.${ext}`
          const { data: upData } = await supabase.storage.from('documents').upload(path, idCardFile, { upsert: true })
          if (upData) {
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(upData.path)
            idCardUrl = publicUrl
          }
        }
      }

      const result = await updateRegisterProfile({
        name: getFullName(),
        nickname: form.nickname || null,
        phone: form.phone,
        line_id: form.line_id || null,
        position: form.position || null,
        company_name: form.company_name || null,
        address_no: form.address_no || null,
        address_road: form.address_road || null,
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

      await supabase.auth.signOut()
      setStep(3)
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCooldown) return
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email: form.email })
    setResendCooldown(true)
    setTimeout(() => setResendCooldown(false), 60000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      {showTerms && <PolicyModal title="ข้อกำหนดการใช้งาน" content={TERMS_CONTENT} onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PolicyModal title="นโยบายความเป็นส่วนตัว" content={PRIVACY_CONTENT} onClose={() => setShowPrivacy(false)} />}

      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <Image src="/logo/logo.png" alt="Proppsy" width={140} height={50} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {(['กรอกข้อมูล', 'ยืนยัน OTP', 'สำเร็จ'] as const).map((label, i) => {
              const s = (i + 1) as Step
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`h-0.5 w-8 transition ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
            <span className="ml-1 text-xs text-gray-400">
              {step === 1 ? 'กรอกข้อมูล' : step === 2 ? 'ยืนยัน OTP' : 'สำเร็จ'}
            </span>
          </div>

          {/* ─── Step 1: Form ─── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <h1 className="text-xl font-semibold text-gray-900">ลงทะเบียน</h1>

              {/* ชื่อ */}
              <section className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ข้อมูลส่วนตัว</p>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">คำนำหน้า *</p>
                  <div className="flex flex-wrap gap-2">
                    {PREFIX_OPTIONS.map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setForm(f => ({ ...f, prefix: opt, prefixOther: '' }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${form.prefix === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                        {opt}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, prefix: 'อื่นๆ' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${form.prefix === 'อื่นๆ' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                      อื่นๆ
                    </button>
                  </div>
                  {form.prefix === 'อื่นๆ' && (
                    <input type="text" value={form.prefixOther}
                      onChange={e => setForm(f => ({ ...f, prefixOther: e.target.value }))}
                      placeholder="ระบุคำนำหน้า" className={`${INPUT_CLS} mt-2`} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ *</label>
                    <input type="text" value={form.first_name_th} onChange={set('first_name_th')} required placeholder="ชื่อ" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล *</label>
                    <input type="text" value={form.last_name_th} onChange={set('last_name_th')} required placeholder="นามสกุล" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อเล่น</label>
                    <input type="text" value={form.nickname} onChange={set('nickname')} placeholder="ชื่อเล่น" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร *</label>
                    <input type="tel" value={form.phone} onChange={set('phone')} required placeholder="08x-xxx-xxxx" inputMode="tel" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">LINE ID</label>
                    <input type="text" value={form.line_id} onChange={set('line_id')} placeholder="@line_id" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ตำแหน่ง *</label>
                    <input type="text" value={form.position} onChange={set('position')} required placeholder="Agent, Broker…" className={INPUT_CLS} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">บริษัท / ทีม</label>
                    <input type="text" value={form.company_name} onChange={set('company_name')} placeholder="ชื่อบริษัทหรือทีม" className={INPUT_CLS} />
                  </div>
                </div>
              </section>

              {/* ที่อยู่ */}
              <section className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ที่อยู่</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                    <input type="text" value={form.address_no} onChange={set('address_no')} placeholder="123/4" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ถนน / ซอย</label>
                    <input type="text" value={form.address_road} onChange={set('address_road')} placeholder="ถนน / ซอย" className={INPUT_CLS} />
                  </div>
                </div>
                <AddressSelector
                  province={form.province} district={form.district}
                  subdistrict={form.subdistrict} zip={form.zip}
                  onChange={(field, value) => setForm(f => ({ ...f, [field]: value }))}
                />
              </section>

              {/* สำเนาบัตรประชาชน */}
              <section className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">สำเนาบัตรประชาชน *</p>
                <p className="text-xs text-gray-400">แนบรูปบัตรประชาชนเพื่อให้แอดมินตรวจสอบตัวตนก่อนอนุมัติ</p>

                <input ref={idCardRef} type="file" accept="image/*" className="hidden" onChange={handleIdCardChange} />

                {idCardPreview ? (
                  <div className="relative w-full aspect-video max-h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={idCardPreview} alt="สำเนาบัตร" className="w-full h-full object-contain" />
                    <button type="button" onClick={removeIdCard}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => idCardRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition">
                    <FileImage className="w-8 h-8 text-gray-300" />
                    <span className="text-sm text-gray-500">แตะเพื่อเลือกรูปบัตรประชาชน</span>
                    <span className="text-xs text-gray-400">JPG, PNG (ไฟล์ไม่เกิน 5 MB)</span>
                  </button>
                )}
              </section>

              {/* บัญชี */}
              <section className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ข้อมูลบัญชี</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">อีเมล *</label>
                  <input type="email" value={form.email} onChange={set('email')} required placeholder="your@email.com" autoComplete="email" className={INPUT_CLS} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">รหัสผ่าน *</label>
                    <input type="password" value={form.password} onChange={set('password')} required minLength={8} placeholder="อย่างน้อย 8 ตัว" autoComplete="new-password" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ยืนยันรหัสผ่าน *</label>
                    <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required placeholder="••••••••" autoComplete="new-password" className={INPUT_CLS} />
                  </div>
                </div>
              </section>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.agreedToTerms}
                  onChange={e => setForm(f => ({ ...f, agreedToTerms: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0" />
                <span className="text-xs text-gray-500 leading-relaxed">
                  ฉันยอมรับ{' '}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 hover:underline">
                    ข้อกำหนดการใช้งาน
                  </button>
                  {' '}และ{' '}
                  <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-600 hover:underline">
                    นโยบายความเป็นส่วนตัว
                  </button>
                  {' '}รวมถึงยินยอมให้ Proppsy เก็บข้อมูลส่วนบุคคลเพื่อใช้ในระบบ
                </span>
              </label>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl text-sm transition">
                {loading ? 'กำลังส่ง OTP...' : <>ส่ง OTP ยืนยัน <ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* ─── Step 2: OTP ─── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">ยืนยันอีเมล</h2>
                <p className="text-sm text-gray-500">
                  ระบบส่งรหัส OTP ไปที่{' '}
                  <span className="font-medium text-gray-700">{form.email}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">รหัส OTP</label>
                <input type="text" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="00000000" inputMode="numeric" maxLength={8} autoFocus
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl text-sm transition">
                {loading ? 'กำลังยืนยัน...' : 'ยืนยัน OTP'}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <button type="button" onClick={() => { setStep(1); setOtp(''); setError('') }}
                  className="hover:text-gray-600">← แก้ไขข้อมูล</button>
                <button type="button" onClick={handleResend} disabled={resendCooldown}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition">
                  <RefreshCw className="w-3 h-3" />
                  {resendCooldown ? 'ส่งแล้ว (รอ 60 วิ)' : 'ส่งรหัสใหม่'}
                </button>
              </div>
            </form>
          )}

          {/* ─── Step 3: Success ─── */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">ลงทะเบียนสำเร็จ!</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  บัญชีของคุณพร้อมใช้งานแล้ว<br />
                  เข้าสู่ระบบด้วยอีเมล{' '}
                  <span className="font-medium text-gray-700">{form.email}</span>{' '}
                  ได้เลย
                </p>
              </div>
              <Link href="/login"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition text-center">
                ไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          )}

          {step < 3 && (
            <p className="mt-5 text-center text-sm text-gray-500">
              มีบัญชีแล้ว?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">ลงชื่อเข้าใช้</Link>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">Real Estate Agent Management Platform</p>
      </div>
    </div>
  )
}
