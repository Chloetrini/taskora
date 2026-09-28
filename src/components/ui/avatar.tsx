import { avatarColor, cn, initials } from '@/lib/utils'

export function Avatar({ name, seed, size = 'md', className }: { name: string; seed: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-2xl' }
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
