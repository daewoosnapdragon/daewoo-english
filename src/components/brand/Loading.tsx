'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'

// ─── Loading ─────────────────────────────────────────────────────
// Two kinds, chosen by what is about to appear:
//   lines  — for lists and tables: ruled lines in the shape of the rows to
//            come, with a soft light passing across. Nothing for 250 ms.
//   quiet  — for everything else (calendars, report cards, charts, forms):
//            the space is kept and nothing shows; only a load that takes
//            longer than a second gets a small grey “Loading…”.
// Neither animates toward a finish, so a quick load never looks cut off.

export default function Loading({ rows = 5, kind = 'lines', label, className = '' }: { rows?: number; kind?: 'lines' | 'quiet'; label?: string; className?: string }) {
  const { language } = useApp()
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), kind === 'quiet' ? 1000 : 250); return () => clearTimeout(t) }, [kind])
  const text = label || (language === 'ko' ? '불러오는 중' : 'Loading')
  if (kind === 'quiet') {
    return (
      <div role="status" aria-live="polite" className={`quiet-wait ${className}`} style={{ minHeight: rows * 34 }}>
        <span className={`quiet-wait-text${shown ? ' is-shown' : ''}`}>{text}…</span>
      </div>
    )
  }
  return (
    <div role="status" aria-live="polite" className={`ruled-wait${shown ? ' is-shown' : ''} ${className}`}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="ruled-wait-line" />)}
      <span className="sr-only">{text}</span>
    </div>
  )
}
