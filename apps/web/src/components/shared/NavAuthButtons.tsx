'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NavAuthButtons() {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user)
      setChecked(true)
    })
  }, [])

  // Render placeholder width so layout doesn't shift
  if (!checked) {
    return <div className="w-20 h-8" aria-hidden />
  }

  return authed ? (
    <Link
      href="/dashboard"
      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
    >
      แดชบอร์ด
    </Link>
  ) : (
    <>
      <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition px-2 py-1.5 whitespace-nowrap">
        ลงชื่อเข้าใช้
      </Link>
      <Link href="/register" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
        ลงทะเบียน
      </Link>
    </>
  )
}
