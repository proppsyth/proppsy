import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import ConsentForm from './ConsentForm'

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('accepted_terms_at')
    .eq('id', user.id)
    .single()

  if (profile?.accepted_terms_at) {
    const params = await searchParams
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
