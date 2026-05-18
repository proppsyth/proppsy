import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
      <AdminSidebar profile={profile} />
      <main className="flex-1 w-0 ml-0 lg:ml-64 min-h-screen pt-14 lg:pt-0 pb-6 overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
