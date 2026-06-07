'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import {
  PenLine, Type, Trash2, Check, Shield, FileText, Loader2, ExternalLink,
  AlertCircle, Building2, Users, CalendarDays, BadgeCheck,
} from 'lucide-react'
import { recordSignerViewed, submitSignature } from '@/lib/sign/actions'

interface Props {
  token: string
  signerName: string
  signerRoleLabel: string
  contractId: string
  docLabel: string
  projectName: string | null
  unitNo: string | null
  floor: number | null
  roomType: string | null
  ownerFullName: string
  tenantFullName: string
  docxUrl: string | null
  pdfUrl: string | null
  rentPrice: number | null
  depositAmount: number | null
  depositMonths: number | null
  contractMonths: number | null
  moveInDate: string | null
  endDate: string | null
}

type SignMode = 'drawn' | 'typed'

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function SigningClient({
  token, signerName: initialSignerName, signerRoleLabel,
  contractId, docLabel,
  projectName, unitNo, floor, roomType,
  ownerFullName, tenantFullName,
  docxUrl, pdfUrl,
  rentPrice, depositAmount, depositMonths, contractMonths,
  moveInDate, endDate,
}: Props) {
  const [mode, setMode] = useState<SignMode>('drawn')
  const [displayName, setDisplayName] = useState(initialSignerName)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [done, setDone] = useState(false)
  const [signedAt, setSignedAt] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Track viewed on mount
  useEffect(() => {
    recordSignerViewed(token, navigator.userAgent).catch(() => {})
  }, [token])

  // Init canvas whenever draw mode is active
  useEffect(() => {
    if (mode !== 'drawn') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasDrawn(false)
  }, [mode])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    drawing.current = true
    lastPos.current = getPos(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPos.current) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasDrawn(true)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    drawing.current = false
    lastPos.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  function buildTypedDataUrl(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 600; canvas.height = 200
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 600, 200)
    ctx.font = 'italic 52px Georgia, "Times New Roman", serif'
    ctx.fillStyle = '#0f172a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(displayName, 300, 100)
    return canvas.toDataURL('image/png')
  }

  function handleSubmit() {
    setError('')
    if (!displayName.trim()) {
      setError('กรุณากรอกชื่อผู้ลงนาม')
      return
    }
    if (mode === 'drawn' && !hasDrawn) {
      setError('กรุณาวาดลายเซ็นก่อนดำเนินการ')
      return
    }
    if (!agreed) {
      setError('กรุณายืนยันว่าได้อ่านและยอมรับเงื่อนไข')
      return
    }

    startTransition(async () => {
      const dataUrl = mode === 'drawn'
        ? (canvasRef.current?.toDataURL('image/png') ?? null)
        : buildTypedDataUrl()

      const res = await submitSignature({
        token,
        signatureDataUrl: dataUrl,
        signatureType: mode,
        signerName: displayName.trim(),
        userAgent: navigator.userAgent,
      })

      if (res.error) { setError(res.error); return }

      setSignedAt(new Date().toLocaleString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }))
      setDone(true)
    })
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center pt-14 px-4">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto">
            <BadgeCheck className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ลงนามสำเร็จ</h1>
            <p className="text-sm text-gray-500 mt-1">{docLabel} · {contractId}</p>
          </div>
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm divide-y divide-gray-100 text-left">
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-500">ผู้ลงนาม</span>
              <span className="font-semibold text-gray-900">{displayName}</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-500">บทบาท</span>
              <span className="font-semibold text-gray-900">{signerRoleLabel}</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-500">เวลาลงนาม</span>
              <span className="font-semibold text-gray-900 text-right ml-4">{signedAt}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Proppsy E-Sign · ลายเซ็นอิเล็กทรอนิกส์ที่มีผลทางกฎหมาย
          </p>
        </div>
      </div>
    )
  }

  const canSubmit = agreed && !isPending && displayName.trim().length > 0 && (mode === 'drawn' ? hasDrawn : true)

  // Build property label
  const propertyParts = [projectName, unitNo].filter(Boolean)
  const propertyLabel = propertyParts.length > 0 ? propertyParts.join(' ห้อง ') : 'ไม่ระบุทรัพย์'
  const propertyMeta  = [floor ? `ชั้น ${floor}` : null, roomType].filter(Boolean).join(' · ')

  // ── Signing form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fc] pb-32">

      {/* ── Blue header ── */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-600 px-5 pt-10 pb-7 text-white">
        <div className="max-w-md mx-auto">
          <p className="text-blue-200 text-xs font-medium tracking-widest uppercase mb-1">Proppsy E-Sign</p>
          <h1 className="text-xl font-bold leading-snug">{docLabel}</h1>
          <p className="text-blue-200 text-sm mt-0.5 font-mono">{contractId}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-3 pt-4">

        {/* ── Contract summary ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 space-y-4">

            {/* Property */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">ทรัพย์สิน</p>
                <p className="text-sm font-semibold text-gray-900 break-words">{propertyLabel}</p>
                {propertyMeta && <p className="text-xs text-gray-500 mt-0.5">{propertyMeta}</p>}
              </div>
            </div>

            {/* Parties */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">ผู้ให้เช่า</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{ownerFullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">ผู้เช่า</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{tenantFullName}</p>
                </div>
              </div>
            </div>

            {/* Financials + dates */}
            {(rentPrice || depositAmount || contractMonths || moveInDate) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {rentPrice && (
                    <div>
                      <p className="text-xs text-gray-400">ค่าเช่า/เดือน</p>
                      <p className="text-sm font-semibold text-gray-900">฿{fmt(rentPrice)}</p>
                    </div>
                  )}
                  {depositAmount && (
                    <div>
                      <p className="text-xs text-gray-400">
                        เงินประกัน{depositMonths ? ` (${depositMonths} เดือน)` : ''}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">฿{fmt(depositAmount)}</p>
                    </div>
                  )}
                  {contractMonths && (
                    <div>
                      <p className="text-xs text-gray-400">ระยะสัญญา</p>
                      <p className="text-sm font-semibold text-gray-900">{contractMonths} เดือน</p>
                    </div>
                  )}
                  {moveInDate && (
                    <div>
                      <p className="text-xs text-gray-400">วันเริ่มต้น</p>
                      <p className="text-sm font-semibold text-gray-900">{fmtDate(moveInDate)}</p>
                    </div>
                  )}
                  {endDate && (
                    <div>
                      <p className="text-xs text-gray-400">วันสิ้นสุด</p>
                      <p className="text-sm font-semibold text-gray-900">{fmtDate(endDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Signer badge */}
          <div className="mx-4 mb-4 mt-1 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(displayName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">ลงนามในฐานะ {signerRoleLabel}</p>
              {displayName ? (
                <p className="text-sm font-bold text-blue-900 truncate">{displayName}</p>
              ) : (
                <p className="text-xs text-blue-400 italic">กรุณากรอกชื่อด้านล่าง</p>
              )}
            </div>
          </div>
        </div>

        {/* ── View full document ── */}
        {(pdfUrl || docxUrl) && (
          <a
            href={pdfUrl ?? docxUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-2xl text-white text-sm font-semibold transition shadow-sm"
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            ดูเอกสารฉบับเต็ม{pdfUrl ? ' (PDF)' : ' (.docx)'}
            <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
          </a>
        )}

        {/* ── Signature card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['drawn', 'typed'] as SignMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition border-b-2 ${
                  mode === m
                    ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {m === 'drawn' ? <PenLine className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                {m === 'drawn' ? 'วาดลายเซ็น' : 'พิมพ์ชื่อ'}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            {/* Draw mode */}
            {mode === 'drawn' && (
              <>
                <p className="text-xs text-gray-400 text-center">วาดลายเซ็นด้วยนิ้วหรือเมาส์</p>
                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white touch-none relative select-none">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={220}
                    className="w-full cursor-crosshair"
                    style={{ touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-300 text-sm select-none">← วาดที่นี่ →</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ล้างลายเซ็น
                </button>

                {!initialSignerName && (
                  <div>
                    <label className="block text-xs text-gray-500 font-medium mb-1.5">ชื่อผู้ลงนาม *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                    />
                  </div>
                )}
              </>
            )}

            {/* Type mode */}
            {mode === 'typed' && (
              <>
                <p className="text-xs text-gray-400 text-center">พิมพ์ชื่อ-นามสกุลเพื่อสร้างลายเซ็น</p>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
                {displayName.trim() && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 text-center">
                    <p
                      className="text-[2rem] leading-tight text-gray-900"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
                    >
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">ตัวอย่างลายเซ็น</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Agreement ── */}
        <label className="flex items-start gap-3 cursor-pointer bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex-shrink-0 mt-0.5">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                agreed ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
              }`}
              onClick={() => setAgreed(v => !v)}
            >
              {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="sr-only"
            />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            ข้าพเจ้าได้อ่านและเข้าใจเนื้อหาทั้งหมดในเอกสาร และยินยอมลงนามด้วย
            <strong className="text-gray-900"> ลายเซ็นอิเล็กทรอนิกส์นี้</strong> ซึ่งมีผลทางกฎหมาย
            เทียบเท่าลายเซ็นสด ตาม พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์
          </p>
        </label>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1.5 pb-2">
          <Shield className="w-3.5 h-3.5" />
          ระบบลงนามอิเล็กทรอนิกส์ที่ปลอดภัย — Proppsy E-Sign
        </p>
      </div>

      {/* ── Sticky submit ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-xl px-4 py-3">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-bold rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isPending
              ? <><Loader2 className="w-5 h-5 animate-spin" />กำลังบันทึก...</>
              : <><PenLine className="w-5 h-5" />ลงนามเอกสาร</>
            }
          </button>
        </div>
      </div>

    </div>
  )
}
