import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { generateContractPdf } from '../../actions'
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
    .select('id, doc_type, template_slug, docx_url, pdf_url, sign_token, is_finalized, finalized_pdf_url')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) notFound()

  const docLabel = DOC_TYPE_LABELS[contract.doc_type as ContractDocType] ?? contract.doc_type

  let pdfUrl: string | null = null
  let pdfError: string | null = null

  // Finalized: use the locked PDF. Otherwise: always regenerate for freshness.
  const c = contract as typeof contract & {
    finalized_pdf_url?: string | null
    pdf_url?: string | null
    docx_url?: string | null
  }

  if (c.is_finalized && c.finalized_pdf_url) {
    pdfUrl = c.finalized_pdf_url
  } else {
    const result = await generateContractPdf(id)
    if (result.error) pdfError = result.error
    else pdfUrl = result.url ?? null
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <PreviewToolbar
        contractId={id}
        docLabel={docLabel}
        docxUrl={c.docx_url ?? null}
        pdfUrl={pdfUrl}
        signToken={contract.sign_token ?? null}
      />

      {pdfError ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md w-full">
            <p className="text-red-600 font-medium mb-4">{pdfError}</p>
            <Link href={`/contracts/${id}`} className="text-sm text-blue-600 hover:underline">
              กลับไปแก้ไขข้อมูล →
            </Link>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe
          src={pdfUrl}
          className="flex-1 w-full"
          style={{ border: 'none' }}
          title={docLabel}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">ไม่พบเอกสาร</p>
        </div>
      )}
    </div>
  )
}
