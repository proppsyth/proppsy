// Reusable HOT badge for premium listings — CSS glow animation defined in globals.css
export default function HotBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'md'
    ? 'text-xs px-2 py-0.5'
    : 'text-[10px] px-1.5 py-0.5'

  return (
    <span
      className={`inline-block font-extrabold tracking-widest rounded-full text-white animate-hot-glow ${cls}`}
      style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
    >
      HOT
    </span>
  )
}
