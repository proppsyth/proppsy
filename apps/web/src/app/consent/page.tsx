import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ConsentForm from './ConsentForm'

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('accepted_terms_at, account_status')
    .eq('id', user.id)
    .single()

  if (profile?.accepted_terms_at) {
    const params = await searchParams
    // Recovery: consent timestamps are set but approval update previously failed.
    // Approve in-place before redirecting so the user doesn't hit /pending-approval.
    if (profile.account_status === 'pending') {
      await admin
        .from('profiles')
        .update({ account_status: 'approved' })
        .eq('id', user.id)
        .eq('account_status', 'pending')
    }
    redirect(params.next ?? '/dashboard')
  }

  const params = await searchParams
  const next = params.next ?? '/dashboard'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src="/logo/logo.png" alt="Proppsy" width={140} height={50} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">ยืนยันการยินยอม</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            กรุณาอ่านและยอมรับข้อกำหนดก่อนเริ่มใช้งาน Proppsy
          </p>

          <ConsentForm next={next} />
        </div>
      </div>
    </div>
  )
}
