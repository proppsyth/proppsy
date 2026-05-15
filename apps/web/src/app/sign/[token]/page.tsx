import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'
import SigningClient from './SigningClient'
import { CheckCircle, Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'ลงนามสัญญา — Proppsy' }

const ROLE_LABELS: Record<string, string> = {
  tenant:   'ผู้เช่า',
  owner:    'เจ้าของ',
  co_agent: 'Co-Agent',
  witness:  'พยาน',
}

function buildFullName(
  person: { prefix?: string | null; first_name_th?: string | null; last_name_th?: string | null; nickname?: string | null } | null
): string {
  if (!person) return '–'
  const parts = [person.prefix, person.first_name_th, person.last_name_th].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return person.nickname ?? '–'
}

export default async function ContractSignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: signer, error: signerError } = await supabase
    .from('contract_signers')
    .select(`
      *,
      contract:contracts(
        id, doc_type, status, signed_at, docx_url,
        rent_price, deposit_amount, deposit_months, contract_months,
        move_in_date, end_date,
        stock:stock(id, unit_no, unit_name, building, floor, room_type, project_name),
        owner:owners(id, prefix, first_name_th, last_name_th, nickname, phone),
        customer:customers(id, prefix, first_name_th, last_name_th, nickname, phone)
      )
    `)
    .eq('sign_token', token)
    .single()

  if (signerError && signerError.code !== 'PGRST116') {
    // Database error (e.g. migration not run) — show friendly message
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-sm w-full text-center space-y-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">ไม่สามารถโหลดเอกสารได้</h1>
          <p className="text-sm text-gray-500">ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาติดต่อผู้ส่งเพื่อขอลิงก์ใหม่</p>
        </div>
      </div>
    )
  }

  if (!signer) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract = signer.contract as any
  const docLabel = DOC_TYPE_LABELS[contract?.doc_type as ContractDocType] ?? contract?.doc_type ?? 'เอกสาร'
  const stock    = contract?.stock
  const owner    = contract?.owner
  const customer = contract?.customer

  const ownerFullName  = buildFullName(owner)
  const tenantFullName = buildFullName(customer)
  const signerRoleLabel = ROLE_LABELS[signer.signer_role] ?? signer.signer_role

  // Best signer name: explicit → matched party → empty
  let bestSignerName = signer.signer_name ?? ''
  if (!bestSignerName) {
    if (signer.signer_role === 'tenant') bestSignerName = tenantFullName === '–' ? '' : tenantFullName
    else if (signer.signer_role === 'owner') bestSignerName = ownerFullName === '–' ? '' : ownerFullName
  }

  // Already signed
  if (signer.status === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center pt-14 px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ลงนามเรียบร้อยแล้ว</h1>
            <p className="text-sm text-gray-500 mt-1">{docLabel} · {contract?.id}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            <Row label="ผู้ลงนาม"  value={signer.signed_name ?? signer.signer_name ?? '–'} />
            <Row label="บทบาท"     value={signerRoleLabel} />
            {signer.signed_at && (
              <Row
                label="วันที่ลงนาม"
                value={new Date(signer.signed_at).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              />
            )}
          </div>

          {signer.signature_url && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-2">ลายเซ็น</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signer.signature_url} alt="signature" className="h-16 object-contain" />
            </div>
          )}
          {signer.signature_type === 'typed' && signer.signed_name && !signer.signature_url && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">ลายเซ็น (พิมพ์ชื่อ)</p>
              <p className="italic text-2xl text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
                {signer.signed_name}
              </p>
            </div>
          )}

          <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            บันทึกโดย Proppsy E-Sign · ลายเซ็นอิเล็กทรอนิกส์ที่มีผลทางกฎหมาย
          </p>
        </div>
      </div>
    )
  }

  return (
    <SigningClient
      token={token}
      signerName={bestSignerName}
      signerRoleLabel={signerRoleLabel}
      contractId={contract?.id ?? ''}
      docLabel={docLabel}
      projectName={stock?.project_name ?? null}
      unitNo={stock?.unit_no ?? null}
      floor={stock?.floor ?? null}
      roomType={stock?.room_type ?? null}
      ownerFullName={ownerFullName}
      tenantFullName={tenantFullName}
      docxUrl={contract?.docx_url ?? null}
      rentPrice={contract?.rent_price ?? null}
      depositAmount={contract?.deposit_amount ?? null}
      depositMonths={contract?.deposit_months ?? null}
      contractMonths={contract?.contract_months ?? null}
      moveInDate={contract?.move_in_date ?? null}
      endDate={contract?.end_date ?? null}
    />
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right ml-4">{value}</span>
    </div>
  )
}
