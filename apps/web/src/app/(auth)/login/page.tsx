import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ — Proppsy' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect = '/dashboard' } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo.png" alt="Proppsy" width={160} height={56} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 text-sm mb-6">สำหรับเอเจนต์อสังหาริมทรัพย์</p>
          <LoginClient redirectTo={redirect} />
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-500">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">ลงทะเบียน</Link>
          </p>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 block">← กลับหน้าหลัก</Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Real Estate Agent Management Platform</p>
      </div>
    </div>
  )
}
