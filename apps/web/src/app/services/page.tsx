import Link from 'next/link'
import { ArrowLeft, Check, Building2, Users, FileText, TrendingUp, Calendar, Zap, Brain, Camera, PenLine, BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PublicNav from '@/components/shared/PublicNav'

export const metadata: Metadata = { title: 'บริการของเรา — Proppsy' }

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

const PLANS = [
  {
    name: 'Starter',
    nameEn: 'ทดลองใช้',
    monthly: 0,
    yearly: 0,
    highlight: false,
    badge: '',
    color: 'gray',
    features: [
      'จัดการทรัพย์ได้สูงสุด 10 รายการ',
      'ออกสัญญา 5 ฉบับ / เดือน',
      '1 บัญชีเอเจนต์',
      'Photo Gallery',
      'ปฏิทินนัดหมาย',
    ],
    missing: ['AI Smart Paste', 'AI OCR บัตรประชาชน', 'Public Marketplace', 'ลายเซ็นอิเล็กทรอนิกส์', 'รายงานคอมมิชชัน'],
    cta: 'ทดลองใช้ฟรี',
    ctaHref: '/register',
  },
  {
    name: 'Professional',
    nameEn: 'สำหรับเอเจนต์เดี่ยว',
    monthly: 990,
    yearly: 8900,
    highlight: true,
    badge: 'แนะนำ',
    color: 'blue',
    features: [
      'ทรัพย์ไม่จำกัด',
      'สัญญาไม่จำกัด',
      '1 บัญชีเอเจนต์',
      'AI Smart Paste',
      'AI OCR บัตรประชาชน',
      'Public Marketplace Listing',
      'ลายเซ็นอิเล็กทรอนิกส์',
      'รายงานคอมมิชชัน',
      'PDF สัญญาภาษาไทยครบชุด (9 ประเภท)',
    ],
    missing: [],
    cta: 'เริ่มใช้งาน',
    ctaHref: '/register',
  },
  {
    name: 'Business',
    nameEn: 'สำหรับทีมและบริษัท',
    monthly: 2990,
    yearly: 26900,
    highlight: false,
    badge: '',
    color: 'purple',
    features: [
      'ทุกอย่างใน Professional',
      'สูงสุด 5 บัญชีเอเจนต์',
      'บัญชีผู้จัดการทีม (Manager)',
      'รายงานภาพรวมทีม',
      'คอมมิชชันแยกรายเอเจนต์',
      'Priority Support',
    ],
    missing: [],
    cta: 'ติดต่อเรา',
    ctaHref: '/contact',
  },
]

const FEATURES = [
  { icon: Building2, title: 'จัดการทรัพย์สิน', desc: 'บันทึกรายละเอียดทรัพย์ รูปภาพ ราคา เงื่อนไข พร้อม Photo Gallery สวยงาม' },
  { icon: Brain, title: 'AI Smart Paste', desc: 'Paste ข้อความจาก Line หรือ Chat ใดก็ได้ AI จะแยกแยะข้อมูลทรัพย์ให้อัตโนมัติ' },
  { icon: Camera, title: 'AI OCR บัตรประชาชน', desc: 'ถ่ายรูปบัตรประชาชน ระบบจะสกัดชื่อ เลขบัตร ที่อยู่ ให้อัตโนมัติ' },
  { icon: FileText, title: 'สัญญาครบ 9 ประเภท', desc: 'สัญญาเช่า จอง ใบเสร็จ คอมมิชชัน ต่ออายุ Co-Agent ออก PDF ภาษาไทยในคลิกเดียว' },
  { icon: PenLine, title: 'ลายเซ็นอิเล็กทรอนิกส์', desc: 'เซ็นชื่อออนไลน์ผ่านมือถือหรืออัปโหลดรูป ใช้แนบในสัญญา PDF อัตโนมัติ' },
  { icon: Calendar, title: 'ปฏิทินนัดหมาย', desc: 'จัดการนัดดูห้อง นัดทำสัญญา สัญญาหมดอายุ ในปฏิทินสีเดียว 3 สถานะ' },
  { icon: TrendingUp, title: 'ติดตามคอมมิชชัน', desc: 'ดูรายได้รายเดือน รายปี พร้อมกราฟแท่ง วางแผนการเงินได้ง่าย' },
  { icon: Users, title: 'จัดการผู้ติดต่อ', desc: 'เก็บข้อมูลเจ้าของทรัพย์และลูกค้า พร้อมประวัติสัญญาที่ผ่านมา' },
  { icon: BarChart3, title: 'ภาพรวม Dashboard', desc: 'KPI สำคัญ จำนวนทรัพย์ สัญญา คอมมิชชันรวม ดูได้ทันทีที่หน้าแรก' },
]

export default async function ServicesPage() {
  const supabase = await createClient()

  const [
    { count: contractCount },
    { count: agentCount },
    { count: stockCount },
  ] = await Promise.all([
    supabase.from('contracts').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
    supabase.from('stock').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">บริการของ Proppsy</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            ระบบจัดการอสังหาริมทรัพย์ครบวงจร ออกแบบเพื่อเอเจนต์ไทย
            ลดงานเอกสาร เพิ่มเวลาปิดดีล
          </p>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: 'สัญญาที่ออกแล้ว', value: contractCount ?? 0, unit: 'ฉบับ', color: 'blue' },
            { label: 'เอเจนต์ที่ใช้งาน', value: agentCount ?? 0, unit: 'คน', color: 'green' },
            { label: 'ทรัพย์ในระบบ', value: stockCount ?? 0, unit: 'รายการ', color: 'purple' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 text-center">
              <p className={`text-2xl sm:text-3xl font-bold text-${s.color}-600`}>{fmt(s.value)}</p>
              <p className="text-xs text-gray-500 mt-1">{s.unit}</p>
              <p className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">ฟีเจอร์ทั้งหมด</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">แพ็กเกจราคา</h2>
          <p className="text-sm text-gray-400 text-center mb-8">* ราคาสามารถเปลี่ยนแปลงได้ตามการพัฒนาระบบ</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
                  plan.highlight ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100'
                }`}
              >
                {plan.badge && (
                  <div className="bg-blue-600 text-white text-xs font-semibold text-center py-1.5">
                    {plan.badge}
                  </div>
                )}
                <div className="p-6 flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mb-4">{plan.nameEn}</p>

                  {plan.monthly === 0 ? (
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">ฟรี</span>
                      <p className="text-xs text-gray-400 mt-1">ทดลองใช้ 30 วัน</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div>
                        <span className="text-3xl font-bold text-gray-900">฿{fmt(plan.monthly)}</span>
                        <span className="text-sm text-gray-400">/เดือน</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">หรือ ฿{fmt(plan.yearly)}/ปี</span>
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          ประหยัด {Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-300 line-through">
                        <span className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-center">–</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition ${
                      plan.highlight
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            ต้องการแพ็กเกจพิเศษสำหรับองค์กร?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">ติดต่อเรา</Link>
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">เริ่มใช้งานใน 3 ขั้นตอน</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'ลงทะเบียน', desc: 'กรอกข้อมูลและยืนยัน OTP ทางอีเมล รอแอดมินอนุมัติภายใน 1 วันทำการ' },
              { step: '2', title: 'เพิ่มทรัพย์', desc: 'บันทึกทรัพย์ด้วย AI Smart Paste หรือกรอกเอง อัปโหลดรูปได้ไม่จำกัด' },
              { step: '3', title: 'ออกสัญญา', desc: 'เลือกประเภทสัญญา ระบบสร้าง PDF ภาษาไทยพร้อมลายเซ็นให้ทันที' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">พร้อมเริ่มใช้งาน?</h2>
          <p className="text-sm text-gray-500 mb-6">ลงทะเบียนวันนี้ ทดลองใช้ฟรี 30 วัน ไม่ต้องใช้บัตรเครดิต</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/register" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition text-sm">
              ลงทะเบียนฟรี
            </Link>
            <Link href="/contact" className="px-8 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition text-sm">
              ติดต่อสอบถาม
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 mt-8 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>
    </div>
  )
}
