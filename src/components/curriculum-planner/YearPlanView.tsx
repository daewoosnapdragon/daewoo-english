'use client'

import Loading from '@/components/brand/Loading'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classDot, getKSTDateString } from '@/lib/utils'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, STRAND_LABEL, bookName, colorHex, levelShort, splitUnitTitle, type CurriculumBook, type CurriculumSeries, type Strand } from '@/lib/curriculumCore'
import { TERMS, TERM_LABEL, academicYears, addDays, holidayWeeks, masterRows, placementLength, todayPosition, viewShift, viewWeeks, type CurriculumPlacement, type HolidayCounts, type Term } from '@/lib/curriculumPacing'
import { changedWeeks, columnOfTeaching, fillYearWeeks, lastYearFor, levelTestDates, moduleGroups, moveBoundary, nextBook, spreadEvenly, suggestBook, teachingAtColumn, unitAt } from '@/lib/yearPlan'
import { createPlacement, patchMasterRows } from '@/lib/curriculumPlacementsData'
import { needsUpdate } from '@/lib/dbUpdate'
import { usePlanner } from './usePlanner'
import { PlaceForm, PlacementCard } from './PlacementsView'
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react'

// ─── Year plan: the planning meeting's screen ────────────────────────────
// One class at a time (← Daisy →, or the arrow keys), with how many of its
// grade-and-subject cells are decided. The board shows what the class used
// last year (classes move up a grade in March, so G3 looks at last year's
// G2; G1 at last year's G1) and offers the next book in one click. Under it,
// the year's timeline: spring and fall always (a half with no dates in
// Settings is assumed and shaded), a row per book, Into Reading as module
// bars, level tests as pins with the unit each book is on, overflow past the
// year in red. Admin drags a book's end to stretch it (units share the time
// evenly) or the line between two units to move time between them. Saves go
// to the same placements and pacing as Books by class and Class plans;
// teachers see it read-only. Design: docs/superpowers/specs/2026-11-27-year-plan-meeting-mode-design.md

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[length:calc(12.5px*var(--ts))] text-ink-2 hover:text-ink inline-flex items-center gap-1.5 whitespace-nowrap'
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtMonth = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
/** What fits on a unit's bar: its badge ("Unit 4", "M3 W1"), "SL 2" for a School Link, else its name. */
const barText = (title: string) => { const t = splitUnitTitle(title); const sl = t.name.match(/^School Link\s*(\d+)/i); return t.badge || (sl ? `SL ${sl[1]}` : t.name) }
const LABEL_W = 230
const RIGHT_PAD = 96          // room right of the last week for a long book's handle and its overflow marker
const COL_MIN = 24
const ALWAYS: Strand[] = ['phonics', 'reading', 'speaking']
const TERM_ORDER: Term[] = ['spring', 'year', 'fall']
const sumOf = (a: number[]) => a.reduce((x, y) => x + y, 0)

