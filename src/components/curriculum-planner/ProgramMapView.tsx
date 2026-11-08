'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classToColor, getKSTDateString } from '@/lib/utils'
import { teacherForClass } from '@/lib/classTeacher'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, STRAND_LABEL, splitUnitTitle } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, viewsFor, boardLanes, halfOf, holidayWeeks, teachingToColumns, termDates, todayPosition, viewWeeks, yearWeeks, type HolidayCounts, type View } from '@/lib/curriculumPacing'
import { barsAtWeek, planTogether, weekOfBar, type MapRow } from '@/lib/curriculumMap'
import { usePlanner } from './usePlanner'
import PeriodsLine from './PeriodsLine'
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Users } from 'lucide-react'

// ─── Program map ─────────────────────────────────────────────────
// One week at a time for every class and grade: a row each, a column per
// strand, and the unit each class is on written in the cell. Above the
// table, book by book, what the week's classes can do together: who is on
// the same unit this week, and who already finished a unit another class
// is on, so their slides and notes are ready. Rows use each class teacher's
// own plan where there is one (and their lesson plans, for the classes
// trying that out), so the map shows what is really happening.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })
/** A class's plan at the year and view being looked at here. */
const boardLink = (cls: string, grade: number, at?: { year: string; view: string; week: number }) => `#plans?cls=${encodeURIComponent(cls)}&grade=${grade}${at ? `&year=${encodeURIComponent(at.year)}&view=${at.view}` : ''}`

