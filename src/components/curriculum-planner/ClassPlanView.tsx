'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { getKSTDateString } from '@/lib/utils'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, bookName, colorHex, splitUnitTitle } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, aimWeek, barsForView, halfOf, holidayWeeks, layoutPacing, masterRows, placementLength, teachingToColumns, termDates, termsFor, todayPosition, totalWeeks, viewWeeks, viewsFor, yearWeeks, type CurriculumPlacement, type View } from '@/lib/curriculumPacing'
import { unitBank } from '@/lib/planLinks'
import { standardInfo, standardTitle } from '@/lib/standardText'
import { usePlanner } from './usePlanner'
import { CopyForm, PlaceForm, PlacementCard } from './PlacementsView'
import { Check, Copy, ExternalLink, Loader2, Plus, X } from 'lucide-react'

// ─── Class plans ─────────────────────────────────────────────────
// One class and grade: a lane per book, each unit a bar at its suggested
// length, end to end from the start of the term. Holiday weeks from the
// school calendar are hatched and skipped. A line marks today and a flag
// each book's aim date. Click a unit for its lessons, objectives and files.
// Read-only for teachers; admin edits the lists under the timeline.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const LABEL_W = 190
const COL_MIN = 34
const GRADE_KEY = 'daewoo_plan_grade'

/** The class, grade, year and view a link asks for: #plans?cls=Daisy&grade=2&year=2026&view=fall. */
function readLink(): { cls?: string; grade?: number; year?: string; view?: string } {
  if (typeof window === 'undefined') return {}
  const q = (window.location.hash || '').split('?')[1]
  if (!q) return {}
  const sp = new URLSearchParams(q)
  return { cls: sp.get('cls') || undefined, grade: Number(sp.get('grade')) || undefined, year: sp.get('year') || undefined, view: sp.get('view') || undefined }
}

