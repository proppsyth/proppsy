import Image from 'next/image'

interface Props {
  url?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_PX = { sm: 32, md: 48, lg: 72, xl: 96 } as const
const TEXT_CLS = { sm: 'text-xs', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' } as const

export default function AgentAvatar({ url, name, size = 'md', className = '' }: Props) {
  const px = SIZE_PX[size]
  const initial = name?.trim()?.[0]?.toUpperCase() ?? 'A'

  const base = `rounded-full overflow-hidden flex-shrink-0 ${className}`

  if (url) {
    return (
      <div style={{ width: px, height: px }} className={`${base} border border-gray-100`}>
        <Image
          src={url}
          alt={name ?? 'agent'}
          width={px}
          height={px}
          className="object-cover w-full h-full"
          unoptimized
        />
      </div>
    )
  }

  return (
    <div
      style={{ width: px, height: px }}
      className={`${base} bg-blue-100 flex items-center justify-center text-blue-700 font-bold ${TEXT_CLS[size]}`}
    >
      {initial}
    </div>
  )
}
