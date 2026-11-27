'use client'

import Loading from '@/components/brand/Loading'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classDot, getKSTDateString } from '@/lib/utils'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, STRAND_LABEL, bookName, colorHex, levelShort, splitUnitTitle, type CurriculumBook, type CurriculumSeries, type Strand } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, barsForView, holidayWeeks, layoutPacing, masterRows, placementLength, teachingToColumns, termDates, termsFor, todayPosition, viewShift, viewWeeks, viewsFor, yearWeeks, type CurriculumPacing, type CurriculumPlacement, type HolidayCounts, type Term, type View } from '@/lib/curriculumPacing'
import { changedWeeks, columnOfTeaching, moveBoundary, nextBook, spreadEvenly, teachingAtColumn } from '@/lib/yearPlan'
import { patchMasterRows } from '@/lib/curriculumPlacementsData'
import { needsUpdate } from '@/lib/dbUpdate'
import { usePlanner } from './usePlanner'
import { PlaceForm, PlacementCard } from './PlacementsView'
import { Loader2, Plus, RotateCcw } from 'lucide-react'

// ─── Year plan: one class's books for the year, and when ────────────────────
// For the planning meeting: a board of grades × strands (last year's books
// muted, this year's as chips, the next level offered where a cell is empty)
// with the year's timeline underneath, a row per book. Admin drags a book's
// end to stretch or squeeze it (its units share the new length evenly) or the
// line between two units to give one more time; the dashed outline is the
// book's suggested length (its units' default weeks). Saves go to the same
// placements and pacing as Books by class and Class plans. Teachers see it
// read-only.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[length:calc(11.5px*var(--ts))] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtMonth = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
/** What fits on a unit's bar: its badge ("Unit 4", "M3 W1"), "SL 2" for a School Link, else its name. */
const barText = (title: string) => { const t = splitUnitTitle(title); const sl = t.name.match(/^School Link\s*(\d+)/i); return t.badge || (sl ? `SL ${sl[1]}` : t.name) }
const LABEL_W = 230
const COL_MIN = 28
const ALWAYS: Strand[] = ['phonics', 'reading', 'speaking']
const TERM_ORDER: Term[] = ['spring', 'year', 'fall']
const sumOf = (a: number[]) => a.reduce((x, y) => x + y, 0)

interface Drag { plId: string; kind: 'end' | 'div'; k: number; w0: number[]; shift: number; grade: number }
interface Hol { hc: HolidayCounts; cols: Set<number>; names: Map<number, string> }

