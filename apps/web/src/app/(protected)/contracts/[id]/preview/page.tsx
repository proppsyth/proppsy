import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'
import PreviewToolbar from './PreviewToolbar'
import PreviewClient from './PreviewClient'

export const metadata: Metadata = { title: 'ตัวอย่างสัญญา' }

export const dynamic = 'force-dynamic'

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
    .select('id, doc_type, docx_url, sign_token')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) notFound()

  const docLabel = DOC_TYPE_LABELS[contract.doc_type as ContractDocType] ?? contract.doc_type
  const c = contract as typeof contract & { docx_url?: string | null }

  // Toolbar download/open buttons point to the API route directly (follows 302 to the PDF).
  // PreviewClient handles loading state and mobile detection via ?mode=json internally.
  const pdfApiUrl = `/api/contracts/${id}/preview-pdf`

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <PreviewToolbar
        contractId={id}
        docLabel={docLabel}
        docxUrl={c.docx_url ?? null}
        pdfUrl={pdfApiUrl}
        signToken={contract.sign_token ?? null}
      />

      <PreviewClient contractId={id} docLabel={docLabel} />
    </div>
  )
}
