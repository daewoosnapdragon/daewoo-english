'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { WHATS_NEW, todayISO } from '@/content/whats-new'
import { useWhatsNew } from './useWhatsNew'
import { startTour } from '@/lib/tour'

// ─── What's new ──────────────────────────────────────────────────
// Every released entry, newest batch first. Admins also see held entries,
// marked scheduled, so a batch can be read before its Monday.

export default function WhatsNewView() {
  const { currentTeacher } = useApp()
  const { unseen, markSeen } = useWhatsNew()
  const router = useRouter()
  const isAdmin = currentTeacher?.role === 'admin'
  const today = todayISO()
  const entries = WHATS_NEW.filter(e => isAdmin || e.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  const dates = Array.from(new Set(entries.map(e => e.date)))
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const unseenIds = new Set(unseen.map(e => e.id))

  return (
    <div className="px-8 py-6 animate-fade-in max-w-[860px]">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">Daewoo English</p>
          <h1 className="font-display text-[34px] leading-none text-ink">What’s new</h1>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <Link href="/guide" className="text-ink-2 hover:text-ink">How to use this app →</Link>
          {unseen.length > 0 && <button onClick={markSeen} className="h-8 px-3 rounded border border-rule-2 text-ink-2 hover:text-ink">Mark all as read</button>}
        </div>
      </div>
      {dates.map(d => (
        <section key={d} className="mb-8">
          <h2 className="eyebrow border-b border-rule-2 pb-1.5 mb-3 flex items-center gap-2">{fmt(d)}{d > today && <span className="px-1.5 py-0.5 rounded bg-warn-soft text-warn text-[10px]">scheduled</span>}</h2>
          <div className="divide-y divide-rule">
            {entries.filter(e => e.date === d).map(e => (
              <article key={e.id} className="py-3 grid grid-cols-[14px_minmax(0,1fr)] gap-3">
                <span className={`mt-2 w-2 h-2 rounded-full ${unseenIds.has(e.id) ? 'bg-accent' : 'bg-transparent'}`} />
                <div>
                  {e.highlight && <img src={e.highlight.image} alt="" className="w-full max-w-[520px] rounded border border-rule-2 mb-3" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                  <h3 className="text-[15px] font-semibold text-ink">{e.title}</h3>
                  <p className="text-[13.5px] text-ink-2 leading-relaxed mt-1 max-w-[65ch]">{e.body}</p>
                  {e.highlight && <p className="text-[13px] text-ink leading-relaxed mt-1 max-w-[65ch]"><span className="font-semibold">To use it:</span> {e.highlight.how}</p>}
                  <p className="mt-1.5 flex gap-4 text-[12.5px]">
                    {e.tour && <button onClick={() => startTour(e.tour!, p => router.push(p))} className="text-accent hover:underline">Show me</button>}
                    {e.path && !e.tour && <Link href={e.path} className="text-accent hover:underline">Open</Link>}
                    {e.guide && <Link href={`/guide#${e.guide}`} className="text-ink-3 hover:text-ink">In the guide</Link>}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