interface Drag { plId: string; kind: 'end' | 'div'; k: number; w0: number[]; shift: number; grade: number }
interface Hol { hc: HolidayCounts; cols: Set<number>; names: Map<number, string> }
interface Seg { key: string; label: string; title: string; from: number; to: number }

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
  const [present, setPresent] = useState(false)
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const prevYear = years[years.indexOf(theYear) + 1] || ''
  // Both halves always: a half with no dates in Settings is assumed (and shaded).
  const { yw, assumed } = useMemo(() => fillYearWeeks(semesters, theYear), [semesters, theYear])
  const weeks = useMemo(() => viewWeeks(yw, 'year'), [yw])
  const N = weeks.length
  const springCols = yw.spring.length
  const terms = TERMS

  // Each grade's days off: three or more in a week make it a holiday week, which is hatched and not counted.
  const [away, setAway] = useState<Record<number, AwayDay[]>>({})
  useEffect(() => {
    const from = yw.spring[0]?.monday, to = yw.fall[yw.fall.length - 1]?.friday
    if (!from || !to) { setAway({}); return }
    let on = true
    Promise.all(GRADES.map(g => loadAwayDays(from, to, g).then(a => [g, a] as const))).then(all => { if (on) setAway(Object.fromEntries(all)) })
    return () => { on = false }
  }, [yw])
  const hol = useMemo(() => {
    const out: Record<number, Hol> = {}
    for (const g of GRADES) {
      const a = away[g] || []
      const hs = holidayWeeks(a, yw.spring), hf = holidayWeeks(a, yw.fall)
      const names = new Map<number, string>()
      hs.forEach((nm, n) => names.set(n, nm))
      hf.forEach((nm, n) => names.set(n + yw.spring.length, nm))
      out[g] = { hc: { spring: hs.size, fall: hf.size }, cols: new Set(names.keys()), names }
    }
    return out
  }, [away, yw])
  // Level tests: the end of each grading period, as a column of the year.
  const pins = useMemo(() => levelTestDates(semesters, theYear).map(t => {
    const i = weeks.findIndex(w => t.date >= w.monday && t.date <= addDays(w.monday, 6))
    return i >= 0 ? { ...t, col: i + 1 } : null
  }).filter((x): x is { label: string; date: string; col: number } => !!x), [semesters, theYear, weeks])

  const seriesOf = (b: CurriculumBook | undefined): CurriculumSeries | undefined => b ? p.series.find(s => s.id === b.series_id) : undefined
  const bookOf = (pl: CurriculumPlacement) => p.books.find(b => b.id === pl.book_id)
  const strandOf = (pl: CurriculumPlacement): Strand => seriesOf(bookOf(pl))?.strand || 'other'
  const labelOf = (pl: CurriculumPlacement) => { const b = bookOf(pl); return b ? bookName(b, seriesOf(b)) : '?' }
  const sortPl = (a: CurriculumPlacement, b: CurriculumPlacement) => STRANDS.indexOf(strandOf(a)) - STRANDS.indexOf(strandOf(b)) || TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term)
  const masters = (c: string, y: string) => y ? p.placements.filter(x => x.english_class === c && x.academic_year === y && x.is_master) : []
  /** A class's cells: a strand counts for a grade when the class has a book in it this year, or had one last year in that grade or the grade below. */
  const cellsOf = (c: string) => {
    const now = masters(c, theYear), was = masters(c, prevYear)
    const out: { grade: number; strand: Strand; decided: boolean }[] = []
    for (const g of GRADES) for (const s of STRANDS) {
      const has = now.some(x => x.grade === g && strandOf(x) === s)
      if (has || was.some(x => (x.grade === g || x.grade === g - 1) && strandOf(x) === s)) out.push({ grade: g, strand: s, decided: has })
    }
    return out
  }
  const mine = masters(cls, theYear)
  const cells = cellsOf(cls)
  const strands = STRANDS.filter(s => ALWAYS.includes(s) || cells.some(c => c.strand === s))

  const [open, setOpen] = useState<string | null>(null)
  const [placing, setPlacing] = useState<{ grade: number; bookId: string; term: Term; key: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { setOpen(null); setPlacing(null) }, [cls, theYear])
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const step = (d: number) => { const i = PLACED_ENGLISH_CLASSES.indexOf(cls as any); setCls(PLACED_ENGLISH_CLASSES[(i + d + PLACED_ENGLISH_CLASSES.length) % PLACED_ENGLISH_CLASSES.length]) }

  // ← → switch class (not while typing, in a dialog or on a book's handle); Esc leaves Present.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (e.key === 'Escape' && present) { setPresent(false); return }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (el && (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable || el.dataset.grip)) return
      if (document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]')) return
      e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

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
      const colW = (r.width - LABEL_W - RIGHT_PAD) / Math.max(1, N)
      const t = teachingAtColumn((e.clientX - r.left - LABEL_W) / colW, h.cols, N)
      let next: number[]
      if (drag.kind === 'end') {
        // Past the last week the pointer keeps counting, so a book can be stretched beyond December.
        const past = Math.max(0, (e.clientX - r.left - LABEL_W) / colW - N)
        next = spreadEvenly(Math.max(0.5 * drag.w0.length, t + past - drag.shift), drag.w0.length)
      } else next = moveBoundary(drag.w0, drag.k, t - (drag.shift + sumOf(drag.w0.slice(0, drag.k + 1))))
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
  const pos = (col: number) => `calc(${LABEL_W}px + (100% - ${LABEL_W + RIGHT_PAD}px) * ${col / Math.max(1, N)})`
  const span = (cols: number) => `calc((100% - ${LABEL_W + RIGHT_PAD}px) * ${cols / Math.max(1, N)})`
  /** Left and right edges, in columns, of a span of teaching weeks: holiday columns skipped, fractions kept, past the last week counted on. */
  const edgeR = (t: number, h: Hol) => t <= 0 ? 0 : columnOfTeaching(t, h.cols, N) - (Math.ceil(t - 1e-9) - t)
  const edgeL = (t: number, h: Hol) => { const k = Math.floor(t + 1e-9) + 1; return columnOfTeaching(k, h.cols, N) - 1 + (t - (k - 1)) }
  const lastTeaching = (h: Hol) => teachingAtColumn(N, h.cols, N)
  const whenEnds = (t: number, h: Hol) => {
    const c = Math.ceil(edgeR(t, h) - 1e-9)
    if (c >= 1 && c <= N) return fmtDay(weeks[c - 1].friday) + ((c <= springCols ? assumed.spring : assumed.fall) ? '*' : '')
    return ko ? `한 해 끝 + ${num(t - lastTeaching(h))}주` : `${num(t - lastTeaching(h))} wk after the year`
  }
  const todayPos = todayPosition(weeks, today)
  /** A book's bars: one per unit, or one per module for an anthology. */
  const segsOf = (pl: CurriculumPlacement, anthology: boolean): Seg[] => {
    const rows = rowsOf(pl.id)
    const units = rows.map(r => p.units.find(u => u.id === r.unit_id))
    if (anthology) return moduleGroups(units.map(u => ({ title: u?.title || '', summary: u?.summary || '' }))).map(g => ({ key: g.key, label: g.label, title: `${g.label} · ${g.to - g.from + 1} ${g.to === g.from ? 'story' : 'stories'}`, from: g.from, to: g.to }))
    return units.map((u, i) => ({ key: rows[i].id, label: u ? barText(u.title) : '?', title: u?.title || '', from: i, to: i }))
  }
  /** The unit (or module) a book is on at a pin, for its tag. */
  const tagAt = (segs: Seg[], w: number[], shift: number, h: Hol, col: number): string | null => {
    const at = unitAt(w, teachingAtColumn(col, h.cols, N) - shift)
    if (at === null) return null
    if (at === 'done') return '✓'
    const sg = segs.find(s => at >= s.from && at <= s.to)
    return sg ? sg.key.startsWith('M') && sg.key.length <= 4 ? sg.key : sg.label : null
  }

  // ─── Board ───
  const placeSuggestion = async (grade: number, book: CurriculumBook) => {
    const se = seriesOf(book)
    const units = p.units.filter(u => u.book_id === book.id).sort((a, b) => a.sort_order - b.sort_order)
    // Stories are picked by hand, and a book with no units is indexed first: both open the form.
    if (se?.kind === 'anthology' || !units.length) { setPlacing({ grade, bookId: book.id, term: 'year', key: Date.now() }); setOpen(null); return }
    setBusy(`${grade}|${book.id}`)
    const r = await createPlacement({ book_id: book.id, english_class: cls, grade, academic_year: theYear, term: 'year' }, units, me, bookName(book, se))
    if (!fail(r.error)) await p.reload()
    setBusy(null)
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
  const decided = cells.filter(c => c.decided).length

  return (
    <div className="flex flex-col gap-5" style={present ? { ['--ts' as any]: 1.3 } : undefined}>
      {/* Class stepper and progress */}
      <section className="border border-rule rounded bg-surface px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => step(-1)} className={btn} aria-label={ko ? '이전 반' : 'Previous class'}><ChevronLeft size={14} /></button>
          <span className="font-display text-[length:calc(30px*var(--ts))] leading-none text-ink inline-flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full" style={{ background: classDot(cls as any) }} />{cls}
          </span>
          <button onClick={() => step(1)} className={btn} aria-label={ko ? '다음 반' : 'Next class'}><ChevronRight size={14} /></button>
          <span className="inline-flex items-center gap-2 text-[length:calc(12.5px*var(--ts))] text-ink-2">
            <span className="w-40 h-2 rounded bg-paper-3 overflow-hidden"><span className="block h-full bg-good" style={{ width: `${cells.length ? Math.round(decided / cells.length * 100) : 0}%` }} /></span>
            {ko ? `${cells.length}개 중 ${decided}개 결정됨` : `${decided} of ${cells.length} decided`}
          </span>
          {saving && <Loader2 size={13} className="animate-spin text-ink-3" />}
          <span className="flex-1" />
          {!present && <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3 inline-flex items-center gap-1.5">{ko ? '학년도' : 'Year'}
            <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
          </label>}
          <button onClick={() => setPresent(v => !v)} className={`${btn} ${present ? 'bg-ink text-paper border-ink' : ''}`}>{present ? <Minimize2 size={13} /> : <Maximize2 size={13} />}{present ? (ko ? '발표 모드 끝내기' : 'Exit present') : (ko ? '발표 모드' : 'Present')}</button>
        </div>
        {!present && (
          <div className="flex gap-1 flex-wrap">
            {PLACED_ENGLISH_CLASSES.map(c => {
              const cs = cellsOf(c), d = cs.filter(x => x.decided).length
              return (
                <button key={c} onClick={() => setCls(c)} className={`h-7 px-2.5 rounded inline-flex items-center gap-1.5 text-[length:calc(12px*var(--ts))] ${cls === c ? 'bg-ink text-paper' : 'border border-rule-2 text-ink-2 hover:text-ink'}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: classDot(c as any) }} />{c}<span className="opacity-70 tabular-nums text-[length:calc(11px*var(--ts))]">{d}/{cs.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Board: grades × strands */}
      <section className="border border-rule rounded bg-surface overflow-x-auto">
        <div style={{ minWidth: 120 + strands.length * 210 }}>
          <div className="grid border-b border-rule text-[length:calc(12px*var(--ts))] text-ink-2" style={{ gridTemplateColumns: `70px repeat(${strands.length}, minmax(0, 1fr))` }}>
            <div className="px-3 py-2">{ko ? '학년' : 'Grade'}</div>
            {strands.map(s => <div key={s} className="px-2 py-2 border-l border-rule">{ko ? STRAND_LABEL[s].ko : STRAND_LABEL[s].en}</div>)}
          </div>
          {GRADES.map(g => (
            <div key={g} className={`grid border-b border-rule last:border-b-0 ${placing?.grade === g ? 'bg-paper-2' : ''}`} style={{ gridTemplateColumns: `70px repeat(${strands.length}, minmax(0, 1fr))` }}>
              <div className="px-3 py-2 font-display text-[length:calc(18px*var(--ts))] text-ink-2">G{g}</div>
              {strands.map(s => {
                const cell = cells.find(c => c.grade === g && c.strand === s)
                if (!cell) return <div key={s} className="border-l border-rule" />
                const last = lastYearFor(p.placements, cls, g, prevYear, x => strandOf(x) === s)
                const now = mine.filter(x => x.grade === g && strandOf(x) === s).sort(sortPl)
                const sug = !now.length ? suggestBook(g, last.placements, p.books) : undefined
                const onlySpring = now.length === 1 && now[0].term === 'spring'
                const lastLabel = g > 1 ? (ko ? `${last.grade}학년 때:` : `As G${last.grade}:`) : (ko ? '작년 1학년:' : 'Last year’s G1:')
                return (
                  <div key={s} className="border-l border-rule p-1.5 flex flex-col gap-1 min-h-[62px]">
                    <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3 truncate" title={last.placements.map(labelOf).join(', ')}>
                      <span className="font-semibold text-ink-2">{lastLabel}</span> {last.placements.length ? last.placements.map(x => `${labelOf(x)}${x.term !== 'year' ? ` · ${TERM_TAG[x.term]}` : ''}`).join(' → ') : (ko ? '없음' : 'none')}
                    </span>
                    {now.map(chip)}
                    {!now.length && (
                      <div className="flex items-center gap-1.5 flex-wrap rounded border-[1.5px] border-dashed border-rule-2 px-1.5 py-1">
                        <span className="text-[length:calc(11px*var(--ts))] font-semibold uppercase tracking-wide text-warn">{ko ? '미정' : 'Undecided'}</span>
                        {canManage && sug && (
                          <button onClick={() => placeSuggestion(g, sug)} disabled={!!busy} className="h-6 px-1.5 rounded border text-[length:calc(11.5px*var(--ts))] text-ink hover:bg-paper-2 inline-flex items-center gap-1 disabled:opacity-50" style={{ borderColor: colorHex(seriesOf(sug)?.color || 'slate') }}>
                            {busy === `${g}|${sug.id}` && <Loader2 size={10} className="animate-spin" />}
                            {g === 1 ? (ko ? '작년과 같게:' : 'Same as last year:') : (ko ? '사용:' : 'Use')} {bookName(sug, seriesOf(sug))}
                          </button>
                        )}
                        {canManage && <button onClick={() => { setPlacing({ grade: g, bookId: '', term: 'year', key: Date.now() }); setOpen(null) }} className="h-6 px-1 text-[length:calc(11.5px*var(--ts))] text-ink-3 hover:text-ink">{ko ? '고르기…' : 'Choose…'}</button>}
                      </div>
                    )}
                    {canManage && onlySpring && (
                      <button onClick={() => { const b = bookOf(now[0]); const nb = b ? nextBook(b, p.books) : undefined; setPlacing({ grade: g, bookId: nb?.id || '', term: 'fall', key: Date.now() }); setOpen(null) }} className="self-start h-6 px-1 text-[length:calc(11.5px*var(--ts))] text-ink-3 hover:text-ink">{ko ? '+ 가을 교재' : '+ Fall book'}</button>
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
          {placing && <PlaceForm key={placing.key} terms={terms} p={p} ko={ko} me={me} cls={cls} grade={placing.grade} year={theYear} initialBookId={placing.bookId} initialTerm={placing.term}
            existing={mine.filter(x => x.grade === placing.grade)} fail={fail} onDone={() => { setPlacing(null); p.reload() }} />}
          {opened && <PlacementCard terms={terms} hc={hol[opened.grade]?.hc} pl={opened} p={p} ko={ko} label={labelOf(opened)} yw={yw} fail={fail} confirmDialog={confirmDialog} onRemoved={() => setOpen(null)} />}
        </div>
      )}

      {/* Timeline: a row per book, grouped by grade */}
      {gradesWithBooks.length === 0 ? (
        <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? `${cls}의 ${theYear} 교재가 아직 없습니다.` : `Nothing decided for ${cls} in ${theYear} yet. Press Use on the board to take the suggestion, or Choose….`}</p>
      ) : (
        <section className="border border-rule rounded bg-surface overflow-x-auto">
          <div ref={gridRef} className="relative" style={{ minWidth: LABEL_W + RIGHT_PAD + N * COL_MIN }}>
            {/* Assumed halves are shaded behind everything */}
            {assumed.spring && <div className="absolute top-0 bottom-0 bg-paper-2/70" style={{ left: pos(0), width: span(springCols) }} />}
            {assumed.fall && <div className="absolute top-0 bottom-0 bg-paper-2/70" style={{ left: pos(springCols), width: span(N - springCols) }} />}
            {/* Header: halves, months, level tests */}
            <div className="relative h-6 border-b border-rule">
              <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink uppercase tracking-wide whitespace-nowrap" style={{ left: `calc(${pos(0)} + 4px)` }}>{ko ? '봄 학기' : 'Spring'}{assumed.spring && <span className="normal-case tracking-normal font-normal text-ink-3"> · {ko ? '날짜 가정' : 'dates assumed'}</span>}</span>
              <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink uppercase tracking-wide whitespace-nowrap" style={{ left: `calc(${pos(springCols)} + 6px)` }}>{ko ? '가을 학기' : 'Fall'}{assumed.fall && <span className="normal-case tracking-normal font-normal text-ink-3"> · {ko ? '날짜 가정' : 'dates assumed'}</span>}</span>
            </div>
            <div className="relative flex h-7 border-b border-rule">
              <div className="shrink-0 px-3 flex items-center text-[length:calc(12px*var(--ts))] text-ink-2" style={{ width: LABEL_W }}>{ko ? '교재' : 'Book'}</div>
              <div className="grid" style={{ width: span(N), gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                {weeks.map((w, i) => {
                  const newMonth = i === 0 || w.monday.slice(5, 7) !== weeks[i - 1].monday.slice(5, 7)
                  return <div key={w.n} title={fmtDay(w.monday)} className="border-l border-rule/60 text-[length:calc(11px*var(--ts))] text-ink-3 leading-tight px-0.5 pt-1.5 overflow-visible whitespace-nowrap">{newMonth ? fmtMonth(w.monday) : ''}</div>
                })}
              </div>
            </div>
            {pins.length > 0 && (
              <div className="relative h-5 border-b border-rule">
                {pins.map(pn => <span key={pn.label} className="absolute top-0.5 -translate-x-1/2 text-[length:calc(10.5px*var(--ts))] font-semibold text-accent whitespace-nowrap bg-surface px-1" style={{ left: pos(pn.col) }} title={`${pn.label} · ${fmtDay(pn.date)}`}>{pn.label}</span>)}
              </div>
            )}

            {gradesWithBooks.map(g => {
              const h = hol[g]
              const pls = mine.filter(x => x.grade === g).sort(sortPl)
              return (
                <Fragment key={g}>
                  <div className="relative px-3 py-1 bg-paper border-b border-rule text-[length:calc(12px*var(--ts))] font-semibold text-ink-2">{ko ? `${g}학년` : `Grade ${g}`}</div>
                  {pls.map(pl => {
                    const b = bookOf(pl), se = seriesOf(b), color = colorHex(se?.color || 'slate')
                    const anthology = se?.kind === 'anthology'
                    const rows = rowsOf(pl.id)
                    const w = weeksOf(pl.id)
                    const segs = segsOf(pl, anthology)
                    const shift = viewShift(pl.term, 'year', yw, h.hc)
                    const total = sumOf(w), sug = suggestedOf(pl.id), length = placementLength(pl.term, yw, h.hc)
                    const overTerm = length > 0 && total > length + 0.01
                    const pastYear = Math.max(0, shift + total - lastTeaching(h))
                    const endCol = Math.min(N, edgeR(shift + total, h))
                    const startCol = edgeL(shift, h)
                    const sugEnd = Math.min(N, edgeR(shift + sug, h))
                    const noun = anthology ? (ko ? '편' : rows.length === 1 ? 'story' : 'stories') : (ko ? '단원' : rows.length === 1 ? 'unit' : 'units')
                    const differs = rows.some(r => Math.abs(Number(r.weeks) - (p.units.find(u => u.id === r.unit_id)?.default_weeks || 2)) > 1e-9)
                    const cum: number[] = []; w.reduce((a, x) => { cum.push(a + x); return a + x }, 0)
                    const termEnd = Math.min(N, edgeR(shift + length, h))
                    return (
                      <div key={pl.id} className="relative h-[56px] border-b border-rule last:border-b-0">
                        {Array.from(h.cols).map(c => <div key={'h' + c} title={h.names.get(c)} className="absolute top-0 bottom-0" style={{ left: pos(c - 1), width: span(1), backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 6px, transparent 6px 10px)' }} />)}
                        <div className="absolute top-0 bottom-0 border-l-2 border-ink/30" style={{ left: pos(springCols) }} />
                        {pins.map(pn => <div key={pn.label} className="absolute top-0 bottom-0 border-l border-dashed border-accent/70 z-[3] pointer-events-none" style={{ left: pos(pn.col) }} />)}
                        <div className="absolute left-0 top-0 bottom-0 px-3 flex flex-col justify-center bg-surface border-r border-rule z-[5]" style={{ width: LABEL_W }}>
                          <span className="flex items-center gap-1.5 min-w-0" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 6 }}>
                            <span className="text-[length:calc(12.5px*var(--ts))] font-semibold text-ink truncate" title={labelOf(pl)}>{labelOf(pl)} <span className="font-normal text-ink-3">· {TERM_TAG[pl.term]}</span></span>
                            {canManage && differs && !drag && <button onClick={() => save(pl, rows.map(r => p.units.find(u => u.id === r.unit_id)?.default_weeks || 2), 'back to suggested lengths')} className="shrink-0 text-[length:calc(11px*var(--ts))] text-accent hover:underline inline-flex items-center gap-0.5" title={ko ? '제안된 길이로 되돌리기' : 'Back to the suggested lengths'}><RotateCcw size={10} />{ko ? '제안대로' : 'reset'}</button>}
                          </span>
                          <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-snug pl-[9px] truncate" title={overTerm ? `${num(total - length)} wk past the term` : undefined}>
                            {anthology ? `${segs.length} ${ko ? '모듈' : segs.length === 1 ? 'module' : 'modules'} · ${rows.length} ${noun}` : `${rows.length} ${noun}`} · {num(total)} {ko ? '주' : 'wk'}{Math.abs(total - sug) > 0.01 ? ` (${total > sug ? '+' : '−'}${num(Math.abs(total - sug))})` : ''}
                            {overTerm && <span className="text-bad"> · {ko ? `${num(total - length)}주 넘침` : `${num(total - length)} wk past ${pl.term === 'year' ? 'the year' : 'the term'}`}</span>}
                          </span>
                        </div>
                        {/* Suggested length: dashed outline behind the bars */}
                        {sug > 0 && <div className="absolute top-[12px] h-[32px] rounded border-[1.5px] border-dashed pointer-events-none" style={{ left: `calc(${pos(startCol)} - 1px)`, width: `calc(${span(Math.max(0.5, sugEnd - startCol))} + 2px)`, borderColor: color, opacity: 0.55 }} />}
                        {/* The bars: a unit each, or a module each for Into Reading */}
                        {segs.map(sg => {
                          const a = shift + sumOf(w.slice(0, sg.from)), z = shift + sumOf(w.slice(0, sg.to + 1))
                          const L = edgeL(a, h), R = Math.min(N, edgeR(z, h))
                          if (L >= N) return null
                          return (
                            <div key={sg.key + sg.from} title={`${sg.title} · ${num(z - a)} wk · ${ko ? '끝' : 'ends'} ${whenEnds(z, h)}`}
                              className="absolute top-[15px] h-[26px] rounded-sm px-1 text-[length:calc(11px*var(--ts))] leading-[26px] text-white overflow-hidden whitespace-nowrap"
                              style={{ left: `calc(${pos(L)} + 1px)`, width: `calc(${span(Math.max(0.2, R - L))} - 2px)`, background: color }}>
                              {sg.label}
                            </div>
                          )
                        })}
                        {/* Past the term: hatched */}
                        {overTerm && endCol > termEnd && <div className="absolute top-[15px] h-[26px] pointer-events-none z-[2]" style={{ left: pos(termEnd), width: span(endCol - termEnd), backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--bad) / 0.55) 0 4px, transparent 4px 8px)' }} />}
                        {/* Level tests: which unit the book is on */}
                        {pins.map(pn => { const tag = tagAt(segs, w, shift, h, pn.col); return tag ? <span key={pn.label} title={`${pn.label}: ${tag === '✓' ? 'finished' : tag}`} className="absolute top-[2px] -translate-x-1/2 z-[4] rounded bg-accent-light text-accent px-1 text-[length:calc(10px*var(--ts))] font-bold leading-[13px] whitespace-nowrap pointer-events-none" style={{ left: pos(pn.col) }}>{tag}</span> : null })}
                        {pastYear > 0 && <span className="absolute top-[15px] z-[4] rounded-full bg-bad text-white px-2 text-[length:calc(11px*var(--ts))] font-bold leading-[26px] whitespace-nowrap" style={{ left: `calc(${pos(N)} + 14px)` }} title={ko ? '한 해를 넘어갑니다' : 'Runs past the end of the year'}>→ +{num(pastYear)} {ko ? '주' : 'wk'}</span>}
                        {canManage && !anthology && rows.length > 1 && cum.slice(0, -1).map((c, k) => {
                          const col = edgeR(shift + c, h)
                          if (col <= 0 || col >= N) return null
                          return <span key={'d' + k} role="separator" aria-label={`${ko ? '단원 경계' : 'Line between units'} ${k + 1}–${k + 2}`}
                            onPointerDown={e => { e.preventDefault(); setDrag({ plId: pl.id, kind: 'div', k, w0: w.slice(), shift, grade: g }); setTip({ x: e.clientX, y: e.clientY, pl: pl.id }) }}
                            className="absolute top-[13px] h-[30px] w-[10px] -ml-[5px] cursor-col-resize z-[3] group touch-none" style={{ left: pos(col) }}>
                            <span className="absolute left-[4px] top-1 bottom-1 w-[2px] rounded bg-ink opacity-0 group-hover:opacity-70" />
                          </span>
                        })}
                        {canManage && rows.length > 0 && (
                          <button data-grip="1" aria-label={ko ? '책 길이 조절' : `Stretch or squeeze ${labelOf(pl)}`} title={ko ? '끌어서 길이 조절 (←/→ 키도 됨)' : 'Drag to stretch or squeeze (or use ← →)'}
                            onPointerDown={e => { e.preventDefault(); setDrag({ plId: pl.id, kind: 'end', k: 0, w0: w.slice(), shift, grade: g }); setTip({ x: e.clientX, y: e.clientY, pl: pl.id }) }}
                            onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); save(pl, spreadEvenly(total + (e.key === 'ArrowRight' ? 1 : -1), rows.length), 'stretched on the year plan') } }}
                            className="absolute top-[11px] h-[34px] w-[14px] -ml-[7px] cursor-ew-resize z-[6] flex items-center justify-center touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded" style={{ left: pastYear > 0 ? `calc(${pos(N)} + 4px)` : pos(endCol) }}>
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

      {!present && gradesWithBooks.length > 0 && (
        <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-relaxed">
          {ko ? '점선 = 제안된 길이 · 회색 빗금 = 휴일 주 · 빨간 빗금 = 학기 넘침 · 빨간 점선 = 레벨 테스트(그때 하고 있을 단원).' : 'Dashed outline = the suggested length (each unit’s default weeks). Grey hatching = holiday weeks; red hatching = time past the book’s term. Red dashed lines are level tests (end of each grading period), tagged with the unit each book is on then. Dates marked * are assumed.'}
          {canManage && (ko ? ' 책 끝을 끌면 단원이 고르게 나뉘고, 단원 사이 선을 끌면 두 단원 사이에서 시간이 옮겨집니다. ← → 키로 반을 바꿉니다.' : ' Drag a book’s end to stretch or squeeze it (its units share the time evenly); drag the line between two units to give one more time. ← → switch class.')}
        </p>
      )}

      {/* Live readout while dragging */}
      {tip && draft && (() => {
        const pl = mine.find(x => x.id === tip.pl)
        if (!pl) return null
        const h = hol[pl.grade]
        const anthology = seriesOf(bookOf(pl))?.kind === 'anthology'
        const segs = segsOf(pl, anthology)
        const w = draft.weeks, total = sumOf(w), sug = suggestedOf(pl.id), shift = viewShift(pl.term, 'year', yw, h.hc)
        const length = placementLength(pl.term, yw, h.hc)
        const segName = (i: number) => segs.find(s => i >= s.from && i <= s.to)?.label || `#${i + 1}`
        const mid = Math.ceil(w.length / 2)
        return (
          <div className="fixed z-50 pointer-events-none rounded bg-ink text-paper px-3 py-2 text-[length:calc(12px*var(--ts))] leading-snug shadow-lg tabular-nums max-w-[320px]"
            style={{ left: Math.min(tip.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 330), top: Math.max(8, tip.y - 140) }}>
            <b>{labelOf(pl)}</b> · {num(total)} {ko ? '주' : 'wk'}<br />
            {drag?.kind === 'div' ? <>{segName(drag.k)}: {num(w[drag.k])} {ko ? '주' : 'wk'} · {segName(drag.k + 1)}: {num(w[drag.k + 1])} {ko ? '주' : 'wk'}<br /></> : <>≈ {num(total / Math.max(1, w.length))} {ko ? '주/단원' : anthology ? 'wk per story' : 'wk per unit'}<br /></>}
            {segName(mid - 1)} {ko ? '끝:' : 'done by'} {whenEnds(shift + sumOf(w.slice(0, mid)), h)} · {ko ? '끝나는 날:' : 'finishes'} {whenEnds(shift + total, h)}<br />
            {pins.map(pn => { const tag = tagAt(segs, w, shift, h, pn.col); return tag ? <span key={pn.label}>{pn.label}: {tag === '✓' ? (ko ? '끝남' : 'finished') : tag}<br /></span> : null })}
            {Math.abs(total - sug) < 0.01 ? (ko ? '제안과 같음' : 'Same as suggested') : `${total > sug ? '+' : '−'}${num(Math.abs(total - sug))} ${ko ? '주 (제안' : 'wk vs suggested ('}${num(sug)})`}
            {length > 0 && total > length + 0.01 && <><br /><span className="text-warn">{ko ? `학기보다 ${num(total - length)}주 넘침` : `Runs ${num(total - length)} wk past ${pl.term === 'year' ? 'the year' : 'the term'}`}</span></>}
          </div>
        )
      })()}
    </div>
  )
}
