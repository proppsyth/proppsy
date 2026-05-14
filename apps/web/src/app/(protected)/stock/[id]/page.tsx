import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil, Calendar, Phone, Globe } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ownerDisplayName, stockDisplayTitle, DOC_TYPE_LABELS, STATUS_LABELS, formatRoomType } from '@/types'
import type { Stock, StockStatus, ListingType } from '@/types'
import PhotoGallery from './PhotoGallery'
import DeleteStockButton from './DeleteStockButton'
import PublishActions from './PublishActions'

export const metadata: Metadata = { title: 'รายละเอียดทรัพย์' }

const STATUS_COLORS: Record<StockStatus, string> = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  sold: 'bg-purple-100 text-purple-700',
  unavailable: 'bg-gray-100 text-gray-600',
}

const LISTING_LABELS: Record<ListingType, string> = {
  rent: 'ให้เช่า',
  sale: 'ขาย',
  both: 'ให้เช่า / ขาย',
}

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: stock }, { data: credit }] = await Promise.all([
    supabase
      .from('stock')
      .select('*, owner:owners(*), project:projects(*)')
      .eq('id', id)
      .eq('agent_uid', user.id)
      .single(),
    supabase
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (!stock) notFound()

  const s = stock as unknown as Stock
  const owner = s.owner
  const project = s.project
  const creditBalance = credit?.balance ?? 0

  const contractEndDate = s.contract_end_date
    ? new Date(s.contract_end_date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const createdDate = new Date(s.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="w-full p-4 lg:p-8 pt-6 max-w-5xl overflow-x-hidden">
      {/* Back + header */}
      <div className="mb-5">
        <Link href="/stock" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการทรัพย์
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-400 mb-0.5">{s.id}</p>
            <h1 className="text-xl font-bold text-gray-900 leading-snug break-words">
              {stockDisplayTitle(s)}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                {STATUS_LABELS[s.status]}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                {LISTING_LABELS[s.listing_type]}
              </span>
              {s.is_published && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                  <Globe className="w-3 h-3" />
                  เผยแพร่แล้ว
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 flex-shrink-0 flex-wrap justify-end">
            <PublishActions
              stockId={s.id}
              isPublished={s.is_published ?? false}
              isPremium={s.is_premium ?? false}
              currentBalance={creditBalance}
            />
            <Link
              href={`/stock/${s.id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              แก้ไข
            </Link>
            <DeleteStockButton stockId={s.id} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left column: photos + details */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Photo gallery */}
          <PhotoGallery urls={s.photo_urls ?? []} />

          {/* ราคา */}
          <Section title="ราคา">
            <div className="grid grid-cols-2 gap-4">
              {s.rent_price != null && (
                <InfoItem label="ค่าเช่า/เดือน" value={`฿${fmt(s.rent_price)}`} highlight />
              )}
              {s.sale_price != null && (
                <InfoItem label="ราคาขาย" value={`฿${fmt(s.sale_price)}`} highlight />
              )}
              {s.deposit > 0 && (
                <InfoItem
                  label="เงินมัดจำ"
                  value={`${s.deposit} เดือน${s.rent_price ? ` (฿${fmt(s.deposit * (s.rent_price ?? 0))})` : ''}`}
                />
              )}
              {s.contract_term > 0 && (
                <InfoItem label="ระยะสัญญา" value={`${s.contract_term} เดือน`} />
              )}
            </div>
          </Section>

          {/* รายละเอียด */}
          <Section title="รายละเอียดทรัพย์">
            <div className="grid grid-cols-2 gap-4">
              {s.project_name && <InfoItem label="โครงการ" value={s.project_name} />}
              {s.unit_no && <InfoItem label="ห้อง/ยูนิต" value={s.unit_no} />}
              {s.unit_name && <InfoItem label="ชื่อห้อง" value={s.unit_name} />}
              {s.building && <InfoItem label="อาคาร" value={s.building} />}
              {s.floor != null && <InfoItem label="ชั้น" value={`${s.floor}`} />}
              {s.room_type && <InfoItem label="ประเภทห้อง" value={formatRoomType(s.room_type)} />}
              {s.size_sqm != null && <InfoItem label="ขนาด" value={`${s.size_sqm} ตร.ม.`} />}
              {s.view_direction && <InfoItem label="ทิศ" value={s.view_direction} />}
            </div>
          </Section>

          {/* เฟอร์นิเจอร์ */}
          {s.furniture?.length > 0 && (
            <Section title="เฟอร์นิเจอร์">
              <div className="flex flex-wrap gap-2">
                {s.furniture.map(item => (
                  <Chip key={item} label={item} />
                ))}
              </div>
            </Section>
          )}

          {/* สิ่งอำนวยความสะดวก */}
          {s.facilities?.length > 0 && (
            <Section title="สิ่งอำนวยความสะดวก">
              <div className="flex flex-wrap gap-2">
                {s.facilities.map(item => (
                  <Chip key={item} label={item} color="blue" />
                ))}
              </div>
            </Section>
          )}

          {/* หมายเหตุ */}
          {s.notes && (
            <Section title="หมายเหตุ">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{s.notes}</p>
            </Section>
          )}
        </div>

        {/* Right column: owner, project, meta */}
        <div className="space-y-4 min-w-0">
          {/* เจ้าของทรัพย์ */}
          <Section title="เจ้าของทรัพย์">
            {owner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-semibold text-sm flex-shrink-0">
                    {ownerDisplayName(owner).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{ownerDisplayName(owner)}</p>
                    {owner.phone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {owner.phone}
                      </p>
                    )}
                  </div>
                </div>
                <Link href={`/owners/${owner.id}`} className="block text-center text-xs text-blue-600 hover:underline">
                  ดูข้อมูลเจ้าของ →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-400">ไม่ได้ระบุเจ้าของ</p>
            )}
          </Section>

          {/* โครงการ */}
          {project && (
            <Section title="โครงการ">
              <div className="space-y-2">
                <p className="font-medium text-gray-900 text-sm">{project.name_th}</p>
                {project.name_en && <p className="text-xs text-gray-400">{project.name_en}</p>}
                {project.developer && <p className="text-xs text-gray-500">ผู้พัฒนา: {project.developer}</p>}
                <Link href={`/projects/${project.id}`} className="block text-xs text-blue-600 hover:underline mt-1">
                  ดูข้อมูลโครงการ →
                </Link>
              </div>
            </Section>
          )}

          {/* วันที่สำคัญ */}
          <Section title="ข้อมูลเพิ่มเติม">
            <div className="space-y-2">
              {contractEndDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">สัญญาสิ้นสุด</p>
                    <p className="text-sm text-gray-900">{contractEndDate}</p>
                  </div>
                </div>
              )}
              <InfoItem label="บันทึกเมื่อ" value={createdDate} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function InfoItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="text-xs text-gray-500 mb-0.5 truncate">{label}</p>
      <p className={`text-sm font-medium break-words ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function Chip({ label, color = 'gray' }: { label: string; color?: 'gray' | 'blue' }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full ${
      color === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
    }`}>
      {label}
    </span>
  )
}