export default function YearPlanView() {
  const { currentTeacher, language, semesters, activeSemester, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const me = currentTeacher?.id || ''
  const today = getKSTDateString()
  const ownClass = currentTeacher && (PLACED_ENGLISH_CLASSES as string[]).includes(currentTeacher.english_class) ? currentTeacher.english_class : PLACED_ENGLISH_CLASSES[0]
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])

  const [cls, setCls] = useState<string>(ownClass)
  const [year, setYear] = useState<string>('')
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const prevYear = years[years.indexOf(theYear) + 1] || ''
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  const terms = useMemo(() => termsFor(yw), [yw])
  const views = useMemo(() => viewsFor(yw), [yw])
  const view: View = views.includes('year') ? 'year' : views[0]
  const weeks = useMemo(() => viewWeeks(yw, view), [yw, view])
  const N = weeks.length

  // Each grade's days off: three or more in a week make it a holiday week, which is hatched and not counted.
  const [away, setAway] = useState<Record<number, AwayDay[]>>({})
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!from || !to) { setAway({}); return }
    let on = true
    Promise.all(GRADES.map(g => loadAwayDays(from, to, g).then(a => [g, a] as const))).then(all => { if (on) setAway(Object.fromEntries(all)) })
    return () => { on = false }
  }, [semesters, theYear])
  const hol = useMemo(() => {
    const out: Record<number, Hol> = {}
    for (const g of GRADES) {
      const a = away[g] || []
      const hs = holidayWeeks(a, yw.spring), hf = holidayWeeks(a, yw.fall)
      const names = new Map<number, string>()
      if (view !== 'fall') hs.forEach((nm, n) => names.set(n, nm))
      if (view !== 'spring') hf.forEach((nm, n) => names.set(view === 'year' ? n + yw.spring.length : n, nm))
      out[g] = { hc: { spring: hs.size, fall: hf.size }, cols: new Set(names.keys()), names }
    }
    return out
  }, [away, yw, view])

  const seriesOf = (b: CurriculumBook | undefined): CurriculumSeries | undefined => b ? p.series.find(s => s.id === b.series_id) : undefined
  const bookOf = (pl: CurriculumPlacement) => p.books.find(b => b.id === pl.book_id)
  const strandOf = (pl: CurriculumPlacement): Strand => seriesOf(bookOf(pl))?.strand || 'other'
  const labelOf = (pl: CurriculumPlacement) => { const b = bookOf(pl); return b ? bookName(b, seriesOf(b)) : '?' }
  const sortPl = (a: CurriculumPlacement, b: CurriculumPlacement) => STRANDS.indexOf(strandOf(a)) - STRANDS.indexOf(strandOf(b)) || TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term)
  const mine = p.placements.filter(x => x.english_class === cls && x.academic_year === theYear && x.is_master)
  const before = prevYear ? p.placements.filter(x => x.english_class === cls && x.academic_year === prevYear && x.is_master) : []
  const strands = STRANDS.filter(s => ALWAYS.includes(s) || [...mine, ...before].some(pl => strandOf(pl) === s))

  const [open, setOpen] = useState<string | null>(null)
  const [placing, setPlacing] = useState<{ grade: number; bookId: string; key: number } | null>(null)
  useEffect(() => { setOpen(null); setPlacing(null) }, [cls, theYear])
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  // ─── Dragging ───
  const gridRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [draft, setDraftState] = useState<{ id: string; weeks: number[] } | null>(null)
  const draftRef = useRef<{ id: string; weeks: number[] } | null>(null)
  const setDraft = (d: { id: string; weeks: number[] } | null) => { draftRef.current = d; setDraftState(d) }
  const [tip, setTip] = useState<{ x: number; y: number; pl: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const rowsOf = (plId: string) => masterRows(p.pacing, plId).sort((a, b) => a.sort_order - b.sort_order)
  const weeksOf = (plId: string) => draft && draft.id === plId ? draft.weeks : rowsOf(plId).map(r => Math.max(0.5, Number(r.weeks) || 0))
  const suggestedOf = (plId: string) => sumOf(rowsOf(plId).map(r => p.units.find(u => u.id === r.unit_id)?.default_weeks || 2))

  const save = async (pl: CurriculumPlacement, next: number[], what: string) => {
    const patches = changedWeeks(rowsOf(pl.id), next)
    if (!patches.length) { setDraft(null); return }
    setSaving(true)
    const err = await patchMasterRows(patches, `${labelOf(pl)} · ${pl.english_class} G${pl.grade} ${what}`)
    if (!fail(err)) await p.reload()
    setDraft(null); setSaving(false)
  }

  useEffect(() => {
    if (!drag) return
    const pl = p.placements.find(x => x.id === drag.plId)
    const h = hol[drag.grade]
    const move = (e: PointerEvent) => {
      const el = gridRef.current
      if (!el || !h) return
      const r = el.getBoundingClientRect()
      const colW = (r.width - LABEL_W) / Math.max(1, N)
      const t = teachingAtColumn((e.clientX - r.left - LABEL_W) / colW, h.cols, N)
      let next: number[]
      if (drag.kind === 'end') next = spreadEvenly(Math.max(0.5 * drag.w0.length, t - drag.shift), drag.w0.length)
      else next = moveBoundary(drag.w0, drag.k, t - (drag.shift + sumOf(drag.w0.slice(0, drag.k + 1))))
      setDraft({ id: drag.plId, weeks: next })
      setTip({ x: e.clientX, y: e.clientY, pl: drag.plId })
    }
    const up = () => {
      setDrag(null); setTip(null)
      const d = draftRef.current
      if (pl && d && d.id === pl.id) void save(pl, d.weeks, drag.kind === 'end' ? 'stretched on the year plan' : 'unit lengths moved on the year plan')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    document.body.style.userSelect = 'none'
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); document.body.style.userSelect = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  if (p.loading) return <Loading rows={5} />
  if (p.missing) return <p className="text-[length:calc(12.5px*var(--ts))] text-warn">{p.missing === 'catalogue' ? needsUpdate({ en: 'curriculum catalogue', ko: '교재 목록' }, ko) : needsUpdate({ en: 'curriculum placements', ko: '교재 배치' }, ko)}</p>

  const TERM_TAG: Record<Term, string> = { spring: ko ? '봄' : 'Spring', fall: ko ? '가을' : 'Fall', year: ko ? '한 해' : 'Year' }
  const pos = (col: number) => `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${col / Math.max(1, N)})`
  const span = (cols: number) => `calc((100% - ${LABEL_W}px) * ${cols / Math.max(1, N)})`
  /** The right edge, in columns, of teaching week `t` of the view (fractions kept). */
  const edge = (t: number, h: Hol) => t <= 0 ? 0 : columnOfTeaching(t, h.cols, N) - (Math.ceil(t - 1e-9) - t)
  const lastTeaching = (h: Hol) => teachingAtColumn(N, h.cols, N)
  const whenEnds = (t: number, h: Hol) => {
    const c = Math.ceil(edge(t, h) - 1e-9)
    if (c >= 1 && c <= N) return fmtDay(weeks[c - 1].friday)
    return ko ? `한 해 끝 + ${num(t - lastTeaching(h))}주` : `${num(t - lastTeaching(h))} wk after the year`
  }
  const todayPos = todayPosition(weeks, today)
  const springCols = view === 'year' ? yw.spring.length : 0

  // ─── Board ───
  const suggestionFor = (grade: number, strand: Strand): CurriculumBook | undefined => {
    const last = before.filter(x => x.grade === grade && strandOf(x) === strand).sort((a, b) => TERM_ORDER.indexOf(b.term) - TERM_ORDER.indexOf(a.term))[0]
    const b = last ? bookOf(last) : undefined
    return b ? nextBook(b, p.books) : undefined
  }
  const chip = (pl: CurriculumPlacement) => {
    const b = bookOf(pl), se = seriesOf(b), color = colorHex(se?.color || 'slate'), on = open === pl.id
    return (
      <button key={pl.id} onClick={() => { if (!canManage) return; setOpen(on ? null : pl.id); setPlacing(null) }}
        className={`w-full flex items-center gap-1.5 rounded px-1.5 py-1 text-left border ${on ? 'border-ink bg-paper-2' : 'border-rule bg-surface'} ${canManage ? 'hover:border-rule-2' : 'cursor-default'}`}
        style={{ borderLeft: `3px solid ${color}` }} title={`${labelOf(pl)} · ${TERM_LABEL[pl.term].en}`}>
        <span className="font-display text-[length:calc(15px*var(--ts))] leading-none shrink-0" style={{ color }}>{levelShort(b?.level_number) || '·'}</span>
        <span className="min-w-0 flex-1 text-[length:calc(12px*var(--ts))] font-medium text-ink truncate">{labelOf(pl)}</span>
        <span className={`shrink-0 text-[length:calc(11px*var(--ts))] font-semibold px-1 rounded ${pl.term === 'year' ? 'bg-ink text-paper' : 'bg-paper-3 text-ink-2'}`}>{TERM_TAG[pl.term]}</span>
      </button>
    )
  }

  const opened = open ? mine.find(x => x.id === open) : undefined
  const gradesWithBooks = GRADES.filter(g => mine.some(x => x.grade === g))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {PLACED_ENGLISH_CLASSES.map(c => (
            <button key={c} onClick={() => setCls(c)} className={`h-8 px-3 rounded inline-flex items-center gap-1.5 text-[length:calc(12.5px*var(--ts))] ${cls === c ? 'bg-ink text-paper' : 'border border-rule-2 text-ink-2 hover:text-ink'}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: classDot(c as any) }} />{c}
            </button>
          ))}
        </div>
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <span className="text-[length:calc(12px*var(--ts))] text-ink-3 pb-2">{prevYear ? (ko ? `흐린 글씨: ${prevYear}` : `Muted lines: ${prevYear}`) : ''}{saving && <Loader2 size={12} className="inline ml-2 animate-spin" />}</span>
      </div>

      {/* Board: grades × strands */}
      <section className="border border-rule rounded bg-surface overflow-x-auto">
        <div style={{ minWidth: 120 + strands.length * 200 }}>
          <div className="grid border-b border-rule text-[length:calc(12px*var(--ts))] text-ink-2" style={{ gridTemplateColumns: `80px repeat(${strands.length}, minmax(0, 1fr))` }}>
            <div className="px-3 py-2">{ko ? '학년' : 'Grade'}</div>
            {strands.map(s => <div key={s} className="px-2 py-2 border-l border-rule">{ko ? STRAND_LABEL[s].ko : STRAND_LABEL[s].en}</div>)}
          </div>
          {GRADES.map(g => (
            <div key={g} className="grid border-b border-rule last:border-b-0" style={{ gridTemplateColumns: `80px repeat(${strands.length}, minmax(0, 1fr))` }}>
              <div className="px-3 py-2 font-display text-[length:calc(18px*var(--ts))] text-ink-2">G{g}</div>
              {strands.map(s => {
                const was = before.filter(x => x.grade === g && strandOf(x) === s).sort(sortPl)
                const now = mine.filter(x => x.grade === g && strandOf(x) === s).sort(sortPl)
                const sug = !now.length ? suggestionFor(g, s) : undefined
                return (
                  <div key={s} className={`border-l border-rule p-1.5 flex flex-col gap-1 min-h-[60px] ${placing?.grade === g ? 'bg-paper-2' : ''}`}>
                    {was.map(x => <span key={x.id} className="text-[length:calc(11.5px*var(--ts))] text-ink-3 truncate" title={`${prevYear}: ${labelOf(x)}`}>{labelOf(x)}{x.term !== 'year' ? ` · ${TERM_TAG[x.term]}` : ''}</span>)}
                    {now.map(chip)}
                    {canManage && (
                      <div className="flex gap-1 flex-wrap mt-auto pt-0.5">
                        {sug && <button onClick={() => { setPlacing({ grade: g, bookId: sug.id, key: Date.now() }); setOpen(null) }} className="h-6 px-1.5 rounded border border-dashed border-rule-2 text-[length:calc(11.5px*var(--ts))] text-ink-2 hover:text-ink hover:border-ink inline-flex items-center gap-1" title={ko ? '다음 단계 배치' : 'Place the next level'}>{ko ? '다음:' : 'Next:'} {bookName(sug, seriesOf(sug))}</button>}
                        <button onClick={() => { setPlacing({ grade: g, bookId: '', key: Date.now() }); setOpen(null) }} className="h-6 px-1.5 rounded text-[length:calc(11.5px*var(--ts))] inline-flex items-center gap-1 text-ink-3 hover:text-ink hover:bg-paper-2"><Plus size={10} />{ko ? '배치' : 'Place'}</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      {canManage && (placing || opened) && (
        <div className="border border-rule-2 rounded bg-paper-2 p-3 flex flex-col gap-2">
          {placing && <PlaceForm key={placing.key} terms={terms} p={p} ko={ko} me={me} cls={cls} grade={placing.grade} year={theYear} initialBookId={placing.bookId} initialTerm="year"
            existing={mine.filter(x => x.grade === placing.grade)} fail={fail} onDone={() => { setPlacing(null); p.reload() }} />}
          {opened && <PlacementCard terms={terms} hc={hol[opened.grade]?.hc} pl={opened} p={p} ko={ko} label={labelOf(opened)} yw={yw} fail={fail} confirmDialog={confirmDialog} onRemoved={() => setOpen(null)} />}
        </div>
      )}

      {/* Timeline: a row per book, grouped by grade */}
      {N === 0 ? (
        <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '이 학년도의 학기 날짜가 아직 없습니다. 설정에서 추가하세요.' : `${theYear || 'This year'} has no term dates yet. Add them in Settings and the timeline appears here.`}</p>
      ) : gradesWithBooks.length === 0 ? (
        <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? `${cls}의 ${theYear} 교재가 아직 없습니다.` : `No books in ${cls}'s ${theYear} plan yet. Place one on the board above.`}</p>
      ) : (
        <section className="border border-rule rounded bg-surface overflow-x-auto">
          <div ref={gridRef} className="relative" style={{ minWidth: LABEL_W + N * COL_MIN }}>
            {/* Header: halves, then months */}
            <div className="relative h-6 border-b border-rule">
              {view === 'year' ? <>
                <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink uppercase tracking-wide" style={{ left: `calc(${pos(0)} + 4px)` }}>{ko ? '봄 학기' : 'Spring'}</span>
                <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink uppercase tracking-wide" style={{ left: `calc(${pos(springCols)} + 6px)` }}>{ko ? '가을 학기' : 'Fall'}</span>
              </> : <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink uppercase tracking-wide" style={{ left: `calc(${pos(0)} + 4px)` }}>{ko ? TERM_LABEL[view].ko : TERM_LABEL[view].en}</span>}
            </div>
            <div className="relative flex h-7 border-b border-rule">
              <div className="shrink-0 px-3 flex items-center text-[length:calc(12px*var(--ts))] text-ink-2" style={{ width: LABEL_W }}>{ko ? '교재' : 'Book'}</div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                {weeks.map((w, i) => {
                  const newMonth = i === 0 || w.monday.slice(5, 7) !== weeks[i - 1].monday.slice(5, 7)
                  return <div key={w.n} title={fmtDay(w.monday)} className="border-l border-rule/60 text-[length:calc(11px*var(--ts))] text-ink-3 leading-tight px-0.5 pt-1.5 overflow-visible whitespace-nowrap">{newMonth ? fmtMonth(w.monday) : ''}</div>
                })}
              </div>
            </div>

            {gradesWithBooks.map(g => {
              const h = hol[g]
              const pls = mine.filter(x => x.grade === g).sort(sortPl)
              return (
                <Fragment key={g}>
                  <div className="px-3 py-1 bg-paper border-b border-rule text-[length:calc(12px*var(--ts))] font-semibold text-ink-2">{ko ? `${g}학년` : `Grade ${g}`}</div>
                  {pls.map(pl => {
                    const b = bookOf(pl), se = seriesOf(b), color = colorHex(se?.color || 'slate')
                    const rows = rowsOf(pl.id)
                    const w = weeksOf(pl.id)
                    const shown: CurriculumPacing[] = rows.map((r, i) => ({ ...r, weeks: w[i] }))
                    const bars = teachingToColumns(barsForView(layoutPacing(shown, p.units), pl.term, view, yw, h.hc), h.cols, N)
                    const shift = viewShift(pl.term, view, yw, h.hc)
                    const total = sumOf(w), sug = suggestedOf(pl.id), length = placementLength(pl.term, yw, h.hc)
                    const over = length > 0 && total > length + 0.01
                    const endCol = edge(shift + total, h)
                    const startCol = columnOfTeaching(shift + 1, h.cols, N) - 1
                    const sugEnd = Math.min(N, edge(shift + sug, h))
                    const anthology = se?.kind === 'anthology'
                    const noun = anthology ? (ko ? '편' : rows.length === 1 ? 'story' : 'stories') : (ko ? '단원' : rows.length === 1 ? 'unit' : 'units')
                    const differs = rows.some(r => Math.abs(Number(r.weeks) - (p.units.find(u => u.id === r.unit_id)?.default_weeks || 2)) > 1e-9)
                    const cum: number[] = []; w.reduce((a, x) => { cum.push(a + x); return a + x }, 0)
                    return (
                      <div key={pl.id} className="relative h-[52px] border-b border-rule last:border-b-0">
                        {Array.from(h.cols).map(c => <div key={'h' + c} title={h.names.get(c)} className="absolute top-0 bottom-0" style={{ left: pos(c - 1), width: span(1), backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 6px, transparent 6px 10px)' }} />)}
                        {view === 'year' && <div className="absolute top-0 bottom-0 border-l-2 border-ink/30" style={{ left: pos(springCols) }} />}
                        <div className="absolute left-0 top-0 bottom-0 px-3 flex flex-col justify-center bg-surface border-r border-rule z-[2]" style={{ width: LABEL_W }}>
                          <span className="flex items-center gap-1.5 min-w-0" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 6 }}>
                            <span className="text-[length:calc(12.5px*var(--ts))] font-semibold text-ink truncate" title={labelOf(pl)}>{labelOf(pl)} <span className="font-normal text-ink-3">· {TERM_TAG[pl.term]}</span></span>
                            {canManage && differs && !drag && <button onClick={() => save(pl, rows.map(r => p.units.find(u => u.id === r.unit_id)?.default_weeks || 2), 'back to suggested lengths')} className="shrink-0 text-[length:calc(11px*var(--ts))] text-accent hover:underline inline-flex items-center gap-0.5" title={ko ? '제안된 길이로 되돌리기' : 'Back to the suggested lengths'}><RotateCcw size={10} />{ko ? '제안대로' : 'reset'}</button>}
                          </span>
                          <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-snug pl-[9px] truncate" title={over ? `${num(total - length)} wk past the term` : undefined}>
                            {rows.length} {noun} · {num(total)} {ko ? '주' : 'wk'}{Math.abs(total - sug) > 0.01 ? ` (${total > sug ? '+' : '−'}${num(Math.abs(total - sug))} ${ko ? '제안 대비' : 'vs suggested'})` : ''}
                            {over && <span className="text-warn"> · {ko ? `${num(total - length)}주 넘침` : `${num(total - length)} wk past the term`}</span>}
                          </span>
                        </div>
                        {/* Suggested length: dashed outline behind the bars */}
                        {sug > 0 && <div className="absolute top-[11px] h-[30px] rounded border-[1.5px] border-dashed pointer-events-none" style={{ left: `calc(${pos(startCol)} - 1px)`, width: `calc(${span(Math.max(0.5, sugEnd - startCol))} + 2px)`, borderColor: color, opacity: 0.55 }} />}
                        {/* Past the term: hatched */}
                        {over && <div className="absolute top-[13px] h-[26px] pointer-events-none z-[1]" style={{ left: pos(Math.min(N, edge(shift + length, h))), width: span(Math.max(0, Math.min(N, endCol) - Math.min(N, edge(shift + length, h)))), backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--bad) / 0.5) 0 4px, transparent 4px 8px)' }} />}
                        {bars.map(bar => {
                          return (
                            <div key={bar.pacing.id} title={`${bar.unit.title} · ${num(bar.pacing.weeks)} wk`}
                              className="absolute top-[13px] h-[26px] rounded-sm px-1 text-[length:calc(11px*var(--ts))] leading-[26px] text-white overflow-hidden whitespace-nowrap"
                              style={{ left: `calc(${pos(bar.viewStart - 1)} + 1px)`, width: `calc(${span(bar.viewEnd - bar.viewStart + 1)} - 2px)`, background: color }}>
                              {barText(bar.unit.title)}
                            </div>
                          )
                        })}
                        {canManage && rows.length > 1 && cum.slice(0, -1).map((c, k) => {
                          const col = edge(shift + c, h)
                          if (col <= 0 || col >= N) return null
                          return <span key={'d' + k} role="separator" aria-label={`${ko ? '단원 경계' : 'Line between units'} ${k + 1}–${k + 2}`}
                            onPointerDown={e => { e.preventDefault(); setDrag({ plId: pl.id, kind: 'div', k, w0: w.slice(), shift, grade: g }); setTip({ x: e.clientX, y: e.clientY, pl: pl.id }) }}
                            className="absolute top-[11px] h-[30px] w-[10px] -ml-[5px] cursor-col-resize z-[3] group touch-none" style={{ left: pos(col) }}>
                            <span className="absolute left-[4px] top-1 bottom-1 w-[2px] rounded bg-ink opacity-0 group-hover:opacity-70" />
                          </span>
                        })}
                        {canManage && rows.length > 0 && endCol <= N && (
                          <button aria-label={ko ? '책 길이 조절' : `Stretch or squeeze ${labelOf(pl)}`} title={ko ? '끌어서 길이 조절 (←/→ 키도 됨)' : 'Drag to stretch or squeeze (or use ← →)'}
                            onPointerDown={e => { e.preventDefault(); setDrag({ plId: pl.id, kind: 'end', k: 0, w0: w.slice(), shift, grade: g }); setTip({ x: e.clientX, y: e.clientY, pl: pl.id }) }}
                            onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); save(pl, spreadEvenly(total + (e.key === 'ArrowRight' ? 1 : -1), rows.length), 'stretched on the year plan') } }}
                            className="absolute top-[9px] h-[34px] w-[14px] -ml-[7px] cursor-ew-resize z-[4] flex items-center justify-center touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded" style={{ left: pos(endCol) }}>
                            <span className="w-[6px] h-[22px] rounded-sm" style={{ background: color, boxShadow: '0 0 0 2px rgb(var(--white))' }} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
            {todayPos !== null && <div title={ko ? '오늘' : 'Today'} className="absolute top-0 bottom-0 w-0 border-l-2 border-accent z-[5] pointer-events-none" style={{ left: pos(todayPos - 1) }} />}
          </div>
        </section>
      )}

      {N > 0 && gradesWithBooks.length > 0 && (
        <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-relaxed">
          {ko ? '점선 = 제안된 길이 · 빗금 = 휴일 주 또는 학기 넘침.' : 'Dashed outline = the suggested length (each unit’s default weeks). Grey hatched columns are holiday weeks; red hatching is time past the book’s term.'}
          {canManage && (ko ? ' 책 끝을 끌면 단원이 고르게 나뉘고, 단원 사이 선을 끌면 두 단원 사이에서 시간이 옮겨집니다.' : ' Drag a book’s end to stretch or squeeze it (its units share the time evenly); drag the line between two units to give one more time.')}
        </p>
      )}

      {/* Live readout while dragging */}
      {tip && draft && (() => {
        const pl = mine.find(x => x.id === tip.pl)
        if (!pl) return null
        const h = hol[pl.grade]
        const w = draft.weeks, total = sumOf(w), sug = suggestedOf(pl.id), shift = viewShift(pl.term, view, yw, h.hc)
        const length = placementLength(pl.term, yw, h.hc)
        const rows = rowsOf(pl.id)
        const unitName = (i: number) => { const u = p.units.find(x => x.id === rows[i]?.unit_id); return u ? barText(u.title) : `#${i + 1}` }
        const mid = Math.ceil(w.length / 2)
        return (
          <div className="fixed z-50 pointer-events-none rounded bg-ink text-paper px-3 py-2 text-[length:calc(12px*var(--ts))] leading-snug shadow-lg tabular-nums max-w-[300px]"
            style={{ left: Math.min(tip.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 310), top: Math.max(8, tip.y - 110) }}>
            <b>{labelOf(pl)}</b> · {w.length} · {num(total)} {ko ? '주' : 'wk'}<br />
            {drag?.kind === 'div' ? <>{unitName(drag.k)}: {num(w[drag.k])} {ko ? '주' : 'wk'} · {unitName(drag.k + 1)}: {num(w[drag.k + 1])} {ko ? '주' : 'wk'}<br /></> : <>≈ {num(total / Math.max(1, w.length))} {ko ? '주/단원' : 'wk per unit'}<br /></>}
            {unitName(mid - 1)} {ko ? '끝:' : 'done by'} {whenEnds(shift + sumOf(w.slice(0, mid)), h)}<br />
            {ko ? '끝나는 날:' : 'Finishes'} {whenEnds(shift + total, h)}<br />
            {Math.abs(total - sug) < 0.01 ? (ko ? '제안과 같음' : 'Same as suggested') : `${total > sug ? '+' : '−'}${num(Math.abs(total - sug))} ${ko ? '주 (제안' : 'wk vs suggested ('}${num(sug)})`}
            {length > 0 && total > length + 0.01 && <><br /><span className="text-warn">{ko ? `학기보다 ${num(total - length)}주 넘침` : `Runs ${num(total - length)} wk past the term`}</span></>}
          </div>
        )
      })()}
    </div>
  )
}
