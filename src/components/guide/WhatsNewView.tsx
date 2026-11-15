'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useWhatsNew } from './useWhatsNew'
import { startTour } from '@/lib/tour'
import { canManageWhatsNew } from '@/lib/activity'
import { setOverride, type EffectiveEntry, type WhatsNewOverrides } from '@/lib/whatsNewOverrides'
import { REPLAY_KEY } from './WhatsNewModal'
import { CalendarClock, RotateCcw } from 'lucide-react'

// ─── What's new ──────────────────────────────────────────────────
// Every released entry, newest batch first. Admins also see held entries,
// marked scheduled, so a batch can be read before its Monday, and a
// Coming up box with each future batch. Manage shows every entry with a
// switch and a date, so an entry can be turned off, moved to another day
// or released now without a deploy; a changed entry says what the code
// has, with Reset to put it back. Only the Snapdragon account gets the
// Coming up box and Manage; other admins see scheduled entries read-only.

const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const fmtShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const dateInp = 'h-7 px-1.5 bg-surface border border-rule-2 rounded text-[12px] text-ink focus:outline-none focus:border-ink-2'
const smallBtn = 'h-7 px-2 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink hover:border-ink-3 disabled:opacity-40'

export default function WhatsNewView() {
  const { currentTeacher, showToast } = useApp()
  const { entries, scheduled, unseen, loaded, today, markSeen, overrides, saveOverrides } = useWhatsNew()
  const router = useRouter()
  const isAdmin = currentTeacher?.role === 'admin'
  const canManage = canManageWhatsNew(currentTeacher)
  const [manage, setManage] = useState(false)

  const shown = entries
    .filter(e => (isAdmin || canManage) ? (manage || !e.off) : (!e.off && e.date <= today))
    .sort((a, b) => b.date.localeCompare(a.date))
  const dates = Array.from(new Set(shown.map(e => e.date)))
  const unseenIds = new Set(unseen.map(e => e.id))
  const offCount = entries.filter(e => e.off).length

  const save = async (next: WhatsNewOverrides, what: string) => {
    const err = await saveOverrides(next, what)
    showToast(err ? `Error: ${err}` : what)
  }
  const setDate = (e: EffectiveEntry, date: string) => { if (date) save(setOverride(overrides, e.id, { date: date === e.codeDate ? undefined : date }), `${e.title} → ${fmtShort(date)}`) }
  const setOff = (e: EffectiveEntry, off: boolean) => save(setOverride(overrides, e.id, { off }), `${e.title} ${off ? 'turned off' : 'turned on'}`)
  const reset = (e: EffectiveEntry) => save(setOverride(overrides, e.id, { off: false, date: undefined }), `${e.title} reset to ${fmtShort(e.codeDate)}`)
  const moveBatch = (from: string, to: string) => {
    if (!to || to === from) return
    const ids = entries.filter(e => !e.off && e.date === from)
    let next = overrides
    for (const e of ids) next = setOverride(next, e.id, { date: to === e.codeDate ? undefined : to })
    save(next, `${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} moved from ${fmtShort(from)} to ${fmtShort(to)}`)
  }
  const batchDates = Array.from(new Set(scheduled.map(e => e.date)))

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
          <button onClick={() => { try { sessionStorage.setItem(REPLAY_KEY, '1') } catch {}; router.push('/') }} title="Opens the dashboard with the popup other teachers see on their first visit after a release" className="h-8 px-3 rounded border border-rule-2 text-ink-2 hover:text-ink">See the popup again</button>
          {canManage && <button onClick={() => setManage(m => !m)} aria-pressed={manage} className={`h-8 px-3 rounded border text-[13px] ${manage ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>Manage</button>}
        </div>
      </div>

      {canManage && loaded && (scheduled.length > 0 || manage) && (
        <section className="mb-8 p-4 rounded border border-rule-2 bg-paper-2/60">
          <h2 className="eyebrow flex items-center gap-2 mb-2"><CalendarClock size={13} className="text-accent" />Coming up</h2>
          {batchDates.length === 0 && <p className="text-[13px] text-ink-2">Nothing is scheduled. Every entry that is on is already out.</p>}
          <div className="grid gap-2">
            {batchDates.map(d => {
              const batch = scheduled.filter(e => e.date === d)
              return (
                <div key={d} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 items-start text-[13px]">
                  <div>
                    <p className="text-ink"><span className="font-semibold">{fmt(d)}</span> <span className="text-ink-3">· {batch.length} {batch.length === 1 ? 'entry' : 'entries'}</span></p>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{batch.map(e => e.title).join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => moveBatch(d, today)} className={smallBtn} title="Teachers see this batch from now">Release today</button>
                    <label className="flex items-center gap-1.5 text-[12px] text-ink-3">Move to<input type="date" value={d} onChange={ev => moveBatch(d, ev.target.value)} className={dateInp} /></label>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[12px] text-ink-3 mt-3">
            Entries are written in the code with a release date. Changes made here are kept in the database and apply to everyone at once: the page, the popup, the dot under your name and ⌘K.
            {offCount > 0 && <> {offCount} {offCount === 1 ? 'entry is' : 'entries are'} off{manage ? '' : '; Manage shows them'}.</>}
            {!manage && <> Manage shows a switch and a date on every entry.</>}
          </p>
        </section>
      )}

      {dates.map(d => (
        <section key={d} className="mb-8">
          <h2 className="eyebrow border-b border-rule-2 pb-1.5 mb-3 flex items-center gap-2">{fmt(d)}{d > today && <span className="px-1.5 py-0.5 rounded bg-warn-soft text-warn text-[10px]">scheduled</span>}</h2>
          <div className="divide-y divide-rule">
            {shown.filter(e => e.date === d).map(e => (
              <article key={e.id} className={`py-3 grid grid-cols-[14px_minmax(0,1fr)] gap-3 ${e.off ? 'opacity-60' : ''}`}>
                <span className={`mt-2 w-2 h-2 rounded-full ${unseenIds.has(e.id) ? 'bg-accent' : 'bg-transparent'}`} />
                <div>
                  {manage && canManage && (
                    <div className="flex items-center gap-3 flex-wrap mb-2 text-[12px]">
                      <button role="switch" aria-checked={!e.off} onClick={() => setOff(e, !e.off)} title={e.off ? 'Off: nobody sees it. Click to turn on.' : 'On. Click to turn off.'}
                        className={`relative w-9 h-5 rounded-full transition-colors ${e.off ? 'bg-rule-2' : 'bg-accent'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${e.off ? 'left-0.5' : 'left-[18px]'}`} />
                      </button>
                      <span className={`font-medium ${e.off ? 'text-ink-3' : e.date > today ? 'text-warn' : 'text-ink-2'}`}>{e.off ? 'Off' : e.date > today ? 'Scheduled' : 'Live'}</span>
                      <label className="flex items-center gap-1.5 text-ink-3">Date<input type="date" value={e.date} onChange={ev => setDate(e, ev.target.value)} className={dateInp} /></label>
                      {e.date > today && <button onClick={() => setDate(e, today)} className={smallBtn}>Release today</button>}
                      {e.overridden && <button onClick={() => reset(e)} className={`${smallBtn} inline-flex items-center gap-1`} title="Back to what the code says"><RotateCcw size={11} />Reset{e.date !== e.codeDate && <span className="text-ink-3">· code says {fmtShort(e.codeDate)}</span>}</button>}
                    </div>
                  )}
                  {e.highlight && <img src={e.highlight.image} alt="" className="w-full max-w-[520px] rounded border border-rule-2 mb-3" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                  <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">{e.title}{e.off && <span className="px-1.5 py-0.5 rounded bg-paper-2 text-ink-3 text-[10px] font-medium">off</span>}</h3>
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
      {loaded && dates.length === 0 && <p className="text-[13.5px] text-ink-2">Nothing here yet.</p>}
    </div>
  )
}
