import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OwnerForm from '../OwnerForm'

export const metadata: Metadata = { title: 'เพิ่มเจ้าของทรัพย์' }

export default async function NewOwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มเจ้าของทรัพย์ใหม่</h1>
      <OwnerForm />
    </div>
  )
}
