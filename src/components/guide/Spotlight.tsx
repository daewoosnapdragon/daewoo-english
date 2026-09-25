'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TOUR_EVENT, TOUR_KEY, type Tour } from '@/lib/tour'
import { X } from 'lucide-react'

// ─── Spotlight ───────────────────────────────────────────────────
// Runs a parked tour: dims the page, cuts a hole around the step's anchor,
// and floats a caption with Next. An anchor that is not on the page gets
// the caption alone, centered near the top. Esc or Done ends it.

export default function Spotlight() {
  const pathname = usePathname()
  const [tour, setTour] = useState<Tour | null>(null)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const load = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(TOUR_KEY); if (!raw) return
      const t = JSON.parse(raw) as Tour
      if (t.path.split('#')[0] !== pathname) return
      sessionStorage.removeItem(TOUR_KEY)
      setTour(t); setI(0)
    } catch {}
  }, [pathname])
  useEffect(() => { const id = setTimeout(load, 400); return () => clearTimeout(id) }, [load])
  useEffect(() => { window.addEventListener(TOUR_EVENT, load); return () => window.removeEventListener(TOUR_EVENT, load) }, [load])

  const step = tour?.steps[i]
  const find = (anchor?: string) => anchor ? document.querySelector<HTMLElement>(/^[#.]/.test(anchor) ? anchor : `[data-guide="${anchor}"]`) : null
  useEffect(() => {
    if (!step) { setRect(null); return }
    const el = find(step.anchor)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const measure = () => { const e = find(step.anchor); setRect(e ? e.getBoundingClientRect() : null) }
    const t1 = setTimeout(measure, 350)
    window.addEventListener('scroll', measure, true); window.addEventListener('resize', measure)
    return () => { clearTimeout(t1); window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure) }
  }, [step])
  useEffect(() => {
    if (!tour) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setTour(null) } if (e.key === 'Enter') { e.preventDefault(); next() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })
  if (!tour || !step) return null
  const last = i >= tour.steps.length - 1
  const next = () => last ? setTour(null) : setI(i + 1)
  const pad = 6
  const capTop = rect ? Math.min(window.innerHeight - 140, rect.bottom + pad + 10) : 120
  const capLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 356) : (window.innerWidth - 340) / 2

  return (
    <div className="fixed inset-0 z-[80]" onClick={() => setTour(null)}>
      {rect
        ? <div className="fixed rounded-md pointer-events-none" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(20, 18, 14, 0.55)', outline: '2px solid rgb(var(--accent))' }} />
        : <div className="fixed inset-0 bg-ink/50" />}
      <div onClick={e => e.stopPropagation()} className="fixed w-[340px] bg-surface border border-rule-2 rounded-md shadow-lg p-4" style={{ top: capTop, left: capLeft }}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13.5px] text-ink leading-snug">{step.text}</p>
          <button onClick={() => setTour(null)} aria-label="Close" className="w-6 h-6 rounded hover:bg-paper-2 text-ink-3 hover:text-ink flex items-center justify-center flex-shrink-0"><X size={13} /></button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-ink-3 tabular-nums">{tour.steps.length > 1 ? `${i + 1} / ${tour.steps.length}` : ''}{!rect && step.anchor ? (tour.steps.length > 1 ? ' · ' : '') + 'On this page' : ''}</span>
          <button onClick={next} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover">{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
