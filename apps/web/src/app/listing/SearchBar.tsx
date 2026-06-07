'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

export default function SearchBar({ currentQ, targetPath }: { currentQ: string; targetPath?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(currentQ)

  const dest = targetPath ?? pathname

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = targetPath ? new URLSearchParams() : new URLSearchParams(searchParams.toString())
    if (q.trim()) {
      params.set('q', q.trim())
    } else {
      params.delete('q')
    }
    router.push(`${dest}${params.size > 0 ? '?' + params.toString() : ''}`)
  }

  function handleClear() {
    setQ('')
    const params = targetPath ? new URLSearchParams() : new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.push(`${dest}${params.size > 0 ? '?' + params.toString() : ''}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-xl mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="ค้นหาโครงการ ย่าน หรือพื้นที่..."
        className="w-full pl-11 pr-12 py-3.5 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 placeholder:text-gray-400 bg-white shadow-md"
      />
      {q ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition"
      >
        <Search className="w-4 h-4 text-white" />
      </button>
    </form>
  )
}
