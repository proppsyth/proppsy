'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Crown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { TOPUP_PACKAGES } from '@/lib/credits/constants'

interface Props {
  balance: number
  required: number
  onClose: () => void
}

export default function UpsellModal({ balance, required, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        >
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-1">
            <div>
              <h2 className="text-base font-bold text-gray-900">เครดิตไม่เพียงพอ</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                มี {balance} เครดิต · ต้องการ {required} เครดิต
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition mt-1"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="px-5 pb-6 mt-4 space-y-5">
            {/* Top-up packages */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                เติมเครดิต
              </p>
              <div className="space-y-2">
                {TOPUP_PACKAGES.map(pkg => (
                  <Link
                    key={pkg.credits}
                    href={`/credits/topup?credits=${pkg.credits}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition group"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{pkg.credits} เครดิต</p>
                      <p className="text-xs text-gray-500">{pkg.price.toLocaleString()} บาท</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Plan upgrade divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  หรืออัพเกรดแผน
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={onClose}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 rounded-xl border border-violet-100 transition"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Professional Plan</p>
                <p className="text-xs text-gray-500 mt-0.5">รับ 100 เครดิต/เดือน · รีเซ็ตอัตโนมัติ</p>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-400" />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
