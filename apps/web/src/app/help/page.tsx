import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, ArrowLeft } from 'lucide-react'
import PublicNav from '@/components/shared/PublicNav'

export const metadata: Metadata = { title: 'คู่มือ & FAQ — Proppsy' }

/* ─── Accordion Item ─── */
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-gray-100 last:border-0">
      <summary className="flex items-center justify-between gap-3 py-4 px-1 cursor-pointer list-none select-none">
        <span className="text-sm font-medium text-gray-800 leading-snug">{q}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="pb-4 px-1 text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </details>
  )
}

/* ─── Guide Item ─── */
function Guide({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <details className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none select-none">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 border-t border-gray-50 pt-4 text-sm text-gray-600 leading-relaxed space-y-3">
        {children}
      </div>
    </details>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        {n}
      </span>
      <span>{text}</span>
    </div>
  )
}

function Tag({ text }: { text: string }) {
  return (
    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full mr-1 mb-1">
      {text}
    </span>
  )
}

/* ─── Page ─── */
export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">ศูนย์ช่วยเหลือ</h1>
          <p className="text-sm text-gray-500">คู่มือการใช้งานและคำถามที่พบบ่อยของ Proppsy</p>
        </div>

        {/* Quick Start */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 mb-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">เริ่มต้นใช้งาน 4 ขั้นตอน</p>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { n: 1, icon: '📝', text: 'สมัครสมาชิก รอแอดมินอนุมัติ' },
              { n: 2, icon: '🏠', text: 'เพิ่มทรัพย์ด้วย AI หรือกรอกเอง' },
              { n: 3, icon: '👤', text: 'เพิ่มเจ้าของและลูกค้า' },
              { n: 4, icon: '📄', text: 'ออกสัญญา PDF ภาษาไทย' },
            ].map(s => (
              <div key={s.n} className="flex sm:flex-col items-center sm:items-start gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.n}
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
                  <span className="text-lg">{s.icon}</span>
                  <p className="text-xs text-blue-100 leading-snug">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── คู่มือการใช้งาน ─── */}
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>📖</span> คู่มือการใช้งาน
        </h2>
        <div className="space-y-2 mb-10">

          <Guide title="การเพิ่มและจัดการทรัพย์" icon="🏠">
            <Step n={1} text="ไปที่เมนู ทรัพย์ → กดปุ่ม เพิ่มทรัพย์ใหม่" />
            <Step n={2} text="เลือกระหว่าง AI Smart Paste (วางข้อความจาก Line) หรือกรอกข้อมูลเอง" />
            <Step n={3} text="กรอกรายละเอียด: ประเภทประกาศ (เช่า/ขาย/ทั้งคู่), ประเภทห้อง, ราคา, ชั้น, ขนาด" />
            <Step n={4} text="เลือกโครงการและเจ้าของทรัพย์ที่เชื่อมโยง" />
            <Step n={5} text="อัปโหลดรูปภาพห้อง (รองรับ JPG, PNG ไม่จำกัดจำนวน)" />
            <Step n={6} text="กด บันทึก — ทรัพย์ที่มีสถานะ ว่าง จะแสดงในหน้าสาธารณะทันที" />
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
              💡 สถานะทรัพย์: <strong>ว่าง</strong> = แสดงสาธารณะ | <strong>เช่าแล้ว / ขายแล้ว / ไม่พร้อม</strong> = ซ่อนจากหน้าสาธารณะ
            </div>
          </Guide>

          <Guide title="AI Smart Paste — เพิ่มทรัพย์ใน 10 วินาที" icon="🤖">
            <Step n={1} text="คัดลอกข้อความประกาศทรัพย์จาก Line, Facebook หรือที่ใดก็ได้" />
            <Step n={2} text="ไปที่ ทรัพย์ → เพิ่มทรัพย์ใหม่ → วางข้อความในช่อง AI Smart Paste" />
            <Step n={3} text="กด วิเคราะห์ด้วย AI — ระบบจะประมวลผลภายใน 2-3 วินาที" />
            <Step n={4} text="AI จะเติมข้อมูล: ชื่อโครงการ, ราคา, ประเภทห้อง, ขนาด, ชั้น, สถานะ, เจ้าของ" />
            <Step n={5} text="ตรวจสอบและแก้ไขข้อมูลที่ AI เติมให้ก่อนกดบันทึก" />
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
              💡 ยิ่งข้อความมีรายละเอียดครบ (ราคา, ขนาด, ชั้น, ชื่อโครงการ, เบอร์โทรเจ้าของ) AI ยิ่งเติมข้อมูลได้แม่นยำขึ้น
            </div>
            <p className="text-xs text-gray-400">⚠️ ฟีเจอร์นี้ใช้ได้เฉพาะแพ็กเกจ Professional และ Business</p>
          </Guide>

          <Guide title="AI OCR บัตรประชาชน — สแกนข้อมูลอัตโนมัติ" icon="🪪">
            <Step n={1} text="ไปที่ เจ้าของทรัพย์ หรือ ลูกค้า → เพิ่มใหม่" />
            <Step n={2} text="กดปุ่ม สแกน AI ที่หัวฟอร์ม" />
            <Step n={3} text="ถ่ายรูปบัตรประชาชน หรืออัปโหลดรูปจากเครื่อง (ให้บัตรชัดเจน ไม่เบลอ)" />
            <Step n={4} text="AI จะดึงข้อมูล: ชื่อ-นามสกุล, เลขบัตร 13 หลัก, วันเกิด, ที่อยู่ตามบัตร" />
            <Step n={5} text="ตรวจสอบความถูกต้องก่อนกดบันทึก — ควรเปรียบเทียบกับบัตรจริงเสมอ" />
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
              💡 ถ่ายรูปในที่มีแสงสว่างเพียงพอ วางบัตรให้ตรง ไม่มีเงาทับตัวอักษร
            </div>
          </Guide>

          <Guide title="การออกสัญญา PDF ภาษาไทย" icon="📄">
            <Step n={1} text="ไปที่เมนู สัญญา → กด สร้างสัญญาใหม่" />
            <Step n={2} text="ขั้นตอนที่ 1: เลือกประเภทสัญญา (9 ประเภท)" />
            <Step n={3} text="ขั้นตอนที่ 2: เลือกทรัพย์, เจ้าของทรัพย์, ลูกค้า" />
            <Step n={4} text="ขั้นตอนที่ 3: กรอกรายละเอียด เช่น วันที่, ค่าเช่า, เงินมัดจำ, ค่าคอมมิชชัน" />
            <Step n={5} text="ขั้นตอนที่ 4: ตรวจสอบข้อมูล → กด ดาวน์โหลด PDF" />
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {['สัญญาเช่า','สัญญาจอง','ใบแจ้งหนี้จอง','ใบเสร็จจอง','ใบแจ้งหนี้มัดจำ','ใบเสร็จมัดจำ','ยืนยันคอมมิชชัน','ต่ออายุสัญญา','Co-Agent'].map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 rounded-lg px-2 py-1 text-center">{t}</span>
              ))}
            </div>
          </Guide>

          <Guide title="ลายเซ็นอิเล็กทรอนิกส์" icon="✍️">
            <div className="font-medium text-gray-700 text-sm mb-1">ลายเซ็นของคุณ (เอเจนต์)</div>
            <Step n={1} text="ไปที่ โปรไฟล์ของฉัน (⚙️) → ส่วน ลายเซ็น" />
            <Step n={2} text="เลือก วาดออนไลน์ (ลากนิ้วบนหน้าจอ) หรือ อัปโหลดไฟล์ (PNG/JPG)" />
            <Step n={3} text="กด บันทึก — ลายเซ็นจะถูกแนบใน PDF สัญญาทุกฉบับโดยอัตโนมัติ" />
            <div className="font-medium text-gray-700 text-sm mb-1 mt-2">ลายเซ็นเจ้าของทรัพย์</div>
            <Step n={1} text="ไปที่ เจ้าของทรัพย์ → เลือกรายชื่อ" />
            <Step n={2} text="เลื่อนลงหาส่วน ลายเซ็น → วาดหรืออัปโหลด" />
          </Guide>

          <Guide title="ปฏิทินและนัดหมาย" icon="📅">
            <Step n={1} text="ไปที่เมนู นัดหมาย & ปฏิทิน" />
            <Step n={2} text="สลับมุมมอง: รายเดือน หรือ รายสัปดาห์ (ปุ่มสลับด้านบนขวา)" />
            <Step n={3} text="กด + เพิ่มนัดหมาย → กรอกประเภท, ทรัพย์, ลูกค้า, วันเวลา, หมายเหตุ" />
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1" />
                <p className="text-xs text-blue-700 font-medium">นัดดูห้อง</p>
              </div>
              <div className="bg-green-50 rounded-xl p-2.5 text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1" />
                <p className="text-xs text-green-700 font-medium">นัดทำสัญญา</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                <div className="w-3 h-3 bg-orange-400 rounded-full mx-auto mb-1" />
                <p className="text-xs text-orange-700 font-medium">สัญญาหมดอายุ</p>
              </div>
            </div>
          </Guide>

          <Guide title="ติดตามคอมมิชชัน" icon="💰">
            <Step n={1} text="ไปที่เมนู คอมมิชชัน" />
            <Step n={2} text="เลือกปีที่ต้องการดู (ค่าเริ่มต้น = ปีปัจจุบัน)" />
            <Step n={3} text="กราฟแท่งแสดงยอดรายเดือน ยอดรวมแสดงที่ด้านบน" />
            <p className="text-xs text-gray-500">ข้อมูลคอมมิชชันดึงมาจากสัญญาที่มีการกรอก commission_net ไว้ในขั้นตอนสร้างสัญญา</p>
          </Guide>

        </div>

        {/* ─── คำถามที่พบบ่อย ─── */}
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>❓</span> คำถามที่พบบ่อย
        </h2>

        {/* บัญชีและการเข้าสู่ระบบ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">บัญชีและการเข้าสู่ระบบ</p>
          <Faq q="สมัครสมาชิกแล้วทำไมเข้าระบบไม่ได้?">
            <p>บัญชีของคุณต้องได้รับการ <strong>อนุมัติจากแอดมิน</strong> ก่อนจึงจะเข้าระบบได้ โดยปกติใช้เวลาไม่เกิน 1 วันทำการ</p>
            <p>หากรออนุมัติเกิน 1 วันทำการกรุณาติดต่อแอดมินโดยตรง</p>
          </Faq>
          <Faq q="ลืมรหัสผ่านทำอย่างไร?">
            <Step n={1} text='ไปที่หน้า เข้าสู่ระบบ → กด "ลืมรหัสผ่าน?"' />
            <Step n={2} text="กรอกอีเมลที่สมัครไว้ → กด ส่งรหัส OTP" />
            <Step n={3} text="เปิดอีเมล รับรหัส OTP 6 หลัก (อาจอยู่ใน Spam)" />
            <Step n={4} text="ไปที่หน้า ตั้งรหัสผ่านใหม่ → กรอก OTP + รหัสผ่านใหม่ → ยืนยัน" />
          </Faq>
          <Faq q="ไม่ได้รับอีเมล OTP ยืนยันการสมัครจะทำอย่างไร?">
            <p>1. ตรวจสอบโฟลเดอร์ <strong>Spam / Junk</strong> ในอีเมลของคุณ</p>
            <p>2. รอ 2-3 นาทีแล้วลองใหม่</p>
            <p>3. หากยังไม่ได้รับให้ติดต่อแอดมินเพื่อช่วยยืนยันบัญชีให้</p>
          </Faq>
          <Faq q="จะเปลี่ยนรหัสผ่านหรือข้อมูลโปรไฟล์ได้ที่ไหน?">
            <p>ไปที่เมนู <strong>โปรไฟล์ของฉัน (⚙️)</strong> ด้านล่างซ้าย สามารถแก้ไข: ชื่อ, นามแฝง, เบอร์โทร, LINE ID, ตำแหน่ง, ลายเซ็น และรหัสผ่านได้ทั้งหมด</p>
          </Faq>
          <Faq q="บัญชีถูก Reject จะทำอย่างไร?">
            <p>กรุณาติดต่อแอดมินโดยตรงทาง <strong>อีเมลหรือ LINE</strong> เพื่อสอบถามเหตุผลและส่งเอกสารเพิ่มเติมตามที่แอดมินแนะนำ</p>
          </Faq>
        </div>

        {/* ทรัพย์สิน */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">ทรัพย์สิน</p>
          <Faq q="เพิ่มทรัพย์ได้สูงสุดกี่รายการ?">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><Tag text="Starter" /><span>สูงสุด 10 รายการ</span></div>
              <div className="flex items-center gap-2"><Tag text="Professional" /><span>ไม่จำกัด</span></div>
              <div className="flex items-center gap-2"><Tag text="Business" /><span>ไม่จำกัด</span></div>
            </div>
          </Faq>
          <Faq q="จะแก้ไขข้อมูลทรัพย์ที่บันทึกไปแล้วได้อย่างไร?">
            <p>ไปที่ <strong>ทรัพย์</strong> → เลือกทรัพย์ที่ต้องการ → กดปุ่ม <strong>แก้ไข (✏️)</strong> ด้านบนขวาของหน้ารายละเอียด</p>
          </Faq>
          <Faq q="สถานะทรัพย์มีอะไรบ้างและส่งผลอย่างไร?">
            <div className="space-y-1.5">
              <div><strong>ว่าง (available)</strong> — แสดงในหน้าสาธารณะ ลูกค้าทั่วไปมองเห็น</div>
              <div><strong>เช่าแล้ว (rented)</strong> — ซ่อนจากหน้าสาธารณะ</div>
              <div><strong>ขายแล้ว (sold)</strong> — ซ่อนจากหน้าสาธารณะ</div>
              <div><strong>ไม่พร้อม (unavailable)</strong> — ซ่อนจากหน้าสาธารณะ</div>
            </div>
          </Faq>
          <Faq q="อัปโหลดรูปทรัพย์ได้นามสกุลและขนาดเท่าไร?">
            <p>รองรับ <strong>JPG, PNG, WEBP</strong> ขนาดแนะนำไม่เกิน 5MB ต่อรูป อัปโหลดได้หลายรูปพร้อมกัน สามารถลากเรียงลำดับได้</p>
          </Faq>
          <Faq q="จะลบทรัพย์ออกจากระบบได้อย่างไร?">
            <p>เข้าหน้ารายละเอียดทรัพย์ → เลื่อนลงด้านล่างสุด → กดปุ่ม <strong>ลบทรัพย์</strong> → ยืนยัน</p>
            <p className="text-xs text-red-500">⚠️ การลบทรัพย์ไม่สามารถกู้คืนได้ และจะลบรูปภาพทั้งหมดด้วย</p>
          </Faq>
        </div>

        {/* สัญญาและเอกสาร */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">สัญญาและเอกสาร</p>
          <Faq q="สัญญามีกี่ประเภทและแต่ละประเภทคืออะไร?">
            <p>มีทั้งหมด <strong>9 ประเภท</strong>:</p>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {['สัญญาเช่า','สัญญาจอง','ใบแจ้งหนี้จอง','ใบเสร็จจอง','ใบแจ้งหนี้มัดจำ','ใบเสร็จมัดจำ','หนังสือยืนยันคอมมิชชัน','สัญญาต่ออายุ','สัญญา Co-Agent'].map(t => (
                <span key={t} className="text-xs bg-gray-50 rounded-lg px-2.5 py-1.5 text-gray-600">{t}</span>
              ))}
            </div>
          </Faq>
          <Faq q="ออกสัญญาแล้วสามารถแก้ไขได้ไหม?">
            <p>ได้ ตราบใดที่สถานะยังเป็น <strong>ร่าง (draft)</strong> สามารถกลับมาแก้ไขได้ตลอด</p>
            <p>เมื่อเปลี่ยนสถานะเป็น <strong>เซ็นแล้ว (signed)</strong> จะไม่สามารถแก้ไขเนื้อหาได้อีก</p>
          </Faq>
          <Faq q="ดาวน์โหลด PDF สัญญาได้จากที่ไหน?">
            <p>ไปที่ <strong>สัญญา</strong> → เลือกสัญญาที่ต้องการ → กดปุ่ม <strong>ดาวน์โหลด PDF</strong> สัญญาออกมาเป็นภาษาไทยพร้อมลายเซ็น ตัวเลขเป็นตัวหนังสืออัตโนมัติ</p>
          </Faq>
          <Faq q="แพ็กเกจ Starter ออกสัญญาได้กี่ฉบับต่อเดือน?">
            <p>สูงสุด <strong>5 ฉบับต่อเดือน</strong> เมื่อครบโควต้าระบบจะแจ้งและแนะนำให้อัปเกรดแพ็กเกจ</p>
            <p>แพ็กเกจ Professional และ Business ออกสัญญาได้ไม่จำกัด</p>
          </Faq>
          <Faq q="จะใส่ลายเซ็นในสัญญา PDF อย่างไร?">
            <p><strong>ลายเซ็นตัวเอง:</strong> โปรไฟล์ → ส่วนลายเซ็น → วาดหรืออัปโหลด → บันทึก</p>
            <p><strong>ลายเซ็นเจ้าของ:</strong> เจ้าของทรัพย์ → เลือกรายชื่อ → ส่วนลายเซ็น</p>
            <p>ลายเซ็นจะแนบใน PDF อัตโนมัติเมื่อสร้างสัญญา</p>
          </Faq>
        </div>

        {/* AI ฟีเจอร์ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">AI ฟีเจอร์</p>
          <Faq q="AI Smart Paste รองรับข้อความแบบไหนได้บ้าง?">
            <p>รองรับข้อความทุกรูปแบบ เช่น:</p>
            <div className="space-y-1 mt-1">
              <div className="text-xs bg-gray-50 rounded-lg px-3 py-2">💬 ข้อความจาก Line กลุ่มบ้านเช่า</div>
              <div className="text-xs bg-gray-50 rounded-lg px-3 py-2">📢 ประกาศจาก Facebook / Kaidee / DDProperty</div>
              <div className="text-xs bg-gray-50 rounded-lg px-3 py-2">📝 บันทึกย่อที่จดเองจากการคุยโทรศัพท์</div>
            </div>
            <p className="mt-2">ยิ่งข้อความมีรายละเอียดครบ (ราคา, ขนาด, ชั้น, โครงการ, เบอร์เจ้าของ) AI ยิ่งแม่นยำ</p>
          </Faq>
          <Faq q="AI OCR บัตรประชาชนแม่นยำแค่ไหน?">
            <p>แม่นยำสูงเมื่อ: รูปชัด ไม่เบลอ แสงสว่างพอ ไม่มีเงาทับ วางบัตรให้ตรง</p>
            <p className="text-red-500 text-xs">⚠️ ควรตรวจสอบข้อมูลที่ AI ดึงมาทุกครั้งก่อนบันทึก โดยเฉพาะ เลขบัตร 13 หลัก และวันเกิด</p>
          </Faq>
          <Faq q="AI มีค่าใช้จ่ายเพิ่มเติมไหม?">
            <p>ไม่มีค่าใช้จ่ายเพิ่มเติม AI รวมอยู่ในแพ็กเกจ <strong>Professional</strong> และ <strong>Business</strong> แล้ว</p>
            <p>แพ็กเกจ <strong>Starter</strong> ไม่รองรับฟีเจอร์ AI</p>
          </Faq>
        </div>

        {/* แพ็กเกจและการชำระเงิน */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">แพ็กเกจและการชำระเงิน</p>
          <Faq q="แพ็กเกจ Starter จำกัดอะไรบ้าง?">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-red-500"><span>✗</span><span>จัดการทรัพย์สูงสุด 10 รายการ</span></div>
              <div className="flex items-center gap-2 text-red-500"><span>✗</span><span>ออกสัญญาสูงสุด 5 ฉบับต่อเดือน</span></div>
              <div className="flex items-center gap-2 text-red-500"><span>✗</span><span>ไม่มี AI Smart Paste และ AI OCR</span></div>
            </div>
          </Faq>
          <Faq q="จะอัปเกรดแพ็กเกจได้อย่างไร?">
            <Step n={1} text="ไปที่หน้า บริการของเรา (/services)" />
            <Step n={2} text='กดปุ่ม "ซื้อแพ็กเกจ" ของ Professional หรือ Business' />
            <Step n={3} text="เลือกรายเดือนหรือรายปี → ชำระด้วยบัตรเครดิต" />
            <Step n={4} text="แพ็กเกจเปิดใช้งานทันทีหลังชำระสำเร็จ" />
          </Faq>
          <Faq q="ชำระเงินด้วยอะไรได้บ้าง?">
            <p>ชำระผ่าน <strong>บัตรเครดิต / เดบิต</strong> (Visa, Mastercard) ผ่านระบบ Omise ปลอดภัยด้วย SSL 256-bit ไม่เก็บข้อมูลบัตรในระบบ</p>
          </Faq>
          <Faq q="แพ็กเกจที่ซื้อมีอายุนานแค่ไหน และต่ออายุอย่างไร?">
            <p><strong>รายเดือน:</strong> 1 เดือนนับจากวันที่ชำระ</p>
            <p><strong>รายปี:</strong> 1 ปีนับจากวันที่ชำระ (ประหยัดกว่ารายเดือน)</p>
            <p>เมื่อหมดอายุระบบจะปรับกลับเป็น Starter อัตโนมัติ ต้องชำระใหม่เพื่อต่ออายุ</p>
          </Faq>
        </div>

        {/* ติดต่อ */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-1">ไม่พบคำตอบที่ต้องการ?</p>
          <p className="text-xs text-gray-500 mb-3">ทีมงาน Proppsy พร้อมช่วยเหลือคุณ</p>
          <a href="/contact"
            className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            ติดต่อเรา
          </a>
        </div>

      </div>
    </div>
  )
}
