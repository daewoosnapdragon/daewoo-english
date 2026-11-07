'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classToColor, getKSTDateString } from '@/lib/utils'
import { teacherForClass } from '@/lib/classTeacher'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { splitUnitTitle } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, viewsFor, boardLanes, halfOf, holidayWeeks, teachingToColumns, termDates, todayPosition, viewWeeks, yearWeeks, type HolidayCounts, type View } from '@/lib/curriculumPacing'
import { barsAtWeek, earlierOnUnit, overlapCounts, overlapsAt, type MapRow } from '@/lib/curriculumMap'
import { usePlanner } from './usePlanner'
import PeriodsLine from './PeriodsLine'
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Users } from 'lucide-react'

// ─── Program map ─────────────────────────────────────────────────
// Every class and grade across the term on one page, a row each, the books
// as thin strips and the units as segments in the book's colour. Click a
// week and the panel says what everyone is on and what they share: the
// same unit of the same book (plan together), the same skill in different
// books (pool materials), and who finished a unit earlier (their files are
// ready). Rows use each class teacher's own plan when they have one, so the
// map shows what is really happening, not only the master.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })
const LABEL_W = 140
const STRIP = 14
const stickyLabel: React.CSSProperties = { width: LABEL_W, position: 'sticky', left: 0, zIndex: 4, background: 'rgb(var(--white))' }
const boardLink = (cls: string, grade: number) => `#boards/board?cls=${encodeURIComponent(cls)}&grade=${grade}`

