import { useEffect, useState } from 'react'
import { ImageIcon } from './icons'

/** Renders a Blob (or null) as an <img>, managing the object URL lifecycle. */
export function Thumb({
  blob,
  alt = '',
  className = '',
  rounded = 'rounded-lg',
}: {
  blob: Blob | null | undefined
  alt?: string
  className?: string
  rounded?: string
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--surface-3)] text-[var(--text-3)] ${rounded} ${className}`}
      >
        <ImageIcon />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`object-cover ${rounded} ${className}`}
    />
  )
}
