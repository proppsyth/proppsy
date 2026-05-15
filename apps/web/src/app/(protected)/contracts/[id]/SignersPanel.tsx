'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Plus, Check, Link2, Share2, Trash2, Loader2, RefreshCw,
  UserCheck, Clock, Eye, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { ContractSigner, SignerRole } from '@/types'
import {
  addContractSigner, removeContractSigner, regenerateSignerToken,
} from '@/lib/sign/actions'

interface PartyInfo {
  name: string
  phone: string
}

interface Props {
  contractId: string
  initialSigners: ContractSigner[]
  owner?: PartyInfo | null
  customer?: PartyInfo | null
}

const ROLE_OPTIONS: { value: SignerRole; label: string }[] = [
  { value: 'tenant',   label: 'ผู้เช่า' },
  { value: 'owner',    label: 'เจ้าของ' },
  { value: 'co_agent', label: 'Co-Agent' },
  { value: 'witness',  label: 'พยาน' },
]

const ROLE_COLORS: Record<SignerRole, string> = {
  tenant:   'bg-violet-100 text-violet-700',
  owner:    'bg-orange-100 text-orange-700',
  co_agent: 'bg-teal-100 text-teal-700',
  witness:  'bg-gray-100 text-gray-600',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'รอลงนาม', color: 'text-amber-600',  icon: Clock },
  viewed:   { label: 'เปิดดูแล้ว', color: 'text-blue-600',  icon: Eye },
  signed:   { label: 'ลงนามแล้ว', color: 'text-green-600', icon: UserCheck },
  declined: { label: 'ปฏิเสธ',   color: 'text-red-600',   icon: AlertCircle },
}

