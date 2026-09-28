'use client'

import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

// Must match the key read by the pre-paint script in app/layout.tsx.
const STORAGE_KEY = 'taskora-theme'

/*
 * The source of truth for the theme is the `dark` class on <html>, which the
 * pre-paint script in app/layout.tsx sets before React loads (so there's no
 * white flash). React reads it through useSyncExternalStore:
 *  - during hydration it uses getServerSnapshot ('light'), so the client's
 *    first render matches the server HTML exactly (no hydration mismatch);
 *  - right after, it re-renders with the real value from the DOM.
 * Don't read localStorage/matchMedia in a useState initializer — that renders
 * differently on server and client and breaks hydration (bug we hit).
 */

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  // Follow the OS theme live, unless the user picked one themselves.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = (e: MediaQueryListEvent) => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch {
      // storage blocked
    }
    if (!saved) applyTheme(e.matches ? 'dark' : 'light', false)
  }
  media.addEventListener('change', onSystemChange)
  return () => {
    listeners.delete(callback)
    media.removeEventListener('change', onSystemChange)
  }
}

const getSnapshot = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
const getServerSnapshot = (): Theme => 'light'

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // storage blocked — the choice just won't survive a reload
    }
  }
  listeners.forEach(notify => notify())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const toggleTheme = () => applyTheme(theme === 'dark' ? 'light' : 'dark', true)
  return { theme, toggleTheme }
}

/** Kept so the provider tree in app/providers.tsx doesn't change. No state lives here. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
