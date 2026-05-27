// PDF preview route handler — generates the contract PDF and redirects to the
// resulting Supabase Storage URL.
//
// Why a route handler (not done inside preview/page.tsx)?
//   Puppeteer takes 10-45s. Doing that work inside an RSC render races with
//   React 19 / Next.js 16 Flight streaming. Moving to a route handler removes
//   it from the RSC graph entirely.
//
// ?mode=json — returns { url: string } instead of a 302 redirect.
//   Used by PreviewClient (client component) to display a loading state.
//
// Caching — non-finalized PDFs are cached in-memory for 5 minutes keyed by
//   contractId + updated_at. Avoids regenerating identical PDFs on re-visits
//   within the same warm serverless instance.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContractPdf } from '@/app/(protected)/contracts/actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// In-memory cache — survives warm serverless instance restarts (~5 min).
// Key = `${contractId}:${updatedAt}`
const pdfCache = new Map<string, { url: string; expiresAt: number }>()

function getCachedUrl(contractId: string, updatedAt: string): string | null {
  const key = `${contractId}:${updatedAt}`
  const entry = pdfCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    pdfCache.delete(key)
    return null
  }
  return entry.url
}

function setCachedUrl(contractId: string, updatedAt: string, url: string): void {
  const key = `${contractId}:${updatedAt}`
  pdfCache.set(key, { url, expiresAt: Date.now() + 5 * 60 * 1000 })
  // Prevent unbounded growth in long-lived processes
  if (pdfCache.size > 200) {
    const oldest = pdfCache.keys().next().value
    if (oldest) pdfCache.delete(oldest)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`PDF generation timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const modeJson = url.searchParams.get('mode') === 'json'

  const respond = (payload: { url: string }) =>
    modeJson
      ? NextResponse.json(payload)
      : NextResponse.redirect(payload.url, { status: 302 })

  const respondError = (error: string, status: number) =>
    NextResponse.json({ error }, { status })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return respondError('unauthorized', 401)
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, is_finalized, finalized_pdf_url, updated_at')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) {
    return respondError('not found', 404)
  }

  const c = contract as typeof contract & {
    finalized_pdf_url?: string | null
    updated_at?: string | null
  }

  // Finalized contracts: serve locked PDF directly, never regenerate
  if (c.is_finalized && c.finalized_pdf_url) {
    console.log(`[PDF] Finalized contract ${id}, serving cached URL`)
    return respond({ url: c.finalized_pdf_url })
  }

  // Check in-memory cache keyed by contract version
  const updatedAt = c.updated_at ?? ''
  const cachedUrl = getCachedUrl(id, updatedAt)
  if (cachedUrl) {
    console.log(`[PDF] Cache hit for ${id}`)
    return respond({ url: cachedUrl })
  }

  // Generate PDF with 55s hard timeout (maxDuration = 60, leave 5s buffer)
  console.log(`[PDF] Generating PDF for ${id}`)
  const result = await withTimeout(generateContractPdf(id), 55000).catch((err: Error) => ({
    error: err.message,
    url: undefined as string | undefined,
  }))

  if (result.error || !result.url) {
    console.error(`[PDF] Generation failed for ${id}:`, result.error)
    return respondError(result.error ?? 'PDF generation failed', 500)
  }

  setCachedUrl(id, updatedAt, result.url)
  console.log(`[PDF] Done for ${id}, url cached`)
  return respond({ url: result.url })
}
