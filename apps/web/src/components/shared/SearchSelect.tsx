'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface Option {
  id: string
  label: string
  sub?: string
}

interface Props {
  value: string
  onChange: (id: string) => void
  options: Option[]
  placeholder: string
  emptyText?: string
}

export default function SearchSelect({ value, onChange, options, placeholder, emptyText = 'ไม่พบรายการ' }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.id === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub ?? '').toLowerCase().includes(query.toLowerCase()) ||
        o.id.toLowerCase().includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => { setOpen(o => !o); }}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      >
        {open ? (
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="พิมพ์เพื่อค้นหา..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
        ) : (
          <span className={`flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
            {selected ? (
              <>{selected.label}{selected.sub && <span className="text-gray-400 ml-1 text-xs">{selected.sub}</span>}</>
            ) : placeholder}
          </span>
        )}
        {value && !open ? (
          <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400 text-center">{emptyText}</p>
          ) : (
            <>
              <div
                onClick={() => select('')}
                className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
              >
                — ไม่เลือก —
              </div>
              {filtered.map(o => (
                <div
                  key={o.id}
                  onClick={() => select(o.id)}
                  className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between gap-2 ${
                    o.id === value ? 'bg-blue-50 text-blue-700' : 'text-gray-800'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.sub && <span className="text-xs text-gray-400 flex-shrink-0">{o.sub}</span>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
