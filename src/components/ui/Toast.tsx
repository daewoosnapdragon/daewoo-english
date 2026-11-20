'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp, type ToastMessage } from '@/lib/context'
import DrawnCheck from '@/components/brand/DrawnCheck'

// ─── Toast ───────────────────────────────────────────────────────
// A small ink card at the bottom right: a check (or a ! for a problem),
// the message, an optional action such as Undo, and a hairline that runs
// down the time left. Click it to put it away.

const DURATION = 4000, ERROR_DURATION = 6500, ACTION_DURATION = 8000

export default function Toast() {
  const { toast } = useApp()
  const [shown, setShown] = useState<ToastMessage | null>(null)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setLeaving(true)
    timer.current = setTimeout(() => { setShown(null); setLeaving(false) }, 170)
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
  const error = shown.tone === 'error'
  const ms = shown.action ? ACTION_DURATION : error ? ERROR_DURATION : DURATION
  return (
    <div className="fixed bottom-5 right-5 z-[1000] no-print" style={{ marginRight: 'env(safe-area-inset-right, 0px)', marginBottom: 'max(env(safe-area-inset-bottom, 0px), var(--tabbar-h, 0px))' }}>
      <div key={shown.id} onClick={hide} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}
        className={`toast-card cursor-pointer ${leaving ? 'toast-out' : 'toast-in'}`}>
        <div className="toast-row">
          {error ? <span className="toast-bang" aria-hidden="true">!</span> : <DrawnCheck size={15} />}
          <span className="flex-1">{shown.message}</span>
          {shown.action && (
            <button type="button" className="toast-action" onClick={e => { e.stopPropagation(); shown.action!.onClick(); hide() }}>{shown.action.label}</button>
          )}
        </div>
        <div className="toast-time" style={{ animationDuration: `${ms}ms` }} />
      </div>
    </div>
  )
}
