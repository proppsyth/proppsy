import { Settings } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsPanel from './SettingsPanel'

export const metadata: Metadata = { title: 'ตั้งค่าระบบ — Admin' }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value, label, description, updated_at')
    .order('key')

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
          <p className="text-xs text-gray-400">Platform configuration และ feature flags</p>
        </div>
      </div>

      <SettingsPanel settings={settings ?? []} />
    </div>
  )
}
