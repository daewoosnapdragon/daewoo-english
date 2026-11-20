'use client'

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ─── Overlay ─────────────────────────────────────────────────────
// Every modal, drawer and full-screen sheet renders through this. It portals
// its children to <body> so they escape the page wrapper: anything that makes
// the page its own stacking context (an opacity or transform animation, a
// filter) would otherwise trap a `fixed z-[100]` modal under the sticky
// Masthead (z-40), which then covers its top bar and swallows its scroll.
//
// An Overlay opened from inside another Overlay renders in place, so nested
// dialogs keep stacking above their parent exactly as before.
//
// While any Overlay with `lockScroll` is open, the page behind it does not
// scroll, and the scrollbar's width is kept as padding so nothing shifts.

const InOverlay = createContext(false)

const noSubscribe = () => () => {}

let locks = 0
let saved: { overflow: string; paddingRight: string } | null = null
function lockBody() {
  if (locks++ > 0) return
  const body = document.body
  const gap = window.innerWidth - document.documentElement.clientWidth
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  body.style.overflow = 'hidden'
  if (gap > 0) body.style.paddingRight = `${gap}px`
}
function unlockBody() {
  if (--locks > 0 || !saved) return
  document.body.style.overflow = saved.overflow
  document.body.style.paddingRight = saved.paddingRight
  saved = null
}

export default function Overlay({ children, lockScroll = true }: { children: ReactNode; lockScroll?: boolean }) {
  const nested = useContext(InOverlay)
  // false during SSR and hydration, true on the client afterwards.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false)

  useEffect(() => {
    if (!lockScroll) return
    lockBody()
    return unlockBody
  }, [lockScroll])

  if (nested) return <>{children}</>
  if (!isClient) return null
  return createPortal(<InOverlay.Provider value={true}>{children}</InOverlay.Provider>, document.body)
}
