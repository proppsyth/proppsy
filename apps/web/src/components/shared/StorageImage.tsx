import Image from 'next/image'
import { getStorageUrl } from '@/lib/storage'

type NextImageProps = React.ComponentProps<typeof Image>

interface Props extends Omit<NextImageProps, 'src'> {
  /** Raw DB value — full URL, storage path, null, or undefined. */
  src: string | null | undefined
  /** Supabase bucket name, used when src is a relative path. Defaults to 'photos'. */
  bucket?: string
  /** Rendered when src resolves to null. Defaults to null (renders nothing). */
  fallback?: React.ReactNode
}

/**
 * Drop-in replacement for next/image that safely handles null / empty / relative
 * Supabase storage URLs. Renders `fallback` instead of crashing when the URL
 * is missing or malformed.
 */
export default function StorageImage({ src, bucket, fallback = null, ...imgProps }: Props) {
  const url = getStorageUrl(src, bucket)
  if (!url) return <>{fallback}</>
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...imgProps} src={url} />
}
