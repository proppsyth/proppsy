import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getContractPreviewHtml } from '../../actions'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'
import PreviewToolbar from './PreviewToolbar'

export const metadata: Metadata = { title: 'ตัวอย่างสัญญา' }

export default async function ContractPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, doc_type, template_slug, docx_url, sign_token')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) notFound()

  const { html, error, missing } = await getContractPreviewHtml(id)

  const docLabel = DOC_TYPE_LABELS[contract.doc_type as ContractDocType] ?? contract.doc_type

  return (
    <div className="min-h-screen bg-gray-100">
      <PreviewToolbar
        contractId={id}
        docLabel={docLabel}
        docxUrl={contract.docx_url ?? null}
        signToken={contract.sign_token ?? null}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <p className="text-red-600 font-medium mb-2">{error}</p>
            {missing && missing.length > 0 && (
              <div className="mt-3 text-left inline-block">
                <p className="text-sm text-gray-600 mb-2">ข้อมูลที่ขาด:</p>
                <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                  {missing.map(m => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <Link href={`/contracts/${id}`} className="text-sm text-blue-600 hover:underline">
                กลับไปแก้ไขข้อมูล →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div
              className="bg-white shadow-xl mx-auto print:shadow-none"
              style={{ maxWidth: '210mm', minHeight: '297mm' }}
            >
              <style>{`
                @media print {
                  body { margin: 0; }
                  .print\\:hidden { display: none !important; }
                  .print\\:shadow-none { box-shadow: none !important; }
                  @page { size: A4; margin: 15mm; }
                }
              `}</style>
              <div
                className="contract-preview p-8 sm:p-12"
                style={{ fontFamily: 'Sarabun, sans-serif', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: html ?? '' }}
              />
            </div>

            <div className="mt-6 max-w-xl mx-auto bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-2 print:hidden">
              <p className="font-semibold text-gray-700">หมายเหตุ (Proppsy)</p>
              <p>เอกสารฉบับนี้ Proppsy ออกให้กับฟรีแลนซ์โดยอัตโนมัติ</p>
              <p>หากท่านเป็นบริษัทจดทะเบียน กรุณาหักภาษี ณ ที่จ่ายในชื่อของฟรีแลนซ์ มิใช่ Proppsy</p>
              <p>Proppsy ทำหน้าที่เป็นเพียงตัวกลางเชื่อมโยงระหว่างฟรีแลนซ์ และผู้ว่าจ้าง และไม่ได้เป็นคู่สัญญาในข้อตกลงใด ๆ</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
