import { notFound } from 'next/navigation'
import { FileText, CheckCircle, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'

export const metadata: Metadata = { title: 'ลงนามสัญญา — Proppsy' }

export default async function ContractSignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = await createClient()
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, doc_type, status, signed_at, docx_url, created_at')
    .eq('sign_token', token)
    .single()

  if (!contract) notFound()

  const alreadySigned = contract.status === 'signed'
  const docLabel = DOC_TYPE_LABELS[contract.doc_type as ContractDocType] ?? contract.doc_type

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ลงนามเอกสาร</h1>
          <p className="text-sm text-gray-500 mt-1">{docLabel}</p>
          <p className="text-xs text-gray-400">{contract.id}</p>
        </div>

        {alreadySigned ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold text-green-700">ลงนามเรียบร้อยแล้ว</p>
            {contract.signed_at && (
              <p className="text-xs text-gray-500">
                วันที่ลงนาม: {new Date(contract.signed_at).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-3 py-2 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>รอการลงนาม</span>
            </div>

            {contract.docx_url && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">อ่านเอกสารก่อนลงนาม:</p>
                <a
                  href={contract.docx_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium rounded-xl transition w-full justify-center"
                >
                  <FileText className="w-4 h-4" />
                  ดูเอกสาร .docx
                </a>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">ลงชื่อของท่าน:</p>
              <div className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-400">พื้นที่ลายเซ็น</p>
              </div>
              <p className="text-xs text-gray-400 text-center">
                ระบบ e-sign อยู่ระหว่างพัฒนา — กรุณาติดต่อเอเจนต์เพื่อลงนามเอกสาร
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                สร้างโดย <span className="font-medium text-gray-600">Proppsy</span> · {new Date(contract.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          Proppsy ทำหน้าที่เป็นตัวกลางเชื่อมโยงระหว่างฟรีแลนซ์และผู้ว่าจ้างเท่านั้น
          และไม่ได้เป็นคู่สัญญาในข้อตกลงใด ๆ
        </p>
      </div>
    </div>
  )
}
