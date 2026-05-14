import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopupForm from './TopupForm'
import { getCreditBalance } from '@/lib/credits/actions'

export default async function TopupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const balance = await getCreditBalance()

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-28 lg:pb-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">เติมเครดิต</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          เครดิตปัจจุบัน: <span className="font-bold text-gray-900">{balance.balance}</span>
        </p>
      </div>
      <TopupForm currentBalance={balance.balance} />
    </div>
  )
}
