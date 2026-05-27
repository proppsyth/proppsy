import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'
import PreviewToolbar from './PreviewToolbar'

export const metadata: Metadata = { title: 'ตัวอย่างสัญญา' }

// Force dynamic — the iframe URL embeds a timestamp so each visit gets a fresh PDF.
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

  // Lightweight query only — heavy PDF generation happens in the route handler.
  // This keeps the RSC render cheap so React Flight streaming stays stable.
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, doc_type, docx_url, sign_token')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) notFound()

  const docLabel = DOC_TYPE_LABELS[contract.doc_type as ContractDocType] ?? contract.doc_type

  // Cache-buster: ensures the iframe re-fetches a fresh PDF on every visit
  // even though the route handler always regenerates server-side.
  const pdfSrc = `/api/contracts/${id}/preview-pdf?ts=${Date.now()}`

  const c = contract as typeof contract & { docx_url?: string | null }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <PreviewToolbar
        contractId={id}
        docLabel={docLabel}
        docxUrl={c.docx_url ?? null}
        pdfUrl={pdfSrc}
        signToken={contract.sign_token ?? null}
      />

      <iframe
        src={pdfSrc}
        className="flex-1 w-full"
        style={{ border: 'none' }}
        title={docLabel}
      />
    </div>
  )
}
