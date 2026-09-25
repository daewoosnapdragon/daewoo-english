'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWhatsNew } from './useWhatsNew'
import { startTour } from '@/lib/tour'
import { Sparkles } from 'lucide-react'

// The dashboard card: the batch a teacher has not seen yet. Got it hides it
// for good; the full list stays under What's new in the name menu.

export default function WhatsNewCard() {
  const { unseen, markSeen } = useWhatsNew()
  const router = useRouter()
  if (!unseen.length) return null
  const shown = unseen.slice(0, 4)
  return (
    <section className="border border-accent/40 bg-accent-soft/30 rounded-lg px-5 py-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
        <p className="eyebrow eyebrow-accent inline-flex items-center gap-1.5"><Sparkles size={12} />New since you were last here · {unseen.length}</p>
        <div className="flex items-center gap-3 text-[12.5px]">
          <Link href="/whats-new" className="text-ink-2 hover:text-ink">All changes</Link>
          <button onClick={markSeen} className="h-7 px-3 rounded border border-rule-2 bg-surface text-ink-2 hover:text-ink font-medium">Got it</button>
        </div>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {shown.map(e => (
          <div key={e.id} className="text-[13px]">
            <p className="font-semibold text-ink">{e.title}</p>
            <p className="text-ink-2 leading-snug mt-0.5">{e.body}</p>
            <p className="mt-1 flex gap-3 text-[12px]">
              {e.tour && <button onClick={() => startTour(e.tour!, p => router.push(p))} className="text-accent hover:underline">Show me</button>}
              {e.guide && <Link href={`/guide#${e.guide}`} className="text-ink-3 hover:text-ink">In the guide</Link>}
            </p>
          </div>
        ))}
      </div>
      {unseen.length > shown.length && <p className="text-[12px] text-ink-3 mt-3">And {unseen.length - shown.length} more under All changes.</p>}
    </section>
  )
}
