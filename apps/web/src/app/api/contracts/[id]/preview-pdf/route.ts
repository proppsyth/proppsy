// PDF preview route handler — generates the contract PDF and redirects to the
// resulting Supabase Storage URL.
//
// Why a route handler (not done inside preview/page.tsx)?
//   Puppeteer takes 10-25s. Doing that work inside an RSC render races with
//   React 19 / Next.js 16 Flight streaming and surfaces as:
//     TypeError: Cannot read properties of null (reading 'enqueueModel')
//     TypeError: chunk.reason.enqueueModel is not a function
//   Moving the heavy work to a route handler removes it from the RSC graph
//   entirely — the page renders instantly and the browser fetches the PDF
//   through this endpoint.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContractPdf } from '@/app/(protected)/contracts/actions'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Finalized contracts: serve the locked PDF directly, never regenerate
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, is_finalized, finalized_pdf_url')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const c = contract as typeof contract & { finalized_pdf_url?: string | null }
  if (c.is_finalized && c.finalized_pdf_url) {
    return NextResponse.redirect(c.finalized_pdf_url, { status: 302 })
  }

  const result = await generateContractPdf(id)
  if (result.error || !result.url) {
    return NextResponse.json({ error: result.error ?? 'PDF generation failed' }, { status: 500 })
  }

  return NextResponse.redirect(result.url, { status: 302 })
}
