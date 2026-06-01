'use client'

import { useState, useTransition } from 'react'

export interface EditableRowsState<TRow> {
  items: TRow[]
  saved: boolean
  saveError: string
  isPending: boolean
  addRow: (row?: TRow) => void
  removeRow: (key: string) => void
  updateRow: (key: string, updates: Partial<TRow>) => void
  handleSave: (saveFn: (items: TRow[]) => Promise<{ error?: string }>) => void
}

export function useEditableRows<TRow, K extends keyof TRow>(options: {
  initialItems: TRow[]
  makeEmpty: () => TRow
  keyField: K
}): EditableRowsState<TRow> {
  const [items, setItems] = useState<TRow[]>(options.initialItems)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isPending, startTransition] = useTransition()

  const getKey = (row: TRow): string => String(row[options.keyField])

  function addRow(row?: TRow) {
    setItems(prev => [...prev, row ?? options.makeEmpty()])
    setSaved(false)
  }

  function removeRow(key: string) {
    setItems(prev => prev.filter(r => getKey(r) !== key))
    setSaved(false)
  }

  function updateRow(key: string, updates: Partial<TRow>) {
    setItems(prev => prev.map(r => getKey(r) === key ? { ...r, ...updates } : r))
    setSaved(false)
  }

  function handleSave(saveFn: (items: TRow[]) => Promise<{ error?: string }>) {
    setSaveError('')
    setSaved(false)
    startTransition(async () => {
      const res = await saveFn(items)
      if (res.error) { setSaveError(res.error); return }
      setSaved(true)
    })
  }

  return { items, saved, saveError, isPending, addRow, removeRow, updateRow, handleSave }
}
