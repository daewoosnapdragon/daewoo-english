'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWhatsNew } from './useWhatsNew'
import { startTour } from '@/lib/tour'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

// ─── What's new modal ────────────────────────────────────────────
// Opens once on the dashboard when a batch a teacher has not seen is out:
// one card per highlight (a picture, what changed, how to use it, Try it),
// then a last card listing the rest as one-liners. Done marks the batch
// seen. Later closes it for this session; it comes back next time, and
// the name menu keeps the count until Done.

const LATER_KEY = 'daewoo_whats_new_later'

export default function WhatsNewModal() {
  const { unseen, loaded, markSeen } = useWhatsNew()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!loaded || !unseen.length) return
    try { if (sessionStorage.getItem(LATER_KEY) === unseen[0].date) return } catch {}
    setOpen(true)
  }, [loaded, unseen])

  const highlights = unseen.filter(e => e.highlight)
  const rest = unseen.filter(e => !e.highlight)
  const cards = highlights.length + (rest.length ? 1 : 0)
  const last = i >= cards - 1
  const later = () => { try { sessionStorage.setItem(LATER_KEY, unseen[0]?.date || '') } catch {}; setOpen(false) }
  const done = () => { markSeen(); setOpen(false) }
  const tryIt = (e: typeof unseen[number]) => { later(); if (e.tour) startTour(e.tour, p => router.push(p)); else if (e.path) router.push(e.path) }

  useEffect(() => {
    if (!open) return
    const h = (ev: KeyboardEvent) => { if (ev.key === 'Escape') later(); if (ev.key === 'ArrowRight' && !last) setI(i + 1); if (ev.key === 'ArrowLeft' && i > 0) setI(i - 1); if (ev.key === 'Enter') last ? done() : setI(i + 1) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })
  if (!open || !cards) return null
  const e = highlights[i]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-ink/50" onClick={later}>
      <div onClick={ev => ev.stopPropagation()} className="w-full max-w-[720px] bg-surface border border-rule-2 rounded-lg shadow-lg overflow-hidden">
        {e ? (
          <>
            <div className="relative bg-paper-2 border-b border-rule-2" style={{ aspectRatio: '16 / 9' }}>
              <img src={e.highlight!.image} alt={e.title} className="absolute inset-0 w-full h-full object-cover object-top" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="px-6 py-5">
              <p className="eyebrow eyebrow-accent mb-1.5">What’s new</p>
              <h2 className="font-display text-[26px] leading-tight text-ink">{e.title}</h2>
              <p className="text-[14px] text-ink-2 leading-relaxed mt-2">{e.body}</p>
              <p className="text-[13.5px] text-ink leading-relaxed mt-2"><span className="font-semibold">To use it:</span> {e.highlight!.how}</p>
            </div>
          </>
        ) : (
          <div className="px-6 py-5">
            <p className="eyebrow eyebrow-accent mb-1.5">What’s new</p>
            <h2 className="font-display text-[26px] leading-tight text-ink">And also</h2>
            <ul className="mt-3 grid gap-2">
              {rest.map(r => (
                <li key={r.id} className="grid grid-cols-[6px_minmax(0,1fr)] gap-3 text-[13.5px]">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-ink-2"><span className="font-semibold text-ink">{r.title}.</span> {r.body}{r.path && <> <Link href={r.path} onClick={later} className="text-accent hover:underline whitespace-nowrap">Open →</Link></>}</span>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-ink-3 mt-4">The full list, and how each page works, stay under your name at the top right.</p>
          </div>
        )}
        <div className="px-6 py-3 border-t border-rule-2 bg-paper-2/60 flex items-center gap-3">
          <span className="text-[12px] text-ink-3 tabular-nums">{i + 1} / {cards}</span>
          <button onClick={later} className="text-[12.5px] text-ink-3 hover:text-ink inline-flex items-center gap-1"><X size={12} />Later</button>
          <div className="ml-auto flex items-center gap-2">
            {e && (e.tour || e.path) && <button onClick={() => tryIt(e)} className="h-9 px-3.5 rounded border border-rule-2 text-[13px] text-ink hover:border-ink-3">Try it</button>}
            {i > 0 && <button onClick={() => setI(i - 1)} className="h-9 w-9 rounded border border-rule-2 text-ink-2 hover:text-ink flex items-center justify-center"><ChevronLeft size={14} /></button>}
            {last
              ? <button onClick={done} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover">Done</button>
              : <button onClick={() => setI(i + 1)} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1">Next <ChevronRight size={14} /></button>}
          </div>
        </div>
      </div>
    </div>
  )
}
