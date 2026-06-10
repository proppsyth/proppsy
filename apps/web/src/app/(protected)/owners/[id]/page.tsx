import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil, Phone, MessageCircle, CreditCard, Home, ImageOff } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import StorageImage from '@/components/shared/StorageImage'
import { ownerDisplayName } from '@/types'
import type { Owner } from '@/types'
import ArchiveOwnerButton from './ArchiveOwnerButton'
import ActivityPanel from '@/components/shared/ActivityPanel'

export const metadata: Metadata = { title: 'รายละเอียดเจ้าของทรัพย์' }

type StockRow = {
  id: string
  project_name?: string | null
  unit_no?: string | null
  room_type?: string | null
  status: string
  listing_type: string
  rent_price?: number | null
  sale_price?: number | null
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  sold: 'bg-purple-100 text-purple-700',
  unavailable: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<string, string> = {
  available: 'ว่าง',
  rented: 'เช่าแล้ว',
  sold: 'ขายแล้ว',
  unavailable: 'ไม่ว่าง',
}

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: owner }, { data: stocks }] = await Promise.all([
    supabase
      .from('owners')
      .select('*')
      .eq('id', id)
      .eq('agent_uid', user.id)
      .single(),
    supabase
      .from('stock')
      .select('id, project_name, unit_no, room_type, status, listing_type, rent_price, sale_price')
      .eq('owner_id', id)
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!owner) notFound()

  const o = owner as unknown as Owner
  const name = ownerDisplayName(o)
  const stockList = (stocks ?? []) as StockRow[]

  // ID card is in secure-documents (private). Generate a signed URL server-side.
  const idCardSignedUrl = o.id_card_url
    ? (o.id_card_url.startsWith('https://')
      ? o.id_card_url
      : (await supabase.storage.from('secure-documents').createSignedUrl(o.id_card_url, 3600)).data?.signedUrl ?? null)
    : null

  const fullNameTh = [o.prefix, o.first_name_th, o.last_name_th].filter(Boolean).join(' ')
  const showFullName = o.nickname && fullNameTh && name !== fullNameTh

  const address = [o.address_no, o.address_road, o.subdistrict && `แขวง${o.subdistrict}`,
    o.district && `เขต${o.district}`, o.province, o.zip].filter(Boolean).join(' ')

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      {/* Header */}
      <div className="mb-5">
        <Link href="/owners" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการเจ้าของ
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-lg flex-shrink-0">
              {name.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{o.id}</p>
              <h1 className="text-xl font-bold text-gray-900">{name}</h1>
              {showFullName && (
                <p className="text-sm text-gray-500 mt-0.5">{fullNameTh}</p>
              )}
            </div>
          </div>
          <Link
            href={`/owners/${id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            แก้ไข
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* ข้อมูลติดต่อ */}
          <Section title="ข้อมูลติดต่อ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {o.phone && (
                <InfoItem label="เบอร์โทรศัพท์" icon={<Phone className="w-3.5 h-3.5" />}>
                  <a href={`tel:${o.phone}`} className="text-blue-600 hover:underline">{o.phone}</a>
                </InfoItem>
              )}
              {o.line_id && (
                <InfoItem label="LINE ID" icon={<MessageCircle className="w-3.5 h-3.5" />}>
                  {o.line_id}
                </InfoItem>
              )}
              {o.national_id && (
                <InfoItem label="เลขบัตรประชาชน" icon={<CreditCard className="w-3.5 h-3.5" />}>
                  {o.national_id.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, '$1-$2-$3-$4-$5')}
                </InfoItem>
              )}
              {o.first_name_en && (
                <InfoItem label="ชื่อภาษาอังกฤษ">
                  {[o.prefix_en, o.first_name_en, o.last_name_en].filter(Boolean).join(' ')}
                </InfoItem>
              )}
            </div>
          </Section>

          {/* ที่อยู่ */}
          {address && (
            <Section title="ที่อยู่">
              <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
            </Section>
          )}

          {/* บัญชีธนาคาร */}
          {o.bank_name && (
            <Section title="บัญชีธนาคาร">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="ธนาคาร">{o.bank_name}</InfoItem>
                {o.bank_account_name && <InfoItem label="ชื่อบัญชี">{o.bank_account_name}</InfoItem>}
                {o.bank_account_no && (
                  <div className="col-span-2">
                    <InfoItem label="เลขที่บัญชี">{o.bank_account_no}</InfoItem>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* รูปบัตรประชาชน */}
          {idCardSignedUrl && (
            <Section title="รูปบัตรประชาชน">
              <div className="relative w-64 h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={idCardSignedUrl}
                  alt="บัตรประชาชน"
                  className="w-full h-full object-cover"
                />
              </div>
            </Section>
          )}

          {/* ลายเซ็น */}
          {o.signature_url && (
            <Section title="ลายเซ็น">
              <div className="relative w-52 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white">
                <StorageImage
                  src={o.signature_url}
                  bucket="documents"
                  alt="ลายเซ็น"
                  fill
                  className="object-contain p-2"
                  sizes="208px"
                  fallback={
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <ImageOff className="w-6 h-6" />
                    </div>
                  }
                />
              </div>
            </Section>
          )}

          {/* หมายเหตุ */}
          {o.notes && (
            <Section title="หมายเหตุ">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{o.notes}</p>
            </Section>
          )}
        </div>

        {/* Right: stocks */}
        <div>
          <div className="mb-4">
            <ArchiveOwnerButton ownerId={o.id} isArchived={o.is_archived ?? false} />
          </div>

          <Section title={`ทรัพย์ที่ดูแล (${stockList.length})`}>
            {stockList.length > 0 ? (
              <div className="space-y-2">
                {stockList.map(s => (
                  <Link
                    key={s.id}
                    href={`/stock/${s.id}`}
                    className="block p-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition"
                  >
                    <p className="text-xs text-gray-400 mb-0.5">{s.id}</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {[s.project_name, s.unit_no].filter(Boolean).join(' · ') || s.id}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                      {s.room_type && <span className="text-xs text-gray-400">{s.room_type}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Home className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">ยังไม่มีทรัพย์</p>
              </div>
            )}
          </Section>

          {/* กิจกรรม */}
          <ActivityPanel entityType="owner" entityId={o.id} />
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

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

function InfoItem({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
        {icon && <span className="text-gray-400">{icon}</span>}
        {children}
      </p>
    </div>
  )
}
