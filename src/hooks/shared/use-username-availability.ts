import { useQuery } from '@tanstack/react-query'
import { checkUsername } from '@/api/users'
import { usernameSchema } from '@/lib/schema'
import { useDebouncedValue } from '@/hooks/shared/use-debounced-value'

export type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'unavailable'; reason: string }

/**
 * Live "is this username free?" while typing. The server answers from its
 * bloom filter ("definitely free" instantly) and confirms "probably taken"
 * with a DB lookup. Format errors are caught locally first — no request.
 * `current` is the user's own username (profile page), always "available".
 */
export function useUsernameAvailability(value: string, current?: string): AvailabilityState {
  const username = value.trim().toLowerCase()
  const debounced = useDebouncedValue(username, 350)
  const parsed = usernameSchema.safeParse(debounced)
  const isOwn = Boolean(current) && debounced === current
  const shouldCheck = parsed.success && !isOwn

  const query = useQuery({
    queryKey: ['username-available', debounced],
    queryFn: () => checkUsername(debounced),
    select: res => res.body,
    enabled: shouldCheck,
    staleTime: 30 * 1000,
    retry: false,
  })

  if (!username || username === current) return { status: 'idle' }
  if (username !== debounced) return { status: 'checking' }
  if (!parsed.success) return { status: 'unavailable', reason: parsed.error.issues[0]?.message ?? 'Invalid username' }
  if (query.isPending || query.isFetching) return { status: 'checking' }
  if (query.isError) return { status: 'idle' } // server re-validates on save
  return query.data?.available ? { status: 'available' } : { status: 'unavailable', reason: query.data?.reason ?? 'Not available' }
}
