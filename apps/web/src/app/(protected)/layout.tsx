import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/shared/Sidebar'

export default async function ProtectedLayout({
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

  if (!profile) redirect('/login')

  // Rejected accounts cannot log in
  if (profile.account_status === 'rejected') redirect('/login')

  // No consent yet → complete the consent flow (which also approves the account)
  if (!profile.accepted_terms_at) redirect('/consent')

  // Consent done but still pending → recovery page that auto-approves
  if (profile.account_status !== 'approved') redirect('/pending-approval')

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="print:hidden">
        <Sidebar profile={profile} />
      </div>
      <main className="flex-1 w-0 ml-0 lg:ml-64 min-h-screen pt-14 lg:pt-0 pb-20 lg:pb-0 overflow-x-hidden min-w-0 print:ml-0 print:pt-0 print:pb-0 print:w-full">
        {children}
      </main>
    </div>
  )
}
