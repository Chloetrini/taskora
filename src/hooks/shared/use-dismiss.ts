import { useEffect, useRef, type RefObject } from 'react'

/**
 * While `active`, calls `onDismiss` when the user presses Escape or presses
 * anywhere OUTSIDE `ref` — so menus and inline confirmations close on an
 * outside click, not only on their own Cancel/close button.
 *
 * `ignore` is for the element that opens the thing (the menu button): it
 * handles its own click, and must not count as "outside" or the press would
 * close the menu and the click would immediately reopen it.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
  ignore?: RefObject<HTMLElement | null>
) {
  // Always the latest callback, without re-subscribing the listeners every render.
  const latest = useRef(onDismiss)
  useEffect(() => {
    latest.current = onDismiss
  })

  useEffect(() => {
    if (!active) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target) || ignore?.current?.contains(target)) return
      latest.current()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [active, ref, ignore])
}
