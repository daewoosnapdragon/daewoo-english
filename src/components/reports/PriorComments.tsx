'use client'

import { useState } from 'react'

// ─── What parents already read ──────────────────────────────────
// The comments a family has already received, shown full width above the
// comment editor so the teacher reads them at a normal line length before
// writing. One document at a time: a tab per recent document, newest first,
// and anything older than the most recent few under "Earlier". Screen only.

export interface PriorComment { text: string; label: string }

const MUTED = '#64748b'
/** How many documents get a tab of their own before the rest fold into "Earlier". */
const TABS = 3

export default function PriorComments({ comments, className = '' }: { comments: PriorComment[]; className?: string }) {
  const [tab, setTab] = useState(0)
  if (comments.length === 0) return null
  const recent = comments.slice(0, TABS)
  const earlier = comments.slice(TABS)
  const showing = tab < recent.length ? [recent[tab]] : earlier
  return (
    <section aria-label="What parents already read" className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-[length:calc(11.5px*var(--ts))] tracking-[1.6px] uppercase font-semibold m-0" style={{ color: MUTED }}>What parents already read</h3>
        <div role="tablist" aria-label="Document" className="flex items-center gap-1 flex-wrap">
          {recent.map((c, i) => (
            <button key={i} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
              className={`px-2 py-0.5 rounded text-[length:calc(11.5px*var(--ts))] whitespace-nowrap ${tab === i ? 'bg-ink text-paper font-semibold' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}>{c.label}</button>
          ))}
          {earlier.length > 0 && (
            <button type="button" role="tab" aria-selected={tab === recent.length} onClick={() => setTab(recent.length)}
              className={`px-2 py-0.5 rounded text-[length:calc(11.5px*var(--ts))] whitespace-nowrap ${tab === recent.length ? 'bg-ink text-paper font-semibold' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}>Earlier ({earlier.length})</button>
          )}
        </div>
      </div>
      <div role="tabpanel" className="rounded-xl px-5 py-4 flex flex-col gap-4" style={{ background: '#f8fafc', border: '1px solid #DFE4EB' }}>
        {showing.map((c, i) => (
          <figure key={i} className="m-0 flex flex-col gap-1 max-w-[70ch]">
            {showing.length > 1 && <figcaption className="text-[length:calc(11.5px*var(--ts))] font-semibold" style={{ color: MUTED }}>{c.label}</figcaption>}
            <blockquote className="m-0 text-[length:calc(13px*var(--ts))] leading-[1.6] whitespace-pre-wrap" style={{ color: '#334155' }}>{c.text}</blockquote>
          </figure>
        ))}
      </div>
    </section>
  )
}
