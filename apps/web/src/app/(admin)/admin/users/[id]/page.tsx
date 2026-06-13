import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import AdminUserDetailForm from './AdminUserDetailForm'

export const metadata: Metadata = { title: 'รายละเอียดผู้ใช้ — Admin' }

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) redirect('/login')

  const { id } = await params
  const admin = createServiceClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  // ── Resolve id_card signed URL (private bucket) or public URL ──
  let idCardDisplayUrl: string | null = null
  if (profile.id_card_url) {
    if (profile.id_card_url.startsWith('http')) {
      idCardDisplayUrl = profile.id_card_url
    } else {
      // Private storage path — generate 2-hour signed URL
      const { data: signed } = await admin.storage
        .from('secure-documents')
        .createSignedUrl(profile.id_card_url, 7200)
      idCardDisplayUrl = signed?.signedUrl ?? null
    }
  }

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/admin/users"
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          ← กลับ
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-lg font-bold text-gray-900">
          {profile.name || profile.email || 'ผู้ใช้'}
        </h1>
      </div>

      <AdminUserDetailForm
        profile={profile as Profile}
        idCardDisplayUrl={idCardDisplayUrl}
      />
    </div>
  )
}
