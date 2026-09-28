import 'server-only'

/**
 * Escapes regex special characters in user search text so `.*` or a
 * pathological pattern (ReDoS) matches literally.
 */
export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const isValidObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)

/** 'YYYY-MM-DD' shifted by `days`, in UTC calendar terms. */
export const addDays = (isoDay: string, days: number): string => {
  const d = new Date(`${isoDay}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const utcToday = (): string => new Date().toISOString().slice(0, 10)
