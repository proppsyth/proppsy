import Image from 'next/image'

interface BannerImageProps {
  src: string
  alt?: string
  sizes?: string
  priority?: boolean
  /** Extra classes on the wrapper div (e.g. rounded-xl) */
  className?: string
  /** Cap the rendered height in px. Image stays 16:9 internally via object-cover. */
  maxHeight?: number
  /** Overlays positioned absolutely on top of the image */
  children?: React.ReactNode
}

/**
 * Standard banner image renderer.
 * Always 16:9, object-cover object-center — identical crop everywhere.
 * maxHeight caps display height without changing the crop anchor.
 */
export default function BannerImage({
  src,
  alt = 'แบนเนอร์',
  sizes = '100vw',
  priority = false,
  className = '',
  maxHeight,
  children,
}: BannerImageProps) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: '16/9', maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-center"
        sizes={sizes}
        priority={priority}
      />
      {children}
    </div>
  )
}
