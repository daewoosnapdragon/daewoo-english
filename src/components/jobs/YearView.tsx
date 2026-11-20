'use client'

import { useMemo } from 'react'
import { anchorDate, fmtDay, percent, schoolYear, spanFraction, type AdminEvent, type AdminJob, type AdminRoutine } from '@/lib/adminJobs'
import type { Semester } from '@/types'

// ─── The year at a glance ────────────────────────────────────────
// One line from March to February with every routine's date on it as a
// dot, the semester's own dates as ticks under it, and today as a red
// line. A routine that has no date yet this year shows as a hollow dot
// where the semester's dates put it. Under the line, twelve month tiles
// with the dates and the jobs due in each, so the detail is one glance
// down, never a click away.

const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** One colour per routine, by its position in the list; the same on the line and the tiles. */
export const routineColor = (i: number) => `hsl(${(i * 53 + 10) % 360} 42% 44%)`

interface Mark { date: string; label: string; routineId: string; color: string; ghost: boolean; semesterName?: string | null }

export default function YearView({ ko, today, routines, events, jobs, semesters, nameOf, onPick }: {
  ko: boolean; today: string; routines: AdminRoutine[]; events: AdminEvent[]; jobs: AdminJob[]; semesters: Semester[]
  nameOf: (id: string | null | undefined) => string; onPick: (routineId: string) => void
}) {
  const year = useMemo(() => schoolYear(today), [today])
  const colorOf = (id: string) => routineColor(Math.max(0, routines.findIndex(r => r.id === id)))
  const inYear = (d: string | null | undefined): d is string => !!d && d >= year.from && d <= year.to
  const semsInYear = useMemo(() => semesters.filter(s => !s.is_archived && (inYear(s.start_date) || inYear(s.end_date))), [semesters, year]) // eslint-disable-line react-hooks/exhaustive-deps

  // Every routine date this year, plus a hollow one where a routine with no date would fall.
  const marks = useMemo<Mark[]>(() => {
    const out: Mark[] = []
    events.forEach(e => { const r = routines.find(x => x.id === e.routine_id); if (r && inYear(e.event_date)) out.push({ date: e.event_date, label: r.name, routineId: r.id, color: colorOf(r.id), ghost: false, semesterName: e.label }) })
    routines.forEach(r => {
      if (r.anchor === 'date') return
      semsInYear.forEach(sem => {
        const d = anchorDate(r.anchor, sem)
        if (inYear(d) && !events.some(e => e.routine_id === r.id && e.semester_id === sem.id)) out.push({ date: d, label: r.name, routineId: r.id, color: colorOf(r.id), ghost: true, semesterName: sem.name })
      })
    })
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }, [events, routines, semsInYear, year]) // eslint-disable-line react-hooks/exhaustive-deps

  // The semester's own dates, as ticks under the line.
  const ticks = useMemo(() => {
    const out: { date: string; label: string }[] = []
    semsInYear.forEach(s => {
      if (inYear(s.start_date)) out.push({ date: s.start_date!, label: ko ? `${s.name} 시작` : `${s.name} starts` })
      if (inYear(s.midterm_cutoff_date)) out.push({ date: s.midterm_cutoff_date!, label: ko ? '중간 마감' : 'Midterm cutoff' })
      const rc = s.report_card_cutoff_date || s.grades_due_date
      if (inYear(rc)) out.push({ date: rc!, label: ko ? '성적표 마감' : 'Grades due' })
      if (inYear(s.end_date)) out.push({ date: s.end_date!, label: ko ? `${s.name} 끝` : `${s.name} ends` })
    })
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }, [semsInYear, ko, year]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = (d: string) => `${((spanFraction(d, year.from, year.to) ?? 0) * 100).toFixed(2)}%`
  const monthLabel = (key: string, long = false) => { const m = Number(key.slice(5, 7)); return ko ? `${m}월` : long ? MONTH_LONG_EN[m - 1] : MONTH_EN[m - 1] }
  const thisMonth = today.slice(0, 7)
  const dated = jobs.filter(j => j.due_date && !j.parent_id && j.due_kind !== 'semester')
  const yearLabel = `${year.from.slice(0, 4)}–${year.to.slice(2, 4)}`

  return (
    <div className="grid gap-8">
      {/* ── The line ── */}
      <section>
        <p className="eyebrow mb-1">{ko ? `${yearLabel} 학년도` : `School year ${yearLabel}`} <span className="text-ink-3 normal-case tracking-normal">· {marks.filter(m => !m.ghost).length} {ko ? '개 날짜' : 'dates set'}{marks.some(m => m.ghost) ? ` · ${marks.filter(m => m.ghost).length} ${ko ? '미정' : 'not set yet'}` : ''}</span></p>
        <div className="relative h-[112px] select-none overflow-visible">
          {/* labels above, two staggered rows so neighbours do not sit on each other */}
          {marks.map((m, i) => (
            <button key={`${m.routineId}-${m.date}-${i}`} onClick={() => onPick(m.routineId)} title={`${m.label} · ${fmtDay(m.date, ko)}${m.semesterName ? ` · ${m.semesterName}` : ''}${m.ghost ? (ko ? ' · 아직 날짜 없음' : ' · no date set yet') : ''}`}
              className="absolute -translate-x-1/2 group" style={{ left: pct(m.date), top: i % 2 === 0 ? 0 : 18 }}>
              <span className={`block text-[length:calc(11.5px*var(--ts))] leading-none whitespace-nowrap px-1 rounded ${m.ghost ? 'text-ink-3' : 'text-ink'} group-hover:bg-paper-2`} style={{ color: m.ghost ? undefined : m.color }}>{m.label}</span>
            </button>
          ))}
          {/* the line itself */}
          <div className="absolute left-0 right-0 top-[48px] h-px bg-rule-2" />
          {marks.map((m, i) => (
            <button key={`d-${m.routineId}-${m.date}-${i}`} onClick={() => onPick(m.routineId)} aria-label={`${m.label} ${m.date}`} className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 bg-paper hover:scale-125 transition-transform" style={{ left: pct(m.date), top: 48, borderColor: m.color, background: m.ghost ? undefined : m.color }} />
          ))}
          {/* today */}
          {spanFraction(today, year.from, year.to) !== null && <div className="absolute top-[36px] h-[24px] w-px bg-accent -translate-x-1/2" style={{ left: pct(today) }} title={ko ? '오늘' : 'Today'}><span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[length:calc(11.5px*var(--ts))] text-accent font-semibold">{ko ? '오늘' : 'today'}</span></div>}
          {/* semester ticks */}
          {ticks.map((t, i) => (
            <div key={`${t.date}-${i}`} className="absolute -translate-x-1/2" style={{ left: pct(t.date), top: 52 }} title={`${t.label} · ${fmtDay(t.date, ko)}`}>
              <span className="block w-px h-2 bg-ink-3 mx-auto" />
              <span className="block text-[length:calc(11.5px*var(--ts))] leading-none text-ink-3 whitespace-nowrap -translate-x-1/2 ml-[50%]" style={{ marginTop: i % 2 === 0 ? 2 : 12 }}>{t.label}</span>
            </div>
          ))}
          {/* months */}
          <div className="absolute left-0 right-0 top-[88px] grid grid-cols-12 border-t border-rule">
            {year.months.map(k => <span key={k} className={`text-[length:calc(11.5px*var(--ts))] pt-1 pl-1 border-l border-rule first:border-l-0 ${k === thisMonth ? 'text-ink font-semibold' : 'text-ink-3'}`}>{monthLabel(k)}</span>)}
          </div>
        </div>
      </section>

      {/* ── The tiles ── */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {year.months.map(k => {
          const ms = marks.filter(m => m.date.startsWith(k))
          const ts = ticks.filter(t => t.date.startsWith(k))
          const js = dated.filter(j => j.due_date!.startsWith(k)).sort((a, b) => a.due_date!.localeCompare(b.due_date!))
          const now = k === thisMonth, past = k < thisMonth
          return (
            <div key={k} className={`min-w-0 rounded border p-3 grid gap-2 content-start ${now ? 'border-accent bg-surface' : past ? 'border-rule opacity-70' : 'border-rule bg-surface'}`}>
              <p className={`font-display text-[length:calc(19px*var(--ts))] leading-none ${now ? 'text-accent' : 'text-ink'}`}>{monthLabel(k, true)}<span className="font-body text-[length:calc(11.5px*var(--ts))] text-ink-3 ml-1.5">{k.slice(0, 4)}</span></p>
              {ts.map((t, i) => <p key={i} className="text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-snug">{fmtDay(t.date, ko, false)} · {t.label}</p>)}
              {ms.map((m, i) => (
                <button key={i} onClick={() => onPick(m.routineId)} className="text-left flex items-start gap-1.5 leading-snug">
                  <span className="mt-[5px] w-2 h-2 rounded-full shrink-0 border-2" style={{ borderColor: m.color, background: m.ghost ? undefined : m.color }} />
                  <span className={`text-[length:calc(12.5px*var(--ts))] ${m.ghost ? 'text-ink-3' : 'text-ink font-medium'}`}>{m.label}<span className="text-ink-3 font-normal"> · {fmtDay(m.date, ko, false)}{m.ghost ? (ko ? ' · 미정' : ' · not set') : ''}</span></span>
                </button>
              ))}
              {js.length > 0 && (
                <ul className="border-t border-rule pt-1.5 grid gap-0.5">
                  {js.map(j => <li key={j.id} className={`text-[length:calc(11.5px*var(--ts))] leading-snug truncate ${j.status === 'done' ? 'line-through text-ink-3' : 'text-ink-2'}`} title={j.title}>{fmtDay(j.due_date!, ko, false).replace(/^\w+ /, '')} {j.title}<span className="text-ink-3"> · {j.owner_id ? nameOf(j.owner_id) : '—'}{percent(j) !== null && j.status !== 'done' ? ` · ${percent(j)}%` : ''}</span></li>)}
                </ul>
              )}
              {ms.length === 0 && ts.length === 0 && js.length === 0 && <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3">—</p>}
            </div>
          )
        })}
      </section>
    </div>
  )
}
