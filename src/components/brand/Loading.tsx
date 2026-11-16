'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'

// ─── Loading ─────────────────────────────────────────────────────
// Three small ink dots rising in turn, in the middle of the space the
// content will take. They loop rather than finish, so a quick load never
// looks cut off. Nothing shows for the first 400 ms, so a quick load never
// flashes them; a load longer than a second adds a small grey “Loading…”.
// `kind` is kept for older call sites.

export default function Loading({ rows = 5, kind = 'lines', label, className = '' }: { rows?: number; kind?: 'lines' | 'quiet'; label?: string; className?: string }) {
  const { language } = useApp()
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    const a = setTimeout(() => setStage(s => Math.max(s, 1) as 1 | 2), 400)
    const b = setTimeout(() => setStage(2), 1000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [kind])
  const text = label || (language === 'ko' ? '불러오는 중' : 'Loading')
  return (
    <div role="status" aria-live="polite" className={`ink-wait${stage > 0 ? ' is-shown' : ''}${stage > 1 ? ' is-late' : ''} ${className}`} style={{ minHeight: Math.min(rows * 34, 200) }}>
      <span className="ink-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="ink-wait-text">{text}…</span>
    </div>
  )
}
