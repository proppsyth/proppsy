/**
 * /profile/setup — Profile completion page for Google OAuth users.
 *
 * Google users who sign in for the first time only complete terms consent —
 * they haven't filled in phone, national_id, or id_card yet.
 * This page collects that required info before they can use the dashboard.
 *
 * After submitting, they land on /dashboard with a pending-approval banner.
 */

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProfileSetupForm from './ProfileSetupForm'

export const metadata: Metadata = { title: 'กรอกข้อมูลโปรไฟล์ — Proppsy' }

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone, national_id, id_card_url, avatar_url, auth_provider')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // If profile already complete, go to dashboard
  if (profile.phone && profile.national_id) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">กรอกข้อมูลโปรไฟล์</h1>
          <p className="text-sm text-gray-500 mt-1">
            กรุณากรอกข้อมูลให้ครบถ้วนเพื่อให้แอดมินตรวจสอบและอนุมัติบัญชีของคุณ
          </p>
        </div>

        <ProfileSetupForm
          name={profile.name ?? ''}
          avatarUrl={profile.avatar_url ?? null}
        />
      </div>
    </div>
  )
}
