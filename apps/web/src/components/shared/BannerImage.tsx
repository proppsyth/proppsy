import Image from 'next/image'

interface BannerImageProps {
  src: string
  alt?: string
  sizes?: string
  priority?: boolean
  /** Extra classes on the wrapper div (e.g. rounded-xl) */
  className?: string
  /**
   * @deprecated maxHeight is no longer used — BannerImage maintains 16:9 aspect ratio
   * uniformly across all viewports. Passing this prop has no effect.
   */
  maxHeight?: number
  /** Overlays positioned absolutely on top of the image */
  children?: React.ReactNode
}

/**
 * Standard banner image renderer.
 * Always 16:9 aspect-ratio, object-cover object-center.
 * Capped at 520px on large screens so it doesn't dominate the page.
 * Looks identical on all viewport widths — the same center crop every time.
 */
export default function BannerImage({
  src,
  alt = 'แบนเนอร์',
  sizes = '100vw',
  priority = false,
  className = '',
  children,
}: BannerImageProps) {
  return (
    <div className={`relative w-full aspect-[16/9] max-h-[520px] overflow-hidden ${className}`}>
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
