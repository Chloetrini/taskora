import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/** 'YYYY-MM-DD' for today in the viewer's own timezone. */
export const todayKey = (): string => format(new Date(), 'yyyy-MM-dd')

export type DueTone = 'overdue' | 'today' | 'soon' | 'later'

/**
 * Human label for a calendar-day due date. parseISO on a bare date gives
 * local midnight, so this never shifts a day across timezones.
 */
export const describeDueDate = (dueDate: string, completed: boolean): { label: string; tone: DueTone } => {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date())
  const short = format(parseISO(dueDate), 'd MMM')

  if (days < 0 && !completed) return { label: `Overdue, ${short}`, tone: 'overdue' }
  if (days === 0) return { label: 'Due today', tone: 'today' }
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon' }
  if (days > 1 && days < 7) return { label: `Due ${format(parseISO(dueDate), 'EEEE')}`, tone: 'soon' }
  return { label: `Due ${short}`, tone: 'later' }
}

/** "Chloe Trinity" → "CT". */
export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

// Avatar background from the username, so each person keeps the same colour.
const AVATAR_COLORS = ['#2F5BEA', '#16936B', '#B5487A', '#C77414', '#6B4FD6', '#0E8A9E', '#8A5A2B']
export const avatarColor = (seed: string): string => {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export const greeting = (date = new Date()): string => {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Only allow same-site relative paths for ?next= (no open redirects). */
export const safeNextPath = (next: string | null): string =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