export default function ProgramMapView() {
  const { language, semesters, activeSemester, currentTeacher } = useApp()
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [week, setWeek] = useState<number | null>(null)
  const [focus, setFocus] = useState<Set<string> | null>(null)   // rows lit by "stack these"

  // Away days per grade for the year, since holidays differ by grade.
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!from || !to) { setAway({}); return }
    let on = true
    Promise.all(GRADES.map(g => loadAwayDays(from, to, g).then(a => [g, a] as const))).then(all => { if (on) setAway(Object.fromEntries(all)) })
    return () => { on = false }
  }, [semesters, theYear])
  useEffect(() => { setWeek(null); setFocus(null) }, [theYear, view])

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
        const lanes = boardLanes(placements, p.pacing, p.units, p.books, p.series, view, yw, teacherId, h?.hc)
        const bars = teachingToColumns(lanes.flatMap(l => l.bars), h?.cols || new Set(), N)
        if (bars.length) out.push({ key: `${cls}|${grade}`, cls, grade, teacherId, bars })
      }
    }
    return out
  }, [p.placements, p.pacing, p.units, p.books, p.series, teachers, theYear, view, yw, holidayFor, N])
  const counts = useMemo(() => overlapCounts(rows, N, p.lessons), [rows, N, p.lessons])
  const overlaps = useMemo(() => week === null ? [] : overlapsAt(rows, week, p.lessons), [rows, week, p.lessons])
  const todayPos = todayPosition(weeks, today)
  const schoolHolidays = useMemo(() => { const m = new Map<number, string>(); for (const g of GRADES) holidayFor.get(g)?.names.forEach((v, k) => { if (!m.has(k)) m.set(k, v) }); return m }, [holidayFor])
  const summerAt = view === 'year' ? weeks.findIndex(w => w.half === 'fall') : -1
  const colMin = view === 'year' ? 34 : 56
  const viewLabel = (v: View) => v === 'year' ? (ko ? '한 해' : 'Year') : (ko ? TERM_LABEL[v].ko : TERM_LABEL[v].en)
  const rowName = (r: MapRow) => `${r.cls} ${ko ? `${r.grade}학년` : `G${r.grade}`}`
  const teacherName = (r: MapRow) => teachers.find(t => t.id === r.teacherId)?.name.split(' ')[0] || ''

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Admin runs supabase/migration-curriculum-catalogue.sql first.' : 'Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  // Row layout: one strip per placed book; row height follows.
  const strips = (r: MapRow) => { const ids: string[] = []; r.bars.forEach(b => { if (!ids.includes(b.placement.id)) ids.push(b.placement.id) }); return ids }
  const rowH = (r: MapRow) => Math.max(30, strips(r).length * STRIP + 8)
  const levels = PLACED_ENGLISH_CLASSES.map(cls => ({ cls, rows: rows.filter(r => r.cls === cls) })).filter(l => l.rows.length)
  // Tops of rows, for the overlap connectors.
  const tops = new Map<string, { top: number; h: number }>()
  let y = 0
  for (const l of levels) { y += 26; if (collapsed[l.cls]) continue; for (const r of l.rows) { tops.set(r.key, { top: y, h: rowH(r) }); y += rowH(r) + 1 } }
  const lit = (key: string) => !focus || focus.has(key)

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-2">
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        {views.length > 1 && <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden">
          {views.map((v, i) => <button key={v} onClick={() => setViewPick(v)} className={`h-8 px-3 text-[12.5px] ${i ? 'border-l border-rule-2' : ''} ${view === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{viewLabel(v)}</button>)}
        </div>}
        <span className="text-[12px] text-ink-3 pb-2">{N ? `${N} ${ko ? '주' : 'weeks'} · ${rows.length} ${ko ? '개 반·학년' : rows.length === 1 ? 'class' : 'classes'}` : (ko ? '이 기간의 날짜가 없습니다' : 'No weeks for this view yet')}</span>
        {focus && <button onClick={() => setFocus(null)} className={`${btnS} ml-auto`}>{ko ? '모두 보기' : 'Show every row'}</button>}
      </div>
      {!N && <div className="mb-3"><PeriodsLine year={theYear} /></div>}
      {N > 0 && rows.length === 0 && <p className="text-[12.5px] text-ink-3 mt-2">{ko ? '이 기간에 배치된 책이 없습니다.' : 'Nothing is placed for this view yet. The map fills in as the Curriculum map does.'}</p>}

      {N > 0 && rows.length > 0 && (
        <div className="flex gap-5 items-start flex-wrap mt-2">
          <div className="flex-[999_1_640px] min-w-0 border border-rule rounded overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <div style={{ minWidth: LABEL_W + N * colMin }}>
                {/* Week header */}
                <div className="flex border-b border-rule">
                  <div className="shrink-0 px-3 py-2 text-[10.5px] uppercase tracking-wide text-ink-3 self-end border-r border-rule" style={stickyLabel}>{ko ? '반 · 학년' : 'Class · grade'}</div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                    {weeks.map((w, i) => {
                      const hol = schoolHolidays.get(w.n)
                      const isNow = todayPos !== null && Math.floor(todayPos) === w.n
                      const on = week === w.n
                      return (
                        <button key={w.n} onClick={() => { setWeek(on ? null : w.n); setFocus(null) }} className={`relative px-0.5 py-1.5 text-center ${i === summerAt ? 'border-l-[3px] border-ink-3' : 'border-l border-rule'} ${on ? 'bg-ink text-paper' : isNow ? 'bg-accent-soft' : hol ? 'bg-paper-2' : 'hover:bg-paper-2'}`} title={(hol ? hol + ' · ' : '') + (counts[w.n - 1] ? `${counts[w.n - 1]} ${ko ? '개 공유' : 'shared'} · ` : '') + (ko ? '이 주 보기' : 'Look at this week')}>
                          <div className={`text-[11px] font-semibold ${on ? 'text-paper' : isNow ? 'text-accent' : 'text-ink'}`}>{view === 'year' ? (w.half === 'fall' ? `F${w.n - yw.spring.length}` : `S${w.n}`) : `W${w.n}`}</div>
                          <div className={`text-[9.5px] truncate ${on ? 'text-paper/70' : 'text-ink-3'}`}>{hol ? hol : fmtDay(w.monday, ko)}</div>
                          {counts[w.n - 1] > 0 && <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${on ? 'bg-paper' : 'bg-ink'}`} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* Rows */}
                <div className="relative">
                  {levels.map(l => (
                    <div key={l.cls}>
                      <button onClick={() => setCollapsed(c => ({ ...c, [l.cls]: !c[l.cls] }))} className="w-full flex items-center gap-2 px-3 bg-paper-2 border-b border-rule text-left" style={{ height: 26 }}>
                        {collapsed[l.cls] ? <ChevronRight size={12} className="text-ink-3" /> : <ChevronDown size={12} className="text-ink-3" />}
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: classToColor(l.cls as any) }} />
                        <span className="text-[12px] font-semibold text-ink">{l.cls}</span>
                        <span className="text-[10.5px] text-ink-3">{l.rows.length} {ko ? '학년' : l.rows.length === 1 ? 'grade' : 'grades'}</span>
                      </button>
                      {!collapsed[l.cls] && l.rows.map(r => {
                        const ids = strips(r)
                        const h = rowH(r)
                        const hol = holidayFor.get(r.grade)
                        return (
                          <div key={r.key} className="flex border-b border-rule" style={{ height: h, opacity: lit(r.key) ? 1 : 0.3 }}>
                            <div className="shrink-0 px-3 flex items-center justify-between gap-2 border-r border-rule" style={stickyLabel}>
                              <span className="min-w-0"><span className="block text-[12px] font-medium text-ink truncate">{ko ? `${r.grade}학년` : `Grade ${r.grade}`}</span>{teacherName(r) && <span className="block text-[9.5px] text-ink-3 truncate">{teacherName(r)}</span>}</span>
                              <a href={boardLink(r.cls, r.grade)} className="text-ink-3 hover:text-accent shrink-0" title={ko ? '보드 열기' : 'Open the board'}><ExternalLink size={11} /></a>
                            </div>
                            <div className="flex-1 relative" style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--rule)) 1px, transparent 1px)', backgroundSize: `${100 / N}% 100%` }}>
                              {hol && Array.from(hol.cols).map(n => <div key={n} className="absolute inset-y-0 pointer-events-none" style={{ left: `${(n - 1) / N * 100}%`, width: `${100 / N}%`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 3px, transparent 3px 7px)' }} />)}
                              {week !== null && <div className="absolute inset-y-0 pointer-events-none bg-ink/5" style={{ left: `${(week - 1) / N * 100}%`, width: `${100 / N}%` }} />}
                              {r.bars.map(b => {
                                const si = ids.indexOf(b.placement.id)
                                const t = splitUnitTitle(b.unit.title)
                                const inWeek = week !== null && barsAtWeek(r, week).includes(b)
                                return (
                                  <a key={b.pacing.id} href={boardLink(r.cls, r.grade)} title={`${b.series?.name || ''} ${b.book.level_number} · ${b.unit.title} · ${ko ? '주' : 'wk'} ${b.viewStart}–${b.viewEnd}`}
                                    className={`absolute overflow-hidden text-white px-1 flex items-center ${b.cutLeft ? '' : 'rounded-l-sm'} ${b.cutRight ? '' : 'rounded-r-sm'} ${inWeek ? 'ring-1 ring-ink ring-offset-1 ring-offset-surface' : ''}`}
                                    style={{ left: `${(b.viewStart - 1) / N * 100}%`, width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 2px)`, marginLeft: 1, top: 4 + si * STRIP, height: STRIP - 2, background: b.color, opacity: b.series?.kind === 'anthology' && !b.pacing.done_at ? 0.75 : 1 }}>
                                    <span className="text-[9px] font-medium leading-none truncate">{t.name}</span>
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  {/* Overlap connectors for the chosen week */}
                  {week !== null && overlaps.length > 0 && (
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: LABEL_W, right: 0 }}>
                      {overlaps.map((o, oi) => {
                        const ys = o.members.map(m => tops.get(m.row.key)).filter((t): t is { top: number; h: number } => !!t)
                        if (ys.length < 2) return null
                        const top = Math.min(...ys.map(t => t.top + t.h / 2)), bottom = Math.max(...ys.map(t => t.top + t.h / 2))
                        const x = `calc(${(week - 0.5) / N * 100}% + ${(oi - (overlaps.length - 1) / 2) * 7}px)`
                        return (
                          <div key={o.key}>
                            <div className="absolute" style={{ left: x, top, height: bottom - top, width: 3, marginLeft: -1.5, background: o.kind === 'unit' ? 'rgb(var(--ink))' : 'rgb(var(--accent))', borderRadius: 2 }} />
                            {ys.map((t, i) => <div key={i} className="absolute rounded-full" style={{ left: x, top: t.top + t.h / 2 - 4, width: 8, height: 8, marginLeft: -4, background: 'rgb(var(--white))', border: `2px solid ${o.kind === 'unit' ? 'rgb(var(--ink))' : 'rgb(var(--accent))'}` }} />)}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {todayPos !== null && (
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(todayPos - 1) / N})`, zIndex: 3 }}>
                      <div className="w-[2px] h-full bg-accent" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-3 py-2 text-[11px] text-ink-3 border-t border-rule flex gap-4 flex-wrap">
              <span>{ko ? '주 번호를 누르면 그 주에 모두가 하는 것과 공유하는 것이 보입니다.' : 'Click a week to see what everyone is on and what they share.'}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-[3px] bg-ink rounded" />{ko ? '같은 단원' : 'same unit'}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-[3px] bg-accent rounded" />{ko ? '같은 기능, 다른 책' : 'same skill, different books'}</span>
              <span className="ml-auto">{ko ? '교사 계획이 있으면 그것을, 없으면 마스터를 보여줍니다' : 'Each row shows its teacher’s own plan where there is one, else the master'}</span>
            </div>
          </div>

          {/* Week panel */}
          <aside className="flex-[1_1_300px] max-w-[380px] border border-rule-2 rounded bg-surface">
            {week === null ? (
              <div className="px-4 py-4 text-[12.5px] text-ink-2 leading-relaxed">
                <p className="eyebrow mb-1.5">{ko ? '이번 주' : 'A week'}</p>
                {ko ? '위에서 주를 누르세요. 점이 있는 주는 두 반 이상이 같은 것을 하는 주입니다.' : 'Pick a week above. A dot on a week means two or more classes share something that week.'}
                {todayPos !== null && <button onClick={() => setWeek(Math.floor(todayPos))} className={`${btnS} mt-3`}>{ko ? '이번 주 보기' : 'Look at this week'}</button>}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-rule">
                  <p className="eyebrow">{ko ? '주' : 'Week'} {weeks[week - 1] && (view === 'year' ? (weeks[week - 1].half === 'fall' ? `F${week - yw.spring.length}` : `S${week}`) : week)}</p>
                  <p className="text-[14px] font-semibold text-ink">{weeks[week - 1] ? `${fmtDay(weeks[week - 1].monday, ko)} – ${fmtDay(weeks[week - 1].friday, ko)}` : ''}</p>
                  {schoolHolidays.get(week) && <p className="text-[11.5px] text-ink-3">{schoolHolidays.get(week)}</p>}
                </div>
                <div className="px-4 py-3 border-b border-rule flex flex-col gap-2">
                  <p className="eyebrow inline-flex items-center gap-1.5"><Users size={11} />{ko ? '함께 계획하기' : 'Plan together'}</p>
                  {overlaps.length === 0 && <p className="text-[12px] text-ink-3">{ko ? '이번 주에는 두 반이 공유하는 것이 없습니다.' : 'No two classes share a unit or a skill this week.'}</p>}
                  {overlaps.map(o => (
                    <div key={o.key} className="rounded p-2.5" style={{ background: 'rgb(var(--paper-2))', borderLeft: `3px solid ${o.kind === 'unit' ? 'rgb(var(--ink))' : 'rgb(var(--accent))'}` }}>
                      <p className="text-[12.5px] font-semibold text-ink">{o.label}</p>
                      <p className="text-[11px] text-ink-3 mb-1.5">{o.detail}</p>
                      <div className="flex flex-col gap-0.5 mb-1.5">
                        {o.members.map((m, i) => <span key={i} className="text-[11.5px] text-ink-2 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: classToColor(m.row.cls as any) }} />{rowName(m.row)}{teacherName(m.row) ? ` · ${teacherName(m.row)}` : ''}<span className="text-ink-3">· {m.bar.series?.name} {m.bar.book.level_number}{o.kind === 'skill' ? ` · ${splitUnitTitle(m.bar.unit.title).name}` : ''}</span></span>)}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setFocus(new Set(o.members.map(m => m.row.key)))} className={btnS}>{ko ? '이 반들만 보기' : 'Stack these rows'}</button>
                        {o.kind === 'unit' && o.members[0].bar.unit.drive_folder_url && <a href={o.members[0].bar.unit.drive_folder_url} target="_blank" rel="noreferrer" className={btnS}><ExternalLink size={11} />{ko ? '단원 폴더' : 'Unit folder'}</a>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 flex flex-col gap-2">
                  <p className="eyebrow">{ko ? '모두 이번 주에' : 'Everyone this week'}</p>
                  {rows.map(r => {
                    const bs = barsAtWeek(r, week)
                    if (!bs.length) return null
                    return (
                      <div key={r.key} className="text-[12px]" style={{ opacity: lit(r.key) ? 1 : 0.4 }}>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: classToColor(r.cls as any) }} /><span className="font-medium text-ink">{rowName(r)}</span>{teacherName(r) && <span className="text-ink-3">· {teacherName(r)}</span>}<a href={boardLink(r.cls, r.grade)} className="ml-auto text-ink-3 hover:text-accent"><ExternalLink size={11} /></a></div>
                        <ul className="pl-3.5 flex flex-col gap-0.5 mt-0.5">
                          {bs.map(b => {
                            const earlier = earlierOnUnit(rows, b.unit.id, week, r.key)
                            return (
                              <li key={b.pacing.id} className="text-ink-2 leading-snug">
                                <span className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle" style={{ background: b.color }} />{b.series?.name} {b.book.level_number} · {splitUnitTitle(b.unit.title).name}
                                {earlier.length > 0 && <span className="block text-[11px] text-ink-3 pl-3.5">{ko ? `${rowName(earlier[0].row)}이(가) ${earlier[0].weeksAgo}주 전에 끝냈습니다. 자료가 준비되어 있습니다.` : `${rowName(earlier[0].row)} finished this ${earlier[0].weeksAgo} ${earlier[0].weeksAgo === 1 ? 'week' : 'weeks'} ago. Their files and notes are ready.`}</span>}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
      {currentTeacher && null}
    </div>
  )
}
