import { Clock } from 'lucide-react'
import Link from 'next/link'

interface Props {
  message?: string
}

/**
 * Banner shown to pending users (account_status = 'pending') who cannot
 * publish listings or create contracts until admin approves their account.
 */
export default function PendingApprovalBanner({ message }: Props) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          {message ?? 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากแอดมิน'}
        </p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          คุณสามารถเพิ่มข้อมูลทรัพย์ เจ้าของ และลูกค้าได้ตามปกติ
          แต่ยังไม่สามารถ <strong>เผยแพร่ประกาศ</strong> หรือ <strong>ออกเอกสารสัญญา</strong> ได้ จนกว่าแอดมินจะอนุมัติ
        </p>
        <p className="text-xs text-amber-600 mt-1">
          ตรวจสอบให้แน่ใจว่า{' '}
          <Link href="/profile" className="underline hover:text-amber-800">
            โปรไฟล์ของคุณ
          </Link>{' '}
          มีข้อมูลครบถ้วน (เบอร์โทร, เลขบัตรประชาชน, สำเนาบัตร) เพื่อให้แอดมินตรวจสอบได้รวดเร็ว
        </p>
      </div>
    </div>
  )
}
