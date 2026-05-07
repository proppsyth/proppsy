import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export const metadata: Metadata = { title: 'โปรไฟล์ของฉัน' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Ensure email is always available (from auth if not in profile)
  const profileWithEmail = { ...profile, email: profile.email ?? user.email }

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์ของฉัน</h1>
        <p className="text-gray-500 text-sm mt-0.5">ข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
      </div>
      <ProfileForm profile={profileWithEmail} />
    </div>
  )
}