function SignerRow({
  signer,
  contractId,
  onRemoved,
  onTokenRefreshed,
}: {
  signer: ContractSigner
  contractId: string
  onRemoved: (id: string) => void
  onTokenRefreshed: (id: string, newToken: string) => void
}) {
  const [token, setToken] = useState(signer.sign_token)
  const [copiedId, setCopiedId] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [isRemoving, startRemove] = useTransition()
  const [isRefreshing, startRefresh] = useTransition()
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    setHasNativeShare('share' in navigator)
  }, [])

  const statusCfg = STATUS_CONFIG[signer.status] ?? { label: 'รอลงนาม', color: 'text-amber-600', icon: Clock }
  const StatusIcon = statusCfg.icon
  const roleLabel = ROLE_OPTIONS.find(r => r.value === signer.signer_role)?.label ?? signer.signer_role

  // Compute sign link in event handlers only — never during render
  function getSignLink() {
    return `${window.location.origin}/sign/${token}`
  }

  function copyLink() {
    navigator.clipboard.writeText(getSignLink())
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  function shareViaLine() {
    const link = getSignLink()
    const text = `กรุณาลงนามเอกสาร ${contractId}: ${link}`
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function shareNative() {
    if (!navigator.share) return
    try {
      await navigator.share({ title: `ลงนามเอกสาร ${contractId}`, url: getSignLink() })
    } catch {}
  }

  function handleRemove() {
    setRemoveError('')
    startRemove(async () => {
      const res = await removeContractSigner(signer.id, contractId)
      if (res.error) { setRemoveError(res.error); return }
      onRemoved(signer.id)
    })
  }

  function handleRefreshToken() {
    startRefresh(async () => {
      const res = await regenerateSignerToken(signer.id, contractId)
      if (res.sign_token) {
        setToken(res.sign_token)
        onTokenRefreshed(signer.id, res.sign_token)
      }
    })
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Signer header */}
      <div className="flex items-center gap-3 p-3">
        <div className={`px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ${ROLE_COLORS[signer.signer_role]}`}>
          {roleLabel}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {signer.signer_name ?? <span className="text-gray-400 italic">ไม่ระบุชื่อ</span>}
          </p>
          {signer.signer_phone && (
            <p className="text-xs text-gray-400">{signer.signer_phone}</p>
          )}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${statusCfg.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusCfg.label}
        </div>
      </div>

      {/* Signed info */}
      {signer.status === 'signed' && signer.signed_at && (
        <div className="px-3 pb-2 text-xs text-gray-400">
          ลงนาม {new Date(signer.signed_at).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
          {signer.signed_name && ` · ${signer.signed_name}`}
        </div>
      )}

      {/* Share bar — only for unsigned */}
      {signer.status !== 'signed' && (
        <div className="border-t border-gray-100 bg-gray-50 p-2 flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
              copiedId
                ? 'bg-green-100 text-green-700'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {copiedId ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {copiedId ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
          </button>

          <button
            type="button"
            onClick={shareViaLine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#00B900] text-white hover:bg-[#00a300] transition flex-shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            LINE
          </button>

          {hasNativeShare && (
            <button
              type="button"
              onClick={shareNative}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex-shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              แชร์
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            title="สร้างลิงก์ใหม่"
            className="p-1.5 text-gray-400 hover:text-gray-600 transition rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
          >
            {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isRemoving}
            title="ลบผู้ลงนาม"
            className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-white border border-transparent hover:border-red-200"
          >
            {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {removeError && (
        <p className="px-3 pb-2 text-xs text-red-600">{removeError}</p>
      )}
    </div>
  )
}

export default function SignersPanel({ contractId, initialSigners, owner, customer }: Props) {
  const [signers, setSigners] = useState<ContractSigner[]>(initialSigners)
  const [showForm, setShowForm] = useState(false)
  const [role, setRole] = useState<SignerRole>('tenant')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [addError, setAddError] = useState('')
  const [isAdding, startAdd] = useTransition()

  function partyForRole(r: SignerRole): PartyInfo | null {
    if (r === 'tenant') return customer ?? null
    if (r === 'owner') return owner ?? null
    return null
  }

  function handleRoleChange(newRole: SignerRole) {
    setRole(newRole)
    const party = partyForRole(newRole)
    setName(party?.name ?? '')
    setPhone(party?.phone ?? '')
  }

  function handleAdd() {
    setAddError('')
    startAdd(async () => {
      const res = await addContractSigner(contractId, role, name, phone)
      if (res.error) { setAddError(res.error); return }
      if (res.signer) {
        setSigners(prev => [...prev, res.signer!])
        setName('')
        setPhone('')
        setShowForm(false)
      }
    })
  }

  function handleRemoved(id: string) {
    setSigners(prev => prev.filter(s => s.id !== id))
  }

  function handleTokenRefreshed(id: string, newToken: string) {
    setSigners(prev => prev.map(s => s.id === id ? { ...s, sign_token: newToken } : s))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">ผู้ลงนาม</h2>
        <button
          type="button"
          onClick={() => {
            if (!showForm) {
              const party = partyForRole(role)
              setName(party?.name ?? '')
              setPhone(party?.phone ?? '')
            }
            setShowForm(v => !v)
          }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition"
        >
          {showForm
            ? <><ChevronUp className="w-3.5 h-3.5" />ปิด</>
            : <><Plus className="w-3.5 h-3.5" />เพิ่ม</>
          }
        </button>
      </div>

      <div className="p-3 space-y-2">
        {signers.length === 0 && !showForm && (
          <p className="text-xs text-gray-400 text-center py-3">
            ยังไม่มีผู้ลงนาม — กด <span className="font-medium text-blue-600">+ เพิ่ม</span> เพื่อสร้างลิงก์ลงนาม
          </p>
        )}

        {signers.map(s => (
          <SignerRow
            key={s.id}
            signer={s}
            contractId={contractId}
            onRemoved={handleRemoved}
            onTokenRefreshed={handleTokenRefreshed}
          />
        ))}

        {/* Add form */}
        {showForm && (
          <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 space-y-2.5">
            <p className="text-xs font-semibold text-gray-600">เพิ่มผู้ลงนาม</p>

            <select
              value={role}
              onChange={e => handleRoleChange(e.target.value as SignerRole)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            {/* Name: auto-filled for owner/tenant, manual for others */}
            {partyForRole(role)?.name ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-green-700 font-medium">ดึงข้อมูลอัตโนมัติ</p>
                  <p className="text-sm text-gray-800 font-semibold truncate">{name}</p>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            )}

            {/* Phone: auto-filled or manual */}
            {partyForRole(role)?.phone ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                {phone}
              </div>
            ) : (
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="เบอร์โทรศัพท์ (ไม่บังคับ)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            )}

            {addError && (
              <p className="text-xs text-red-600">{addError}</p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {isAdding
                ? <><Loader2 className="w-4 h-4 animate-spin" />กำลังสร้างลิงก์...</>
                : <><Plus className="w-4 h-4" />สร้างลิงก์ลงนาม</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
