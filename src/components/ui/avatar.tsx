import { avatarColor, cn, initials } from '@/lib/utils'

/** The profile photo when there is one, otherwise initials on a colour derived from the username. */
export function Avatar({
  name,
  seed,
  src,
  size = 'md',
  className,
}: {
  name: string
  seed: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-2xl' }
  if (src) {
    return (
      // A same-origin, session-protected, already-small square image: next/image would add nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" aria-hidden className={cn('shrink-0 rounded-full bg-primary-soft object-cover', sizes[size], className)} />
    )
  }
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-display font-bold text-white select-none', sizes[size], className)}
      style={{ backgroundColor: avatarColor(seed) }}
    >
      {initials(name)}
    </span>
  )
}
