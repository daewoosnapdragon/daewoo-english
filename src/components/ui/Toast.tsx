'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp, type ToastMessage } from '@/lib/context'

// ─── Toast ───────────────────────────────────────────────────────
// A slip of real paper (public/brand/paper-slip.webp) that slides up at a
// slight angle. A pencil line under the message runs down the time left;
// click the slip to put it away. An action (Undo) keeps it up longer.

const DURATION = 4000, ERROR_DURATION = 6500, ACTION_DURATION = 8000

export default function Toast() {
  const { toast } = useApp()
  const [shown, setShown] = useState<ToastMessage | null>(null)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setLeaving(true)
    timer.current = setTimeout(() => { setShown(null); setLeaving(false) }, 260)
  }

  useEffect(() => {
    if (!toast) return
    if (timer.current) clearTimeout(timer.current)
    setShown(toast); setLeaving(false)
    const ms = toast.action ? ACTION_DURATION : toast.tone === 'error' ? ERROR_DURATION : DURATION
    timer.current = setTimeout(hide, ms)
  }, [toast])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!shown) return null
  const ms = shown.action ? ACTION_DURATION : shown.tone === 'error' ? ERROR_DURATION : DURATION
  return (
    <div className="fixed bottom-5 right-5 z-[1000] no-print" style={{ marginRight: 'env(safe-area-inset-right, 0px)', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div key={shown.id} onClick={hide} role={shown.tone === 'error' ? 'alert' : 'status'} aria-live={shown.tone === 'error' ? 'assertive' : 'polite'}
        className={`paper-slip cursor-pointer ${shown.tone === 'error' ? 'is-error' : ''} ${leaving ? 'slip-out' : 'slip-in'}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="slip-msg">{shown.message}</span>
          {shown.action && (
            <button type="button" className="slip-action flex-none" onClick={e => { e.stopPropagation(); shown.action!.onClick(); hide() }}>{shown.action.label}</button>
          )}
        </div>
        <div className="slip-drain" style={{ animationDuration: `${ms}ms` }} />
      </div>
    </div>
  )
}
