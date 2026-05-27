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
// Cache layers (fastest → slowest):
//   1. Finalized PDF   → contracts.finalized_pdf_url (immutable, always serve)
//   2. In-memory cache → Map keyed by contractId:updatedAt (5-min TTL, single instance)
//   3. DB cache        → contracts.pdf_url if contract last updated >30s ago
//   4. Generate        → call generateContractPdf, 55s timeout
//
// Development mode (NODE_ENV=development):
//   ALL caches are bypassed — every request regenerates the PDF from disk.
//   This ensures .md template edits reflect immediately on browser refresh.
//   Finalized contracts still serve finalized_pdf_url (immutable by design).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContractPdf } from '@/app/(protected)/contracts/actions'

export const dynamic   = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const IS_DEV = process.env.NODE_ENV === 'development'

// ─── Structured logging ───────────────────────────────────────────────────────

function makeLog(prefix: string) {
  return (step: string, data?: Record<string, unknown>): void => {
    const ts = new Date().toISOString()
    const msg = `[${prefix} ${ts}] ${step}`
    data ? console.log(msg, JSON.stringify(data)) : console.log(msg)
  }
}

const previewLog = makeLog('PREVIEW')
const cacheLog   = makeLog('CACHE')

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Survives within a warm serverless instance (~5 min lifespan).
// Key = `${contractId}:${updatedAt}` — naturally invalidated when the contract
// is modified (updated_at changes → different key).
// NEVER used in development — template file changes must always regenerate.

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
  if (pdfCache.size > 200) {
    const oldest = pdfCache.keys().next().value
    if (oldest) pdfCache.delete(oldest)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`สร้าง PDF หมดเวลา (${ms / 1000}s) — กรุณาลองใหม่`)), ms)
    ),
  ])
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const t0 = Date.now()
  const { id } = await ctx.params
  const url = new URL(req.url)
  const modeJson = url.searchParams.get('mode') === 'json'

  previewLog('request.start', { contractId: id, modeJson, dev: IS_DEV })

  const respond = (payload: { url: string }) => {
    previewLog('request.done', { contractId: id, ms: Date.now() - t0 })
    return modeJson
      ? NextResponse.json(payload)
      : NextResponse.redirect(payload.url, { status: 302 })
  }

  const respondError = (error: string, status: number) => {
    previewLog('request.error', { contractId: id, error, status, ms: Date.now() - t0 })
    return NextResponse.json({ error }, { status })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return respondError('unauthorized', 401)

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, is_finalized, finalized_pdf_url, pdf_url, updated_at')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) return respondError('not found', 404)

  const c = contract as typeof contract & {
    finalized_pdf_url?: string | null
    pdf_url?:           string | null
    updated_at?:        string | null
  }

  // ── Layer 1: Finalized PDF (immutable — served in both dev and prod) ─────────
  // Finalized contracts are locked forever; template edits don't apply to them.
  if (c.is_finalized && c.finalized_pdf_url) {
    cacheLog('finalized.hit', { contractId: id })
    return respond({ url: c.finalized_pdf_url })
  }

  const updatedAt = c.updated_at ?? ''

  // ── Layers 2 & 3: SKIPPED in development ─────────────────────────────────────
  // In dev, .md template files may be edited between requests. The cache key
  // (contractId:updatedAt) only reflects contract data changes, not file changes.
  // Always regenerate in dev so edits appear instantly on browser refresh.
  if (IS_DEV) {
    cacheLog('dev.bypass', { contractId: id })
  } else {
    // ── Layer 2: In-memory cache (same serverless instance) ───────────────────
    const cachedUrl = getCachedUrl(id, updatedAt)
    if (cachedUrl) {
      cacheLog('memory.hit', { contractId: id })
      return respond({ url: cachedUrl })
    }

    // ── Layer 3: DB cache (cross-instance) ─────────────────────────────────────
    // Serve contracts.pdf_url directly if:
    //   a) it is set (was generated before), AND
    //   b) the contract was last updated more than 30s ago
    //      (< 30s → agent may have just edited, regenerate to be safe)
    if (c.pdf_url && updatedAt) {
      const ageMs = Date.now() - new Date(updatedAt).getTime()
      if (ageMs > 30_000) {
        cacheLog('db.hit', { contractId: id, ageMs })
        setCachedUrl(id, updatedAt, c.pdf_url)
        return respond({ url: c.pdf_url })
      }
      cacheLog('db.skip', { contractId: id, ageMs, reason: 'contract updated recently' })
    }
  }

  // ── Layer 4: Generate ────────────────────────────────────────────────────────
  previewLog('generate.start', { contractId: id, dev: IS_DEV })
  const result = await withTimeout(generateContractPdf(id), 55000).catch((err: Error) => ({
    error: err.message,
    url: undefined as string | undefined,
  }))

  if (result.error || !result.url) {
    return respondError(result.error ?? 'PDF generation failed', 500)
  }

  // Only cache in production — dev always regenerates
  if (!IS_DEV) {
    setCachedUrl(id, updatedAt, result.url)
    cacheLog('memory.set', { contractId: id })
  }

  return respond({ url: result.url })
}
