import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil, Phone, MessageCircle, CreditCard, Bell, ImageOff, ExternalLink, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import StorageImage from '@/components/shared/StorageImage'
import { customerDisplayName } from '@/types'
import type { Customer, LeadStatus } from '@/types'
import { LEAD_STATUS_CONFIG } from '../CustomerList'
import ArchiveCustomerButton from './ArchiveCustomerButton'
import CustomerContractHistory from './ContractHistory'
import type { ContractRow } from './ContractHistory'

export const metadata: Metadata = { title: 'รายละเอียดลูกค้า' }

const SOURCE_LABELS: Record<string, string> = {
  line_oa: 'LINE OA',
  referral: 'แนะนำ',
  walk_in: 'Walk-in',
  online: 'ออนไลน์',
  public_listing: 'ประกาศสาธารณะ',
}

interface InquiryRow {
  id: string
  created_at: string
  budget: string | null
  move_in_date: string | null
  notes: string | null
  stock: {
    id: string
    project_name: string | null
    unit_no: string | null
    room_type: string | null
    rent_price: number | null
    sale_price: number | null
    listing_type: string | null
    photo_urls: string[] | null
  } | null
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: customer }, { data: inquiryRows }, { data: contractRows }] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('agent_uid', user.id)
      .single(),
    supabase
      .from('property_inquiries')
      .select(`
        id,
        created_at,
        budget,
        move_in_date,
        notes,
        stock:stock_id (
          id,
          project_name,
          unit_no,
          room_type,
          rent_price,
          sale_price,
          listing_type,
          photo_urls
        )
      `)
      .eq('customer_id', id)
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    // Contract history — lease + reservation contracts for this customer
    supabase
      .from('contracts')
      .select(`
        id, doc_type, status, created_at, move_in_date, end_date,
        rent_price, contract_category, is_finalized,
        stock:stock_id (id, project_name, unit_no, floor, building, room_type)
      `)
      .eq('customer_id', id)
      .eq('agent_uid', user.id)
      .is('deleted_at', null)
      .in('contract_category', ['lease', 'reservation'])
      .order('created_at', { ascending: false }),
  ])

  if (!customer) notFound()

  const c = customer as unknown as Customer
  const inquiries = (inquiryRows ?? []) as unknown as InquiryRow[]
  const name = customerDisplayName(c)

  // ID card is stored in secure-documents (private bucket) as a relative path.
  // Generate a 1-hour signed URL server-side so the <img> can load it.
  const idCardSignedUrl = c.id_card_url
    ? (c.id_card_url.startsWith('https://')
      ? c.id_card_url
      : (await supabase.storage.from('secure-documents').createSignedUrl(c.id_card_url, 3600)).data?.signedUrl ?? null)
    : null
  const fullNameTh = [c.prefix, c.first_name_th, c.last_name_th].filter(Boolean).join(' ')
  const showFullName = c.nickname && fullNameTh && name !== fullNameTh

  const address = [c.address_no, c.address_road, c.subdistrict && `แขวง${c.subdistrict}`,
    c.district && `เขต${c.district}`, c.province, c.zip].filter(Boolean).join(' ')

  const createdDate = new Date(c.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      {/* Header */}
      <div className="mb-5">
        <Link href="/customers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการลูกค้า
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-lg flex-shrink-0">
              {name.charAt(0) || '?'}
              {c.follow_up && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-400 rounded-full border-2 border-white flex items-center justify-center">
                  <Bell className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{c.id}</p>
              <h1 className="text-xl font-bold text-gray-900">{name}</h1>
              {showFullName && (
                <p className="text-sm text-gray-500 mt-0.5">{fullNameTh}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {c.follow_up && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                    <Bell className="w-3 h-3" /> ต้องการติดตาม
                  </span>
                )}
                {c.lead_status && LEAD_STATUS_CONFIG[c.lead_status as LeadStatus] && (
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${LEAD_STATUS_CONFIG[c.lead_status as LeadStatus].className}`}>
                    {LEAD_STATUS_CONFIG[c.lead_status as LeadStatus].label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href={`/customers/${id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            แก้ไข
          </Link>
        </div>
      </div>

      {/* ─── Contract History (full-width) ─────────────────────── */}
      {(contractRows?.length ?? 0) > 0 && (
        <div className="mb-4">
          <CustomerContractHistory contracts={(contractRows ?? []) as unknown as ContractRow[]} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* ข้อมูลติดต่อ */}
          <Section title="ข้อมูลติดต่อ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.phone && (
                <InfoItem label="เบอร์โทรศัพท์" icon={<Phone className="w-3.5 h-3.5" />}>
                  <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline">{c.phone}</a>
                </InfoItem>
              )}
              {c.line_id && (
                <InfoItem label="LINE ID" icon={<MessageCircle className="w-3.5 h-3.5" />}>
                  {c.line_id}
                </InfoItem>
              )}
              {c.national_id && (
                <InfoItem label="เลขบัตรประชาชน" icon={<CreditCard className="w-3.5 h-3.5" />}>
                  {c.national_id.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, '$1-$2-$3-$4-$5')}
                </InfoItem>
              )}
              {c.gender && (
                <InfoItem label="เพศ">{c.gender}</InfoItem>
              )}
              {c.occupation && (
                <InfoItem label="อาชีพ">{c.occupation}</InfoItem>
              )}
              {c.source && (
                <InfoItem label="แหล่งที่มา">
                  {SOURCE_LABELS[c.source] ?? c.source}
                </InfoItem>
              )}
              {c.first_name_en && (
                <InfoItem label="ชื่อภาษาอังกฤษ">
                  {[c.prefix_en, c.first_name_en, c.last_name_en].filter(Boolean).join(' ')}
                </InfoItem>
              )}
            </div>
          </Section>

          {/* ทรัพย์ที่สนใจ */}
          {inquiries.length > 0 && (
            <Section title={`ทรัพย์ที่สนใจ (${inquiries.length})`}>
              <div className="space-y-3">
                {inquiries.map((inq, idx) => (
                  <InquiryCard key={inq.id} inq={inq} isLatest={idx === 0} />
                ))}
              </div>
            </Section>
          )}

          {/* ที่อยู่ */}
          {address && (
            <Section title="ที่อยู่">
              <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
            </Section>
          )}

          {/* บัญชีธนาคาร */}
          {c.bank_name && (
            <Section title="บัญชีธนาคาร">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="ธนาคาร">{c.bank_name}</InfoItem>
                {c.bank_account_name && <InfoItem label="ชื่อบัญชี">{c.bank_account_name}</InfoItem>}
                {c.bank_account_no && (
                  <div className="col-span-2">
                    <InfoItem label="เลขที่บัญชี">{c.bank_account_no}</InfoItem>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* รูปบัตร */}
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
          {c.signature_url && (
            <Section title="ลายเซ็น">
              <div className="relative w-52 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white">
                <StorageImage
                  src={c.signature_url}
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
          {c.notes && (
            <Section title="หมายเหตุ">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.notes}</p>
            </Section>
          )}
        </div>

        {/* Right */}
        <div>
          <Section title="ข้อมูลเพิ่มเติม">
            <div className="space-y-3">
              {c.lead_status && LEAD_STATUS_CONFIG[c.lead_status as LeadStatus] && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">สถานะ Lead</p>
                  <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${LEAD_STATUS_CONFIG[c.lead_status as LeadStatus].className}`}>
                    {LEAD_STATUS_CONFIG[c.lead_status as LeadStatus].label}
                  </span>
                </div>
              )}
              {c.preferred_move_in_date && (
                <InfoItem label="ต้องการย้ายเข้า">
                  {new Date(c.preferred_move_in_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </InfoItem>
              )}
              {c.converted_at && (
                <InfoItem label="วันที่ปิดดีล">
                  {new Date(c.converted_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </InfoItem>
              )}
              <InfoItem label="บันทึกเมื่อ">{createdDate}</InfoItem>
            </div>
          </Section>

          <div className="mt-4">
            <ArchiveCustomerButton customerId={c.id} isArchived={c.is_archived ?? false} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Inquiry card ─────────────────────────────────────────────

function InquiryCard({ inq, isLatest }: { inq: InquiryRow; isLatest: boolean }) {
  const s = inq.stock
  const thumb = s?.photo_urls?.[0]
  const propertyName = [s?.project_name, s?.unit_no].filter(Boolean).join(' · ') || 'ทรัพย์ที่สนใจ'

  const isRent = s?.listing_type !== 'sale'
  const isSale = s?.listing_type !== 'rent'
  const priceParts: string[] = []
  if (isRent && s?.rent_price) priceParts.push(`เช่า ฿${fmtPrice(s.rent_price)}/เดือน`)
  if (isSale && s?.sale_price) priceParts.push(`ขาย ฿${fmtPrice(s.sale_price)}`)

  return (
    <div className={`flex gap-3 p-3 rounded-xl border transition-colors ${isLatest ? 'border-blue-100 bg-blue-50/50' : 'border-gray-100 bg-gray-50/40'}`}>
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
        {thumb ? (
          <Image
            src={thumb}
            alt={propertyName}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <ImageOff className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{propertyName}</p>
          {isLatest && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded-full font-medium flex-shrink-0">ล่าสุด</span>
          )}
        </div>

        {priceParts.length > 0 && (
          <p className="text-xs text-gray-600 mt-0.5">{priceParts.join('  ·  ')}</p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {inq.budget && (
            <span className="text-xs text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-100">
              งบ {inq.budget}
            </span>
          )}
          {inq.move_in_date && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
              ย้ายเข้า {new Date(inq.move_in_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtDateTime(inq.created_at)}
          </p>
          {s?.id && (
            <Link
              href={`/listing/${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0"
            >
              เปิดประกาศ
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
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
