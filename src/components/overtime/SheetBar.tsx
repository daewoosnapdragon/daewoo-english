'use client'

import { useEffect, useState } from 'react'
import { fmtMinutes, fmtWon, rangeSpan, type SheetSel } from '@/lib/overtime'
import { X } from 'lucide-react'

// ─── What is on the sheet ────────────────────────────────────────
// One line above the table: the weeks or dates the sheet will cover, with
// their time and won, and Clear. On the right, two dates for a range typed
// by hand (Oct 1 to Nov 7), which replaces the ticks; ticking a week
// afterwards goes back to ticks.

interface Props {
  sel: SheetSel
  setSel: (s: SheetSel) => void
  /** "Nov 23 – Dec 4, 2026", or empty when nothing is on the sheet. */
  label: string
  total: { minutes: number; won: number; count: number }
  ko: boolean
  /** Shown when nothing is ticked. */
  hint: string
  /** Shown after the label when the totals cover more people than one (admin). */
  suffix?: string
}

const dateInp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-[140px] focus:outline-none focus:border-ink-2'

export default function SheetBar({ sel, setSel, label, total, ko, hint, suffix }: Props) {
  const [from, setFrom] = useState(sel.kind === 'range' ? sel.from : '')
  const [to, setTo] = useState(sel.kind === 'range' ? sel.to : '')
  // Ticking a week leaves the range: empty the date fields.
  useEffect(() => { if (sel.kind === 'weeks') { setFrom(''); setTo('') } else { setFrom(sel.from); setTo(sel.to) } }, [sel])

  const pick = (f: string, t: string) => {
    setFrom(f); setTo(t)
    if (rangeSpan(f, t)) setSel({ kind: 'range', from: f, to: t })
  }
  const backwards = !!from && !!to && from > to
  const clear = () => setSel({ kind: 'weeks', keys: [] })

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 min-h-[36px]">
      <p className="text-[13px] text-ink-2 flex flex-wrap items-center gap-x-2">
        <span>{ko ? '양식에 들어갈 기간' : 'On the sheet'}:</span>
        {label ? <>
          <span className="font-semibold text-ink">{label}</span>
          <span className="tabular-nums">· {fmtMinutes(total.minutes, ko)} · {fmtWon(total.won, ko)}{suffix ? ` · ${suffix}` : ''}</span>
          <button onClick={clear} className="ml-1 h-6 px-1.5 rounded text-[12px] text-ink-2 hover:text-ink hover:bg-paper-2 inline-flex items-center gap-1"><X size={11} />{ko ? '지우기' : 'Clear'}</button>
        </> : <span className="text-ink-3">{hint}</span>}
      </p>
      <div className="ml-auto flex items-center gap-1.5 text-[12.5px] text-ink-2">
        <span>{ko ? '또는 날짜로' : 'or dates'}</span>
        <input type="date" value={from} onChange={e => pick(e.target.value, to)} className={dateInp} aria-label={ko ? '시작 날짜' : 'Sheet from'} />
        <span>–</span>
        <input type="date" value={to} min={from || undefined} onChange={e => pick(from, e.target.value)} className={dateInp} aria-label={ko ? '끝 날짜' : 'Sheet to'} />
        {backwards && <span className="text-ink-2">{ko ? '시작이 끝보다 늦습니다' : 'From is after To'}</span>}
      </div>
    </div>
  )
}
