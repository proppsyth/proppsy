import Image from 'next/image'
import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = { title: 'ตั้งรหัสผ่านใหม่ — Proppsy' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email = '' } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo.png" alt="Proppsy" width={160} height={56} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-gray-500 text-sm mb-6">กรอกรหัส OTP จากอีเมลและรหัสผ่านใหม่ของคุณ</p>
          <ResetPasswordForm initialEmail={email} />
        </div>
      </div>
    </div>
  )
}