export default function ProgramMapView() {
  const { language, semesters, activeSemester } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const { teachers } = useTeachers()
  const today = getKSTDateString()
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])
  const [year, setYear] = useState<string>(activeSemester?.academic_year || '')
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const [viewPick, setViewPick] = useState<View | null>(null)
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  // A half with no dates is not offered; neither is Year unless both have them.
  const views = useMemo(() => viewsFor(yw), [yw])
  const view: View = viewPick && views.includes(viewPick) ? viewPick : views.includes(halfOf(semesters, theYear, today)) ? halfOf(semesters, theYear, today) : views[0]
  const half = view === 'year' ? 'spring' : view
  const weeks = useMemo(() => viewWeeks(yw, view), [yw, view])
  const N = weeks.length
  const [away, setAway] = useState<Record<number, AwayDay[]>>({})
  const [week, setWeek] = useState<number | null>(null)          // null: this week
  const [only, setOnly] = useState<string | null>(null)          // one level, or all
  const [showAllNotes, setShowAllNotes] = useState(false)

  // Away days per grade for the year, since holidays differ by grade.
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!from || !to) { setAway({}); return }
    let on = true
    Promise.all(GRADES.map(g => loadAwayDays(from, to, g).then(a => [g, a] as const))).then(all => { if (on) setAway(Object.fromEntries(all)) })
    return () => { on = false }
  }, [semesters, theYear])
  useEffect(() => { setWeek(null) }, [theYear, view])

  // Holidays per grade and half → counts and column sets.
  const holidayFor = useMemo(() => {
    const m = new Map<number, { hc: HolidayCounts; cols: Set<number>; names: Map<number, string> }>()
    for (const g of GRADES) {
      const a = away[g] || []
      const hs = holidayWeeks(a, yw.spring), hf = holidayWeeks(a, yw.fall)
      const names = new Map<number, string>()
      weeks.forEach(w => { const h = w.half || half; const key = view === 'year' && h === 'fall' ? w.n - yw.spring.length : w.n; const nm = (h === 'spring' ? hs : hf).get(key); if (nm) names.set(w.n, nm) })
      m.set(g, { hc: { spring: hs.size, fall: hf.size }, cols: new Set(names.keys()), names })
    }
    return m
  }, [away, yw, weeks, view, half])

  const rows = useMemo<MapRow[]>(() => {
    const out: MapRow[] = []
    for (const cls of PLACED_ENGLISH_CLASSES) {
      const teacherId = teacherForClass(teachers, cls)?.id || null
      for (const grade of GRADES) {
        const placements = p.placements.filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master)
        if (!placements.length) continue
        const h = holidayFor.get(grade)
        const lanes = boardLanes(placements, p.pacing, p.units, p.books, p.series, view, yw, h?.hc)
        const bars = teachingToColumns(lanes.flatMap(l => l.bars), h?.cols || new Set(), N)
        if (bars.length) out.push({ key: `${cls}|${grade}`, cls, grade, teacherId, bars })
      }
    }
    return out
  }, [p.placements, p.pacing, p.units, p.books, p.series, teachers, theYear, view, yw, holidayFor, N])
  const doneSet = useMemo(() => new Set(p.done.map(d => `${d.placement_id}|${d.unit_id}`)), [p.done])
  const todayPos = todayPosition(weeks, today)
  const nowWeek = todayPos !== null ? Math.floor(todayPos) : 1
  const wk = Math.min(Math.max(1, week ?? nowWeek), Math.max(1, N))
  const notes = useMemo(() => planTogether(rows, wk), [rows, wk])
  const strandsShown = useMemo(() => STRANDS.filter(st => rows.some(r => r.bars.some(b => (b.series?.strand || 'other') === st))), [rows])
  const viewLabel = (v: View) => v === 'year' ? (ko ? '한 해' : 'Year') : (ko ? TERM_LABEL[v].ko : TERM_LABEL[v].en)
  const weekName = (n: number) => view === 'year' ? (weeks[n - 1]?.half === 'fall' ? `F${n - yw.spring.length}` : `S${n}`) : String(n)
  const teacherName = (teacherId: string | null) => teachers.find(t => t.id === teacherId)?.name.split(' ')[0] || ''
  const schoolHoliday = (() => { for (const g of GRADES) { const nm = holidayFor.get(g)?.names.get(wk); if (nm) return nm } return '' })()

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-ink-3">{ko ? '아직 준비되지 않았습니다.' : 'Class plans are not set up yet.'}</p>

  const levels = PLACED_ENGLISH_CLASSES.map(cls => ({ cls, rows: rows.filter(r => r.cls === cls) })).filter(l => l.rows.length && (only === null || only === l.cls))
  const levelNames = PLACED_ENGLISH_CLASSES.filter(cls => rows.some(r => r.cls === cls))
  const bookNotes = notes.books.filter(b => b.together.length || b.ready.length)
  const shownNotes = showAllNotes ? bookNotes : bookNotes.slice(0, 6)
  const grid = { gridTemplateColumns: `170px repeat(${Math.max(1, strandsShown.length)}, minmax(0, 1fr))` }
  const w = weeks[wk - 1]

  return (
    <div className="flex flex-col gap-4">
      {/* Controls: the week, the view, the level */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        {views.length > 1 && <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden self-end">
          {views.map((v, i) => <button key={v} onClick={() => setViewPick(v)} className={`h-8 px-3 text-[12.5px] ${i ? 'border-l border-rule-2' : ''} ${view === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{viewLabel(v)}</button>)}
        </div>}
        {N > 0 && (
          <div className="flex items-center gap-2 self-end">
            <button onClick={() => setWeek(Math.max(1, wk - 1))} disabled={wk <= 1} className="w-9 h-9 rounded border border-rule-2 bg-surface inline-flex items-center justify-center text-ink disabled:opacity-40" aria-label={ko ? '이전 주' : 'Previous week'}><ChevronLeft size={16} /></button>
            <div className="min-w-[200px] px-1">
              <p className="text-[17px] font-semibold text-ink leading-tight">{ko ? `${weekName(wk)}주` : `Week ${weekName(wk)}`}{todayPos !== null && wk === nowWeek && <span className="ml-2 align-middle text-[10.5px] font-semibold text-white bg-accent px-1.5 py-0.5 rounded">{ko ? '이번 주' : 'this week'}</span>}</p>
              {w && <p className="text-[12px] text-ink-3">{fmtDay(w.monday, ko)} – {fmtDay(w.friday, ko)}</p>}
            </div>
            <button onClick={() => setWeek(Math.min(N, wk + 1))} disabled={wk >= N} className="w-9 h-9 rounded border border-rule-2 bg-surface inline-flex items-center justify-center text-ink disabled:opacity-40" aria-label={ko ? '다음 주' : 'Next week'}><ChevronRight size={16} /></button>
            {todayPos !== null && wk !== nowWeek && <button onClick={() => setWeek(nowWeek)} className={btnS}>{ko ? '이번 주로' : 'Back to this week'}</button>}
          </div>
        )}
        <span className="flex-1" />
        {levelNames.length > 1 && (
          <div className="flex gap-1 flex-wrap self-end">
            {[null, ...levelNames].map(c => <button key={c || 'all'} onClick={() => setOnly(c)} className={`h-8 px-3 rounded-full text-[12.5px] border ${only === c ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink bg-surface'}`}>{c === null ? (ko ? '전체' : 'All') : <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: classToColor(c as any) }} />{c}</span>}</button>)}
          </div>
        )}
      </div>
      {!N && <PeriodsLine year={theYear} />}
      {N > 0 && rows.length === 0 && <p className="text-[12.5px] text-ink-3">{ko ? '이 기간에 배치된 책이 없습니다.' : 'Nothing is placed for this view yet. It fills in as books are placed on Planning → Books by class.'}</p>}
      {N > 0 && schoolHoliday && <p className="px-4 py-2.5 rounded bg-paper-2 text-[13px] text-ink-2">{schoolHoliday}{ko ? ': 이 주는 수업이 없는 학년이 있습니다.' : ': a holiday week for some or all grades. Units stretch across it.'}</p>}

      {/* Plan together: who is on the same unit, and whose files are ready */}
      {N > 0 && rows.length > 0 && (
        <section className="border border-rule rounded bg-surface px-4 py-3.5">
          <p className="eyebrow inline-flex items-center gap-1.5 mb-2.5"><Users size={12} />{ko ? '이번 주 함께 계획하기' : 'Plan together this week'}</p>
          {bookNotes.length === 0 && <p className="text-[13px] text-ink-3">{ko ? '이번 주에는 같은 단원을 하는 반이 없습니다.' : 'No two classes are on the same unit this week, and nobody is starting one another class has done.'}</p>}
          <div className="grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
            {shownNotes.map(b => (
              <div key={b.bookId} className="min-w-0">
                <p className="text-[14px] font-semibold text-ink flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: b.color }} />{b.label}</p>
                <ul className="flex flex-col gap-1 text-[13px] leading-snug">
                  {b.together.map(t => (
                    <li key={t.unitId} className="flex items-start gap-2 text-ink">
                      <span className="shrink-0 w-[18px] h-[18px] mt-px rounded-full bg-ink text-paper text-[10.5px] font-bold inline-flex items-center justify-center">{t.tag}</span>
                      <span><span className="font-semibold">{ko ? '함께 계획' : 'Plan together'}:</span> {t.text}{t.rows.some(r => teacherName(r.teacherId)) && <span className="text-ink-3"> ({t.rows.map(r => teacherName(r.teacherId)).filter(Boolean).join(', ')})</span>}</span>
                    </li>
                  ))}
                  {b.ready.map((r, i) => <li key={i} className="pl-[26px] text-ink-2">{r.text}</li>)}
                </ul>
              </div>
            ))}
          </div>
          {bookNotes.length > 6 && <button onClick={() => setShowAllNotes(v => !v)} className={`${btnS} mt-3`}>{showAllNotes ? (ko ? '줄이기' : 'Show fewer') : (ko ? `모두 보기 (${bookNotes.length}권)` : `Show all ${bookNotes.length} books`)}</button>}
        </section>
      )}

      {/* The week as a table: a row per class and grade, a column per strand */}
      {N > 0 && rows.length > 0 && (
        <div className="border border-rule rounded bg-surface overflow-hidden">
          <div className="grid border-b border-rule bg-paper" style={grid}>
            <span className="px-4 py-2.5 text-[11px] uppercase tracking-wide text-ink-3 font-semibold">{ko ? '반 · 학년' : 'Class · grade'}</span>
            {strandsShown.map(st => <span key={st} className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-ink-3 font-semibold border-l border-rule">{ko ? STRAND_LABEL[st].ko : STRAND_LABEL[st].en}</span>)}
          </div>
          {levels.map(l => (
            <div key={l.cls}>
              <div className="flex items-center gap-2.5 px-4 py-2 bg-paper-2 border-b border-rule">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: classToColor(l.cls as any) }} />
                <span className="text-[14px] font-semibold text-ink">{l.cls}</span>
                {teacherName(l.rows[0].teacherId) && <span className="text-[12.5px] text-ink-3">{teacherName(l.rows[0].teacherId)}</span>}
              </div>
              {l.rows.map(r => {
                const hol = holidayFor.get(r.grade)
                const holName = hol?.names.get(wk)
                const here = barsAtWeek(r, wk)
                return (
                  <div key={r.key} className="grid border-b border-rule last:border-b-0" style={grid}>
                    <div className="px-4 py-2.5 flex flex-col gap-0.5">
                      <span className="text-[13.5px] font-semibold text-ink">{ko ? `${r.grade}학년` : `Grade ${r.grade}`}</span>
                      <a href={boardLink(r.cls, r.grade, { year: theYear, view, week: wk })} className="text-[11.5px] text-accent inline-flex items-center gap-1">{ko ? '계획 열기' : 'Open plan'}<ExternalLink size={10} /></a>
                    </div>
                    {holName ? (
                      <div className="border-l border-rule px-3 py-2.5 text-[13px] text-ink-3 flex items-center" style={{ gridColumn: `2 / span ${strandsShown.length}`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-2)) 0 4px, transparent 4px 9px)' }}>{holName}{ko ? ' · 수업 없음' : ' · no classes'}</div>
                    ) : strandsShown.map(st => {
                      const items = here.filter(b => (b.series?.strand || 'other') === st)
                      return (
                        <div key={st} className="border-l border-rule px-2 py-2 flex flex-col gap-1.5 min-w-0">
                          {items.length === 0 && <span className="text-[13px] text-ink-3 px-1.5 py-1">–</span>}
                          {items.map(b => {
                            const t = splitUnitTitle(b.unit.title)
                            const tag = notes.tagOf.get(b.unit.id)
                            const pos = weekOfBar(b, wk, hol?.cols || new Set())
                            return (
                              <a key={b.pacing.id} href={boardLink(r.cls, r.grade, { year: theYear, view, week: wk })} title={`${b.series?.name || ''} ${b.book.level_number} · ${b.unit.title}`} className={`flex items-start gap-2 rounded px-2 py-1.5 hover:ring-1 hover:ring-rule-2 ${tag ? 'bg-paper-2' : 'bg-paper'}`}>
                                <span className="w-2.5 h-2.5 rounded-sm shrink-0 mt-1" style={{ background: b.color }} />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[11.5px] text-ink-3 truncate">{b.series?.name} {b.book.level_number}{t.badge ? ` · ${t.badge}` : ''}</span>
                                  <span className="block text-[13.5px] font-semibold text-ink leading-snug">{t.name}</span>
                                  <span className="block text-[11.5px] text-ink-3">{pos.of > 1 ? (ko ? `${pos.of}주 중 ${pos.at}주` : `week ${pos.at} of ${pos.of}`) : (ko ? '이번 주' : 'this week')}{doneSet.has(`${b.placement.id}|${b.unit.id}`) ? (ko ? ' · 완료' : ' · done') : ''}</span>
                                </span>
                                {tag && <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-ink text-paper text-[10.5px] font-bold inline-flex items-center justify-center" title={ko ? '같은 단원을 하는 반이 있습니다' : 'Another class is on this unit this week'}>{tag}</span>}
                              </a>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
      {N > 0 && rows.length > 0 && <p className="text-[11.5px] text-ink-3">{ko ? '각 반의 계획에서 이번 주에 해당하는 단원입니다. 칸을 누르면 그 반의 계획이 열립니다.' : 'Each row is the unit its class plan has this week. A letter marks a unit another class is on the same week. Click a unit to open that class’s plan.'}</p>}
    </div>
  )
}