export default function ClassPlanView() {
  const { currentTeacher, language, semesters, activeSemester, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const me = currentTeacher?.id || ''
  const today = getKSTDateString()
  const ownClass = currentTeacher && (PLACED_ENGLISH_CLASSES as string[]).includes(currentTeacher.english_class) ? currentTeacher.english_class : PLACED_ENGLISH_CLASSES[0]
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])

  const [cls, setCls] = useState<string>(ownClass)
  const [grade, setGrade] = useState<number>(() => { try { const g = Number(localStorage.getItem(GRADE_KEY)); return (GRADES as number[]).includes(g) ? g : 1 } catch { return 1 } })
  const [year, setYear] = useState<string>('')
  const [viewPick, setViewPick] = useState<View | null>(null)
  useEffect(() => { try { localStorage.setItem(GRADE_KEY, String(grade)) } catch { /* private mode */ } }, [grade])
  // A link from All classes this week opens on its class, grade, year and view.
  useEffect(() => {
    const apply = () => {
      const l = readLink()
      if (l.cls && (PLACED_ENGLISH_CLASSES as string[]).includes(l.cls)) setCls(l.cls)
      if (l.grade && (GRADES as number[]).includes(l.grade)) setGrade(l.grade)
      if (l.year) setYear(l.year)
      if (l.view === 'spring' || l.view === 'fall' || l.view === 'year') setViewPick(l.view)
    }
    apply(); window.addEventListener('hashchange', apply); return () => window.removeEventListener('hashchange', apply)
  }, [])
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  const views = useMemo(() => viewsFor(yw), [yw])
  const terms = useMemo(() => termsFor(yw), [yw])
  const view: View = viewPick && views.includes(viewPick) ? viewPick : views.includes(halfOf(semesters, theYear, today)) ? halfOf(semesters, theYear, today) : views[0]
  const weeks = useMemo(() => viewWeeks(yw, view), [yw, view])
  const N = weeks.length

  // This grade's days off for the year: three or more in a week make it a holiday week.
  const [away, setAway] = useState<AwayDay[]>([])
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!from || !to) { setAway([]); return }
    let on = true
    loadAwayDays(from, to, grade).then(a => { if (on) setAway(a) })
    return () => { on = false }
  }, [semesters, theYear, grade])
  const hol = useMemo(() => {
    const hs = holidayWeeks(away, yw.spring), hf = holidayWeeks(away, yw.fall)
    const names = new Map<number, string>()
    weeks.forEach(w => { const h = w.half || 'fall'; const key = view === 'year' && h === 'fall' ? w.n - yw.spring.length : w.n; const nm = (h === 'spring' ? hs : hf).get(key); if (nm) names.set(w.n, nm) })
    return { hc: { spring: hs.size, fall: hf.size }, sets: { spring: new Set(hs.keys()), fall: new Set(hf.keys()) }, names, cols: new Set(names.keys()) }
  }, [away, yw, weeks, view])

  const placements = useMemo(() => p.placements
    .filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master)
    .map(pl => { const book = p.books.find(b => b.id === pl.book_id); const series = book ? p.series.find(s => s.id === book.series_id) : undefined; return { pl, book, series } })
    .sort((a, b) => STRANDS.indexOf(a.series?.strand || 'other') - STRANDS.indexOf(b.series?.strand || 'other') || (a.series?.name || '').localeCompare(b.series?.name || '')),
  [p.placements, p.books, p.series, cls, grade, theYear])
  const lanes = useMemo(() => placements.map(({ pl, book, series }) => {
    const rows = masterRows(p.pacing, pl.id)
    const bars = teachingToColumns(barsForView(layoutPacing(rows, p.units), pl.term, view, yw, hol.hc), hol.cols, N)
    const length = placementLength(pl.term, yw, hol.hc)
    const total = totalWeeks(rows)
    const aimW = aimWeek(pl.aim_date, pl.term, yw, hol.sets)
    return { pl, book, series, color: colorHex(series?.color || 'slate'), bars, rows, length, total, aimW, aimPos: pl.aim_date ? todayPosition(weeks, pl.aim_date) : null }
  }), [placements, p.pacing, p.units, view, yw, hol, N, weeks])
  const done = useMemo(() => new Set(p.done.map(d => `${d.placement_id}|${d.unit_id}`)), [p.done])
  const todayPos = todayPosition(weeks, today)
  const [openBar, setOpenBar] = useState<{ placement: string; unit: string } | null>(null)
  useEffect(() => { setOpenBar(null) }, [cls, grade, theYear, view])
  const [placing, setPlacing] = useState(false)
  const [copying, setCopying] = useState(false)
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-ink-3">{ko ? '아직 준비되지 않았습니다.' : 'Class plans are not set up yet.'}</p>

  const viewLabel = (v: View) => v === 'year' ? (ko ? '한 해' : 'Whole year') : (ko ? TERM_LABEL[v].ko : TERM_LABEL[v].en)
  const labelOf = (pl: CurriculumPlacement) => { const b = p.books.find(x => x.id === pl.book_id); return b ? bookName(b, p.series.find(s => s.id === b.series_id)) : '?' }
  const left = (at: number) => `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${at / Math.max(1, N)})`
  const opened = openBar ? lanes.find(l => l.pl.id === openBar.placement) : undefined
  const openedUnit = opened ? p.units.find(u => u.id === openBar!.unit) : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3 flex-wrap">
        <label className="text-[11px] text-ink-3">{ko ? '반' : 'Class'}<br />
          <select value={cls} onChange={e => setCls(e.target.value)} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년' : 'Grade'}<br />
          <select value={grade} onChange={e => setGrade(Number(e.target.value))} className={sel}>{GRADES.map(g => <option key={g} value={g}>{ko ? `${g}학년` : `Grade ${g}`}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <div className="flex gap-1 pb-px">
          {views.map(v => <button key={v} onClick={() => setViewPick(v)} className={`h-8 px-3 rounded text-[12.5px] ${view === v ? 'bg-ink text-paper' : 'border border-rule-2 text-ink-2 hover:text-ink'}`}>{viewLabel(v)}</button>)}
        </div>
      </div>

      {N === 0 ? (
        <p className="text-[12.5px] text-ink-3">{ko ? '이 학년도의 학기 날짜가 아직 없습니다.' : 'This year has no term dates yet.'}</p>
      ) : lanes.length === 0 ? (
        <p className="text-[13px] text-ink-2">{ko ? `${cls} ${grade}학년의 ${theYear} 계획이 아직 없습니다.` : `No books in ${cls} Grade ${grade}'s plan for ${theYear} yet.`}</p>
      ) : (
        <div className="border border-rule rounded bg-surface overflow-x-auto">
          <div className="relative" style={{ minWidth: LABEL_W + N * COL_MIN }}>
            {/* Week columns: holidays hatched */}
            {weeks.map((w, i) => hol.cols.has(w.n) && (
              <div key={'h' + w.n} title={hol.names.get(w.n)} className="absolute top-0 bottom-0" style={{ left: left(i), width: `calc((100% - ${LABEL_W}px) / ${N})`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 6px, transparent 6px 10px)' }} />
            ))}
            <div className="relative flex h-9 border-b border-rule">
              <div className="shrink-0 px-3 flex items-center text-[10.5px] uppercase tracking-wide text-ink-3" style={{ width: LABEL_W }}>{ko ? '교재' : 'Book'}</div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                {weeks.map((w, i) => {
                  const newMonth = i === 0 || w.monday.slice(5, 7) !== weeks[i - 1].monday.slice(5, 7)
                  return <div key={w.n} title={`${fmtDay(w.monday)}${hol.names.get(w.n) ? ` · ${hol.names.get(w.n)}` : ''}`} className="border-l border-rule/60 text-[10px] text-ink-3 leading-tight px-0.5 pt-1 truncate">{newMonth ? fmtDay(w.monday) : w.monday.slice(8, 10).replace(/^0/, '')}</div>
                })}
              </div>
            </div>
            {lanes.map(l => {
              const overTerm = l.length > 0 && l.total > l.length + 0.01
              const pastAim = l.aimW !== null && l.total > l.aimW + 0.01
              return (
                <div key={l.pl.id} className="relative h-[64px] border-b border-rule last:border-b-0">
                  <div className="absolute left-0 top-0 bottom-0 px-3 py-2 flex flex-col justify-center bg-surface border-r border-rule z-[1]" style={{ width: LABEL_W }}>
                    <span className="text-[12.5px] font-semibold text-ink truncate" style={{ borderLeft: `3px solid ${l.color}`, paddingLeft: 6 }}>{labelOf(l.pl)}</span>
                    <span className="text-[10.5px] text-ink-3 leading-snug pl-[9px]">
                      {l.rows.length} {l.series?.kind === 'anthology' ? (l.rows.length === 1 ? 'story' : 'stories') : (l.rows.length === 1 ? 'unit' : 'units')} · {num(l.total)} wk{overTerm ? ` · ${num(l.total - l.length)} past the term` : ''}
                      {l.pl.aim_date ? <><br />{ko ? '목표' : 'aim'} {fmtDay(l.pl.aim_date)}{pastAim ? ` · ${num(l.total - l.aimW!)} wk after it` : ''}</> : null}
                    </span>
                  </div>
                  {l.bars.map(b => {
                    const t = splitUnitTitle(b.unit.title)
                    const isDone = done.has(`${l.pl.id}|${b.unit.id}`)
                    const on = openBar?.placement === l.pl.id && openBar.unit === b.unit.id
                    return (
                      <button key={b.pacing.id} onClick={() => setOpenBar(on ? null : { placement: l.pl.id, unit: b.unit.id })}
                        title={`${b.unit.title} · ${num(b.pacing.weeks)} wk${isDone ? ' · done' : ''}`}
                        className={`absolute top-3 h-[40px] rounded-sm px-1.5 text-left text-[11px] leading-tight text-white overflow-hidden ${on ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                        style={{ left: `calc(${left(b.viewStart - 1)} + 1px)`, width: `calc((100% - ${LABEL_W}px) * ${(b.viewEnd - b.viewStart + 1) / N} - 2px)`, background: l.color, opacity: isDone ? 0.45 : 1 }}>
                        <span className="block truncate font-medium">{isDone && <Check size={10} className="inline mr-0.5 -mt-px" />}{t.name}</span>
                        {t.badge && <span className="block truncate opacity-80 text-[10px]">{t.badge}</span>}
                      </button>
                    )
                  })}
                  {l.aimPos !== null && (
                    <div title={`${ko ? '목표' : 'Aim'}: ${fmtDay(l.pl.aim_date!)}`} className="absolute top-1 bottom-1 w-0 border-l-2 border-dashed border-ink-2 z-[2]" style={{ left: left(l.aimPos - 1) }} />
                  )}
                </div>
              )
            })}
            {todayPos !== null && <div title={ko ? '오늘' : 'Today'} className="absolute top-0 bottom-0 w-0 border-l-2 border-accent z-[3] pointer-events-none" style={{ left: left(todayPos - 1) }} />}
          </div>
        </div>
      )}

      {opened && openedUnit && (() => {
        const t = splitUnitTitle(openedUnit.title)
        const lessons = p.lessons.filter(x => x.unit_id === openedUnit.id).sort((a, b) => a.sort_order - b.sort_order)
        const bank = unitBank(p.objectives.filter(o => o.unit_id === openedUnit.id), lessons)
        const ids = new Set(lessons.map(x => x.id))
        const files = p.resources.filter(r => (r.unit_id === openedUnit.id || (r.lesson_id && ids.has(r.lesson_id))) && !!r.url)
        const row = opened.rows.find(r => r.unit_id === openedUnit.id)
        const bar = layoutPacing(opened.rows, p.units).find(b => b.unit.id === openedUnit.id)
        const codes = Array.from(new Set([...bank.flatMap(o => o.ccss), ...openedUnit.ccss_codes]))
        const isDone = done.has(`${opened.pl.id}|${openedUnit.id}`)
        return (
          <section className="border border-rule rounded bg-surface p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{t.name}</p>
                <p className="text-[12px] text-ink-3">{labelOf(opened.pl)}{t.badge ? ` · ${t.badge}` : ''} · {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} · {row ? `${num(row.weeks)} wk` : ''}{bar ? ` · ${bar.start === bar.end ? `week ${num(bar.start)}` : `weeks ${num(bar.start)}–${num(bar.end)}`} of the term` : ''}{isDone ? ' · done' : ''}</p>
              </div>
              <button onClick={() => setOpenBar(null)} className="text-ink-3 hover:text-ink" aria-label="Close"><X size={14} /></button>
            </div>
            {openedUnit.summary && <p className="mt-2 text-[12.5px] text-ink-2 leading-snug whitespace-pre-line">{openedUnit.summary}</p>}
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {bank.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-3 mb-1">{ko ? '학습 목표' : 'Objectives'}</p>
                  <ul className="space-y-1">{bank.map(o => <li key={o.text} className="text-[12.5px] text-ink-2"><span className="italic text-ink-3">Students will</span> {o.text}</li>)}</ul>
                </div>
              )}
              {lessons.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-3 mb-1">{ko ? '차시' : 'Lessons'}</p>
                  <ol className="space-y-0.5 text-[12.5px] text-ink-2">{lessons.map((x, i) => <li key={x.id}>{i + 1}. {x.title}</li>)}</ol>
                </div>
              )}
            </div>
            {codes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">{codes.map(c => { const s = standardInfo(c); return <span key={c} title={standardTitle(c)} className="text-[10.5px] px-1.5 py-0.5 rounded border border-rule text-ink-2 cursor-help">{s.code}{s.plain ? ` · ${s.plain}` : ''}</span> })}</div>
            )}
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{files.map(f => <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-[12.5px] text-accent inline-flex items-center gap-1 hover:underline"><ExternalLink size={11} />{f.name || 'File'}</a></li>)}</ul>
            )}
          </section>
        )
      })()}

      {canManage && N > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-3 mr-2">{ko ? `${cls} ${grade}학년 계획 편집` : `Edit ${cls} Grade ${grade}'s plan`}</p>
            <button onClick={() => { setPlacing(v => !v); setCopying(false) }} className={`${btnS} ${placing ? 'bg-ink text-paper border-ink' : ''}`}><Plus size={11} />{ko ? '교재 추가' : 'Add a book'}</button>
            <button onClick={() => { setCopying(v => !v); setPlacing(false) }} className={`${btnS} ${copying ? 'bg-ink text-paper border-ink' : ''}`}><Copy size={11} />{ko ? '다른 학년에서 복사' : 'Copy another grade’s books'}</button>
          </div>
          {placing && <div className="border border-rule-2 rounded bg-paper-2 p-3"><PlaceForm terms={terms} p={p} ko={ko} me={me} cls={cls} grade={grade} year={theYear} existing={placements.map(x => x.pl)} fail={fail} onDone={() => { setPlacing(false); p.reload() }} /></div>}
          {copying && <div className="border border-rule-2 rounded bg-paper-2 p-3"><CopyForm p={p} ko={ko} me={me} years={years} to={{ english_class: cls, grade, academic_year: theYear }} fail={fail} onDone={() => { setCopying(false); p.reload() }} /></div>}
          {placements.map(({ pl }) => <PlacementCard key={pl.id} terms={terms} hc={hol.hc} pl={pl} p={p} ko={ko} label={labelOf(pl)} yw={yw} fail={fail} confirmDialog={confirmDialog} onRemoved={() => setOpenBar(null)} />)}
        </section>
      )}
    </div>
  )
}
