import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getRequireApproval } from '@/lib/settings'

async function signOutAction() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = await createAdminClient()
  const [{ data: profile }, requireApproval] = await Promise.all([
    admin.from('profiles').select('accepted_terms_at, account_status, name').eq('id', user.id).single(),
    getRequireApproval(),
  ])

  if (!profile) redirect('/login')
  if (profile.account_status === 'rejected') redirect('/login')
  if (profile.account_status === 'approved') redirect('/dashboard')
  if (!profile.accepted_terms_at) redirect('/consent')

  // When require_approval is off, auto-approve as a safety-net (e.g. saveConsent failed silently).
  if (!requireApproval) {
    const { error } = await admin
      .from('profiles')
      .update({ account_status: 'approved' })
      .eq('id', user.id)
      .eq('account_status', 'pending')
    if (!error) redirect('/dashboard')
  }

  // require_approval is on — show the waiting page.
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <Image src="/logo/logo.png" alt="Proppsy" width={120} height={43} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-7">
          <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>

          <h1 className="text-lg font-semibold text-gray-900 mb-2">บัญชีรอการอนุมัติ</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            บัญชีของคุณอยู่ระหว่างการตรวจสอบ กรุณารอการยืนยันจากทีมงาน
            หรือติดต่อผู้ดูแลระบบหากใช้เวลานานเกินไป
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition"
            >
              ตรวจสอบสถานะอีกครั้ง
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl text-sm transition"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>

          <p className="text-xs text-gray-400 mt-5">
            ติดต่อ:{' '}
            <a href="mailto:support@proppsy.com" className="text-blue-500 hover:underline">
              support@proppsy.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
