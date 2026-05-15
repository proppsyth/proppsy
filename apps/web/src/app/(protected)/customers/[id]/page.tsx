import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil, Phone, MessageCircle, CreditCard, Bell, ImageOff } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import StorageImage from '@/components/shared/StorageImage'
import { customerDisplayName } from '@/types'
import type { Customer } from '@/types'

export const metadata: Metadata = { title: 'รายละเอียดลูกค้า' }

const SOURCE_LABELS: Record<string, string> = {
  line_oa: 'LINE OA',
  referral: 'แนะนำ',
  walk_in: 'Walk-in',
  online: 'ออนไลน์',
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

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!customer) notFound()

  const c = customer as unknown as Customer
  const name = customerDisplayName(c)
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
              {c.follow_up && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full mt-1">
                  <Bell className="w-3 h-3" /> ต้องการติดตาม
                </span>
              )}
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
          {c.id_card_url && (
            <Section title="รูปบัตรประชาชน">
              <div className="relative w-64 h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <StorageImage
                  src={c.id_card_url}
                  bucket="documents"
                  alt="บัตรประชาชน"
                  fill
                  className="object-cover"
                  sizes="256px"
                  fallback={
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-300">
                      <ImageOff className="w-8 h-8" />
                      <span className="text-xs">ไม่พบรูปภาพ</span>
                    </div>
                  }
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
            <InfoItem label="บันทึกเมื่อ">{createdDate}</InfoItem>
          </Section>
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
