'use client'

import Loading from '@/components/brand/Loading'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classDot, getKSTDateString } from '@/lib/utils'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, STRAND_LABEL, bookName, colorHex, type CurriculumBook, type CurriculumSeries, type Strand } from '@/lib/curriculumCore'
import { TERMS, TERM_LABEL, academicYears, addDays, holidayWeeks, masterRows, placementLength, todayPosition, viewShift, viewWeeks, type CurriculumPlacement, type HolidayCounts, type Term } from '@/lib/curriculumPacing'
import { changedWeeks, classKey, columnOfTeaching, fillYearWeeks, lastYearFor, levelTestDates, moduleGroups, moveBoundary, nextBook, spreadEvenly, suggestBook, teachingAtColumn, teachingAtColumnOpen, unitAt, unitLabel } from '@/lib/yearPlan'
import { createPlacement, patchMasterRows } from '@/lib/curriculumPlacementsData'
import { needsUpdate } from '@/lib/dbUpdate'
import { usePlanner } from './usePlanner'
import { PlaceForm, PlacementCard } from './PlacementsView'
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react'

// ─── Year plan: the planning meeting's screen ────────────────────────────
// One class at a time (‹ Daisy ›, or the arrow keys) as one table: a row per
// grade and subject with what the class used last year (classes move up a
// grade in March, so G3 looks at last year's G2; G1 at last year's G1), this
// year's book, and that book across the year on the same line, so deciding
// and seeing where it lands never needs a scroll. An undecided row offers the
// next book in one click and shows it as a dashed bar. The year shows spring
// and fall always (a half with no dates in Settings is assumed and shaded),
// Into Reading by module, phonics by pattern, level tests as dashed lines
// tagged with the unit each book is on, and overflow past the year in red.
// Admin drags a book's end to stretch it (units share the time evenly) or the
// line between two units to move time between them. Present fills the screen
// for a projector. Saves go to the same placements and pacing as Books by
// class and Class plans; teachers see it read-only.
// Design: docs/superpowers/specs/2026-11-27-year-plan-meeting-mode-design.md,
// layout A of the Nov 2026 layout prototypes.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink'
const btnBase = 'h-8 px-2.5 rounded border text-[length:calc(12.5px*var(--ts))] inline-flex items-center gap-1.5 whitespace-nowrap'
const btn = `${btnBase} border-rule-2 text-ink-2 hover:text-ink`
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtMonth = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
/** The table's columns: grade, subject, last year, this year's book, then the year. */
const COLS = '44px 84px minmax(110px, 150px) minmax(200px, 250px) minmax(480px, 1fr)'
const TRACK_PAD = 80          // right of the last week: room for a long book's handle and its overflow marker
const TALL_ROW = 116          // a phonics row with many units: room for a pattern written up its bar
const TERM_ORDER: Term[] = ['spring', 'year', 'fall']
const sumOf = (a: number[]) => a.reduce((x, y) => x + y, 0)
/** A series colour deep enough to carry white labels (the light series colours are near 3:1 on their own). */
const deep = (hex: string) => `color-mix(in srgb, ${hex} 78%, #000)`
/** "Into Reading" → "IR", "Science of Reading" → "SoR", "Hand in Hand" → "HiH". */
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(w => /^(of|in|and|the)$/i.test(w) ? w[0].toLowerCase() : w[0].toUpperCase()).join('')

/** A drag in progress: where the pointer and the book's end were when it started, and the lane it is measured against. */
interface Drag { plId: string; kind: 'end' | 'div'; k: number; w0: number[]; shift: number; grade: number; x0: number; col0: number; left: number; width: number }
interface Hol { hc: HolidayCounts; cols: Set<number>; names: Map<number, string> }
interface Seg { key: string; label: string; title: string; from: number; to: number }
type Row = { key: string; grade: number; strand: Strand | null; first: boolean }

export default function YearPlanView() {
  const { currentTeacher, language, semesters, activeSemester, showToast, confirmDialog, sp } = useApp()
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
  /** "IR 2": what fits in the Last year column; the full name is in its tooltip. */
  const shortOf = (pl: CurriculumPlacement) => { const b = bookOf(pl), se = seriesOf(b); if (!b) return '?'; const lv = (b.level_number || '').trim(); return [se ? initials(se.name) : '', lv.length <= 7 ? lv : ''].filter(Boolean).join(' ') || bookName(b, se) }
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

  const [open, setOpen] = useState<string | null>(null)
  const [placing, setPlacing] = useState<{ key: string; grade: number; bookId: string; term: Term; k: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { setOpen(null); setPlacing(null) }, [cls, theYear])
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const step = (d: number) => { const i = PLACED_ENGLISH_CLASSES.indexOf(cls as any); setCls(PLACED_ENGLISH_CLASSES[(i + d + PLACED_ENGLISH_CLASSES.length) % PLACED_ENGLISH_CLASSES.length]) }

  // ← → switch class; Esc leaves Present. Never with a modifier (Alt+← is Back), while typing, in a dialog, on a book's handle or with a form open in the table.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const what = classKey({
        key: e.key, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, defaultPrevented: e.defaultPrevented,
        inField: !!el && (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable),
        onGrip: !!el?.dataset.grip, dialogOpen: !!document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]'),
        panelOpen: !!(placing || open), present,
      })
      if (!what) return
      e.preventDefault()
      if (what === 'exit') setPresent(false); else step(what === 'next' ? 1 : -1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  // ─── Dragging ───
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
    if (!patches.length) { if (draftRef.current?.id === pl.id) setDraft(null); return }
    setSaving(true)
    const err = await patchMasterRows(patches, `${labelOf(pl)} · ${pl.english_class} G${pl.grade} ${what}`)
    if (!fail(err)) await p.reload()
    if (draftRef.current?.id === pl.id) setDraft(null)
    setSaving(false)
  }
  /** Starts a drag on a book's end or a unit line, measured against the book's own lane. */
  const startDrag = (e: React.PointerEvent, d: Omit<Drag, 'x0' | 'left' | 'width'>) => {
    e.preventDefault()
    const track = (e.currentTarget as HTMLElement).closest('[data-track]') as HTMLElement | null
    if (!track) return
    const r = track.getBoundingClientRect()
    setDrag({ ...d, x0: e.clientX, left: r.left, width: r.width })
    setTip({ x: e.clientX, y: e.clientY, pl: d.plId })
  }

  useEffect(() => {
    if (!drag) return
    const pl = p.placements.find(x => x.id === drag.plId)
    const h = hol[drag.grade]
    const move = (e: PointerEvent) => {
      if (!h) return
      const colW = drag.width / Math.max(1, N)
      let next: number[]
      if (drag.kind === 'end') {
        // Relative to where the drag started, so grabbing the handle of a book that runs past the year changes nothing until it moves.
        const t = teachingAtColumnOpen(drag.col0 + (e.clientX - drag.x0) / colW, h.cols, N)
        next = spreadEvenly(Math.max(0.5 * drag.w0.length, t - drag.shift), drag.w0.length)
      } else next = moveBoundary(drag.w0, drag.k, teachingAtColumn((e.clientX - drag.left) / colW, h.cols, N) - (drag.shift + sumOf(drag.w0.slice(0, drag.k + 1))))
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
  if (p.missing) return <p className="text-[length:calc(12.5px*var(--ts))] text-warn">{p.missing === 'catalogue' ? needsUpdate({ en: 'curriculum catalog', ko: '교재 목록' }, ko) : needsUpdate({ en: 'curriculum placements', ko: '교재 배치' }, ko)}</p>

  const TERM_TAG: Record<Term, string> = { spring: ko ? '봄' : 'Spring', fall: ko ? '가을' : 'Fall', year: ko ? '한 해' : 'Year' }
  const pos = (col: number) => `${(col / Math.max(1, N)) * 100}%`
  /** Right and left edges, in columns, of a span of teaching weeks: holiday columns skipped, fractions kept, past the last week counted on. */
  const edgeR = (t: number, h: Hol) => t <= 0 ? 0 : columnOfTeaching(t, h.cols, N) - (Math.ceil(t - 1e-9) - t)
  const edgeL = (t: number, h: Hol) => { const k = Math.floor(t + 1e-9) + 1; return columnOfTeaching(k, h.cols, N) - 1 + (t - (k - 1)) }
  const lastTeaching = (h: Hol) => teachingAtColumn(N, h.cols, N)
  const whenEnds = (t: number, h: Hol) => {
    const c = Math.ceil(edgeR(t, h) - 1e-9)
    if (c >= 1 && c <= N) return fmtDay(weeks[c - 1].friday) + ((c <= springCols ? assumed.spring : assumed.fall) ? '*' : '')
    return ko ? `한 해 끝 + ${num(t - lastTeaching(h))}주` : `${num(t - lastTeaching(h))} wk after the year`
  }
  const todayPos = todayPosition(weeks, today)
  /** A book's bars: one per unit (phonics by pattern), or one per module for an anthology. */
  const segsOf = (pl: CurriculumPlacement): Seg[] => {
    const se = seriesOf(bookOf(pl)), phonics = se?.strand === 'phonics'
    const rows = rowsOf(pl.id)
    const units = rows.map(r => p.units.find(u => u.id === r.unit_id))
    if (se?.kind === 'anthology') return moduleGroups(units.map(u => ({ title: u?.title || '', summary: u?.summary || '' }))).map(g => ({ key: g.key, label: g.label, title: `${g.label} · ${g.to - g.from + 1} ${g.to === g.from ? 'story' : 'stories'}`, from: g.from, to: g.to }))
    return units.map((u, i) => ({ key: rows[i].id, label: u ? sp(unitLabel(u.title, phonics)) || `#${i + 1}` : `#${i + 1}`, title: u ? sp(u.title) : '', from: i, to: i }))
  }
  /** The unit (or module) a book is on at a level test, for its tag. */
  const tagAt = (segs: Seg[], w: number[], shift: number, h: Hol, col: number): string | null => {
    if (!w.length) return null
    const at = unitAt(w, teachingAtColumn(col, h.cols, N) - shift)
    if (at === null) return null
    if (at === 'done') return '✓'
    const sg = segs.find(s => at >= s.from && at <= s.to)
    return sg ? (/^M\d+$/.test(sg.key) ? sg.key : sg.label) : null
  }

  // ─── Decisions ───
  const placeSuggestion = async (grade: number, book: CurriculumBook, key: string, keep = false) => {
    const se = seriesOf(book)
    const units = p.units.filter(u => u.book_id === book.id).sort((a, b) => a.sort_order - b.sort_order)
    // Stories are picked by hand, a book carried on from last year picks up part-way, and a book with no units is indexed first: all open the form under the row.
    if (se?.kind === 'anthology' || keep || !units.length) { setPlacing({ key, grade, bookId: book.id, term: 'year', k: Date.now() }); setOpen(null); return }
    setBusy(`${grade}|${book.id}`)
    const r = await createPlacement({ book_id: book.id, english_class: cls, grade, academic_year: theYear, term: 'year' }, units, me, bookName(book, se))
    if (!fail(r.error)) await p.reload()
    setBusy(null)
  }
  const choose = (key: string, grade: number, bookId = '', term: Term = 'year') => { setPlacing(placing?.key === key ? null : { key, grade, bookId, term, k: Date.now() }); setOpen(null) }
  /** A phonics book with many short units (Science of Reading: 91) gets a tall row, its patterns written up the bars so each one can be read. */
  const tall = (r: Row) => r.strand === 'phonics' && plsOf(r).some(pl => rowsOf(pl.id).length > 16)
  const plsOf = (r: Row) => r.strand ? mine.filter(x => x.grade === r.grade && strandOf(x) === r.strand).sort(sortPl) : []
  const lastOf = (r: Row) => r.strand ? lastYearFor(p.placements, cls, r.grade, prevYear, x => strandOf(x) === r.strand) : { grade: r.grade > 1 ? r.grade - 1 : 1, placements: [] }
  const suggestionOf = (r: Row) => { const last = lastOf(r); return r.strand && !plsOf(r).length && last.placements.length ? suggestBook(r.grade, last.placements, p.books) : undefined }
  /** A grade 2+ suggestion that is last year's own book: a one-book series carried on. */
  const keeps = (r: Row, b: CurriculumBook) => r.grade > 1 && lastOf(r).placements.some(x => x.book_id === b.id)
  const sugText = (r: Row, b: CurriculumBook) => `${r.grade === 1 ? (ko ? '작년과 같게' : 'Same as last year') : keeps(r, b) ? (ko ? '이어서' : 'Carry on') : (ko ? '다음 단계' : 'Next level')}: ${bookName(b, seriesOf(b))}`

  // ─── Rows: each grade's subjects; a grade with none gets one slim row to add a book ───
  const rows: Row[] = []
  for (const g of GRADES) {
    const gc = cells.filter(c => c.grade === g)
    if (gc.length) gc.forEach((c, i) => rows.push({ key: `${g}|${c.strand}`, grade: g, strand: c.strand, first: i === 0 }))
    else if (canManage) rows.push({ key: `${g}|-`, grade: g, strand: null, first: true })
  }
  const decided = cells.filter(c => c.decided).length
  const opened = open ? mine.find(x => x.id === open) : undefined
  const openedKey = opened ? `${opened.grade}|${strandOf(opened)}` : null

  const lane = (r: Row) => {
    const h = hol[r.grade]
    const tl = tall(r), barH = tl ? TALL_ROW - 20 : 20
    const pls = plsOf(r), sug = suggestionOf(r)
    return (
      <div data-track className="relative h-full" style={{ marginRight: TRACK_PAD }}>
        {assumed.spring && <div className="absolute top-0 bottom-0 bg-paper-2/70" style={{ left: 0, width: pos(springCols) }} />}
        {assumed.fall && <div className="absolute top-0 bottom-0 bg-paper-2/70" style={{ left: pos(springCols), right: 0 }} />}
        {Array.from(h.cols).map(c => <div key={'h' + c} title={h.names.get(c)} className="absolute top-0 bottom-0" style={{ left: pos(c - 1), width: pos(1), backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 5px, transparent 5px 9px)' }} />)}
        <div className="absolute top-0 bottom-0 border-l-2 border-ink/25" style={{ left: pos(springCols) }} />
        {pins.map(pn => <div key={pn.label} className="absolute top-0 bottom-0 border-l border-dashed border-ink/45 pointer-events-none" style={{ left: pos(pn.col) }} />)}
        {todayPos !== null && <div title={ko ? '오늘' : 'Today'} className="absolute top-0 bottom-0 border-l-2 border-accent pointer-events-none z-[4]" style={{ left: pos(todayPos - 1) }} />}
        {sug && (() => {
          const sugW = sumOf(p.units.filter(u => u.book_id === sug.id).map(u => u.default_weeks || 2)) || 36
          const R = Math.min(N, edgeR(sugW, h)), color = colorHex(seriesOf(sug)?.color || 'slate')
          const cls2 = 'absolute top-[15px] h-[20px] rounded-sm border-[1.5px] border-dashed px-1.5 text-left text-[length:calc(11.5px*var(--ts))] leading-[17px] truncate'
          return canManage
            ? <button onClick={() => placeSuggestion(r.grade, sug, r.key, keeps(r, sug))} disabled={!!busy} title={ko ? '눌러서 이 교재로 정하기' : 'Click to use this book'} className={`${cls2} text-ink-2 hover:text-ink hover:bg-surface disabled:opacity-50`} style={{ left: 0, width: pos(Math.max(2, R)), borderColor: color }}>{sugText(r, sug)}</button>
            : <div className={`${cls2} text-ink-3`} style={{ left: 0, width: pos(Math.max(2, R)), borderColor: color }}>{sugText(r, sug)}</div>
        })()}
        {pls.map(pl => {
          const b = bookOf(pl), color = colorHex(seriesOf(b)?.color || 'slate'), fill = deep(color)
          const w = weeksOf(pl.id), segs = segsOf(pl), rowsP = rowsOf(pl.id)
          const shift = viewShift(pl.term, 'year', yw, h.hc)
          const total = sumOf(w), length = placementLength(pl.term, yw, h.hc)
          const pastYear = Math.max(0, shift + total - lastTeaching(h))
          const endCol = Math.min(N, edgeR(shift + total, h)), termEnd = Math.min(N, edgeR(shift + length, h))
          const sug2 = suggestedOf(pl.id), startCol = edgeL(shift, h), sugEnd = Math.min(N, edgeR(shift + sug2, h))
          const anthology = seriesOf(b)?.kind === 'anthology'
          const cum: number[] = []; w.reduce((a, x) => { cum.push(a + x); return a + x }, 0)
          return (
            <Fragment key={pl.id}>
              {Math.abs(total - sug2) > 0.01 && <div title={ko ? `제안 길이 ${num(sug2)}주` : `Suggested length: ${num(sug2)} wk`} className="absolute top-[12px] rounded border-[1.5px] border-dashed pointer-events-none" style={{ left: pos(startCol), width: pos(Math.max(0.5, sugEnd - startCol)), height: barH + 6, borderColor: color, opacity: 0.55 }} />}
              {segs.map(sg => {
                const a = shift + sumOf(w.slice(0, sg.from)), z = shift + sumOf(w.slice(0, sg.to + 1))
                const L = edgeL(a, h), R = Math.min(N, edgeR(z, h))
                if (L >= N) return null
                return (
                  <div key={sg.key + sg.from} title={`${sg.title} · ${num(z - a)} wk · ${ko ? '끝' : 'ends'} ${whenEnds(z, h)}`}
                    className={`absolute top-[15px] rounded-[3px] text-[length:calc(11px*var(--ts))] text-white font-medium overflow-hidden whitespace-nowrap ${tl ? 'py-1.5 leading-none [writing-mode:vertical-rl] rotate-180 flex items-center' : 'px-1 leading-[20px]'}`}
                    style={{ left: `calc(${pos(L)} + 1px)`, width: `calc(${pos(Math.max(0.2, R - L))} - 2px)`, height: barH, background: fill }}>
                    {sg.label}
                  </div>
                )
              })}
              {length > 0 && total > length + 0.01 && endCol > termEnd && <div className="absolute top-[15px] pointer-events-none z-[2]" style={{ left: pos(termEnd), width: pos(endCol - termEnd), height: barH, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--bad) / 0.6) 0 4px, transparent 4px 8px)' }} />}
              {pins.map(pn => { const tag = tagAt(segs, w, shift, h, pn.col); return tag ? <span key={pn.label} title={`${pn.label}: ${tag === '✓' ? (ko ? '끝남' : 'finished') : tag}`} className="absolute top-0 -translate-x-1/2 z-[3] rounded-sm bg-ink text-paper px-1 text-[length:calc(11px*var(--ts))] font-semibold leading-[14px] whitespace-nowrap pointer-events-none max-w-[110px] truncate" style={{ left: pos(pn.col) }}>{tag}</span> : null })}
              {pastYear > 0 && <span className="absolute top-[15px] z-[4] rounded-full bg-bad text-white px-2 text-[length:calc(11px*var(--ts))] font-bold leading-[20px] whitespace-nowrap" style={{ left: `calc(100% + 14px)` }} title={ko ? '한 해를 넘어갑니다' : 'Runs past the end of the year'}>+{num(pastYear)} {ko ? '주' : 'wk'}</span>}
              {canManage && !anthology && rowsP.length > 1 && cum.slice(0, -1).map((c, k) => {
                const col = edgeR(shift + c, h)
                if (col <= 0 || col >= N) return null
                return <span key={'d' + k} role="separator" aria-label={`${ko ? '단원 경계' : 'Line between units'} ${k + 1}–${k + 2}`}
                  onPointerDown={e => startDrag(e, { plId: pl.id, kind: 'div', k, w0: w.slice(), shift, grade: r.grade, col0: 0 })}
                  className="absolute top-[13px] w-[10px] -ml-[5px] cursor-col-resize z-[3] group touch-none" style={{ left: pos(col), height: barH + 4 }}>
                  <span className="absolute left-[4px] top-1 bottom-1 w-[2px] rounded bg-ink opacity-0 group-hover:opacity-70" />
                </span>
              })}
              {canManage && rowsP.length > 0 && (
                <button data-grip="1" aria-label={ko ? '책 길이 조절' : `Stretch or squeeze ${labelOf(pl)}`} title={ko ? '끌어서 길이 조절 (←/→ 키도 됨)' : 'Drag to stretch or squeeze (or use ← →)'}
                  onPointerDown={e => startDrag(e, { plId: pl.id, kind: 'end', k: 0, w0: w.slice(), shift, grade: r.grade, col0: edgeR(shift + total, h) })}
                  onKeyDown={e => { if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !saving) { e.preventDefault(); save(pl, spreadEvenly(total + (e.key === 'ArrowRight' ? 1 : -1), rowsP.length), 'stretched on the year plan') } }}
                  className="absolute top-[10px] w-[14px] -ml-[7px] cursor-ew-resize z-[5] flex items-center justify-center touch-none rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" style={{ left: pastYear > 0 ? `calc(100% + 6px)` : pos(endCol), height: barH + 10 }}>
                  <span className="w-[6px] rounded-sm" style={{ height: barH, background: fill, boxShadow: '0 0 0 2px rgb(var(--white))' }} />
                </button>
              )}
            </Fragment>
          )
        })}
      </div>
    )
  }

  const decision = (r: Row) => {
    if (!r.strand) return canManage ? <button onClick={() => choose(r.key, r.grade)} className="text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink">{ko ? '+ 교재 추가' : '+ Add a book'}</button> : null
    const pls = plsOf(r)
    if (pls.length) {
      const onlySpring = pls.length === 1 && pls[0].term === 'spring'
      return (
        <div className="flex items-center gap-1.5 min-w-0 w-full">
          {pls.map(pl => {
            const b = bookOf(pl), color = colorHex(seriesOf(b)?.color || 'slate'), on = open === pl.id
            const inner = <>
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: deep(color) }} />
              <span className="min-w-0 flex-1 truncate text-[length:calc(12.5px*var(--ts))] font-medium text-ink">{pls.length > 1 ? shortOf(pl) : labelOf(pl)}</span>
              {(pls.length > 1 || pl.term !== 'year') && <span className="shrink-0 text-[length:calc(11px*var(--ts))] font-semibold px-1 rounded bg-paper-3 text-ink-2">{TERM_TAG[pl.term]}</span>}
            </>
            return canManage
              ? <button key={pl.id} onClick={() => { setOpen(on ? null : pl.id); setPlacing(null) }} aria-expanded={on} title={`${labelOf(pl)} · ${TERM_LABEL[pl.term].en}: ${ko ? '눌러서 단원과 길이 보기' : 'click for its units and lengths'}`}
                  className={`min-w-0 flex-1 flex items-center gap-1.5 h-7 px-1.5 rounded border text-left ${on ? 'border-ink bg-surface' : 'border-rule bg-surface hover:border-rule-2'}`}>{inner}</button>
              : <div key={pl.id} title={labelOf(pl)} className="min-w-0 flex-1 flex items-center gap-1.5 h-7 px-1.5">{inner}</div>
          })}
          {canManage && onlySpring && <button onClick={() => { const b = bookOf(pls[0]); const nb = b ? nextBook(b, p.books) : undefined; choose(r.key, r.grade, nb?.id || '', 'fall') }} className="shrink-0 text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink" title={ko ? '가을 교재 추가' : 'Add the fall book'}>{ko ? '+ 가을' : '+ Fall'}</button>}
        </div>
      )
    }
    const sug = suggestionOf(r)
    if (!canManage) return <span className="text-[length:calc(12px*var(--ts))] text-ink-3">{ko ? '미정' : 'Not decided yet'}</span>
    return (
      <div className="flex items-center gap-1.5 min-w-0 w-full">
        {sug && (
          <button onClick={() => placeSuggestion(r.grade, sug, r.key, keeps(r, sug))} disabled={!!busy} className="min-w-0 h-7 px-2 rounded border-[1.5px] border-dashed text-[length:calc(12px*var(--ts))] text-ink bg-surface hover:bg-paper-2 inline-flex items-center gap-1 disabled:opacity-50" style={{ borderColor: colorHex(seriesOf(sug)?.color || 'slate') }} title={sugText(r, sug)}>
            {busy === `${r.grade}|${sug.id}` && <Loader2 size={10} className="animate-spin shrink-0" />}
            <span className="truncate">{r.grade === 1 ? (ko ? '같게:' : 'Same:') : keeps(r, sug) ? (ko ? '이어서:' : 'Carry on:') : (ko ? '사용:' : 'Use')} {bookName(sug, seriesOf(sug))}</span>
          </button>
        )}
        <button onClick={() => choose(r.key, r.grade)} className="shrink-0 text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink">{ko ? '고르기…' : 'Choose…'}</button>
      </div>
    )
  }

  const lastLine = (r: Row) => {
    if (!r.strand) return <span className="text-ink-3">—</span>
    const last = lastOf(r)
    const full = last.placements.map(x => `${labelOf(x)}${x.term !== 'year' ? ` (${TERM_TAG[x.term]})` : ''}`).join(' → ')
    const short = last.placements.map(shortOf).join(' → ')
    return <span className="truncate" title={`${r.grade > 1 ? `${ko ? '작년' : 'Last year as'} G${last.grade}` : (ko ? '작년 G1' : 'Last year’s G1')}: ${full || (ko ? '없음' : 'none')}`}><span className="text-ink-3">G{last.grade}: </span><span className="text-ink-2">{short || '—'}</span></span>
  }

  const body = (
    <div className="flex flex-col gap-3">
      {/* Class stepper, progress and the other classes */}
      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
        <button onClick={() => step(-1)} className={btn} aria-label={ko ? '이전 반' : 'Previous class'}><ChevronLeft size={14} /></button>
        <h2 className="font-display text-[length:calc(26px*var(--ts))] leading-none text-ink inline-flex items-center gap-2 m-0 min-w-[150px]">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: classDot(cls as any) }} />{cls}
        </h2>
        <button onClick={() => step(1)} className={btn} aria-label={ko ? '다음 반' : 'Next class'}><ChevronRight size={14} /></button>
        <span className="inline-flex items-center gap-2 text-[length:calc(12.5px*var(--ts))] text-ink-2 tabular-nums">
          <span className="w-24 h-2 rounded bg-paper-3 overflow-hidden"><span className="block h-full bg-good" style={{ width: `${cells.length ? Math.round(decided / cells.length * 100) : 0}%` }} /></span>
          {ko ? `${cells.length}개 중 ${decided}개 결정` : `${decided} of ${cells.length} decided`}
        </span>
        {saving && <Loader2 size={13} className="animate-spin text-ink-3" />}
        <div className="flex gap-1 flex-wrap">
          {PLACED_ENGLISH_CLASSES.map(c => {
            const cs = cellsOf(c), d = cs.filter(x => x.decided).length
            return (
              <button key={c} onClick={() => setCls(c)} aria-pressed={cls === c} className={`h-7 px-2 rounded-full inline-flex items-center gap-1.5 text-[length:calc(12px*var(--ts))] ${cls === c ? 'bg-ink text-paper' : 'border border-rule-2 text-ink-2 hover:text-ink'}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: classDot(c as any) }} />{c}<span className="opacity-75 tabular-nums">{d}/{cs.length}</span>
              </button>
            )
          })}
        </div>
        <span className="flex-1" />
        {!present && <select aria-label={ko ? '학년도' : 'Year'} value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>}
        <button onClick={() => setPresent(v => !v)} className={present ? `${btnBase} bg-ink text-paper border-ink` : btn}>{present ? <Minimize2 size={13} /> : <Maximize2 size={13} />}{present ? (ko ? '발표 끝내기' : 'Exit') : (ko ? '발표 모드' : 'Present')}</button>
      </div>

      {/* One table: last year, this year's book and the year, a row per grade and subject */}
      <section className="shrink-0 border border-rule rounded bg-surface overflow-x-auto">
        <div className="min-w-[1000px]" role="table" aria-label={ko ? `${cls} 연간 계획` : `${cls} year plan`}>
          <div role="row" className="grid border-b border-rule bg-paper text-[length:calc(11.5px*var(--ts))] text-ink-3" style={{ gridTemplateColumns: COLS }}>
            <div role="columnheader" className="px-2 pb-1.5 self-end">{ko ? '학년' : 'Gr'}</div>
            <div role="columnheader" className="px-2 pb-1.5 self-end">{ko ? '과목' : 'Subject'}</div>
            <div role="columnheader" className="px-2 pb-1.5 self-end">{ko ? '작년' : 'Last year'}</div>
            <div role="columnheader" className="px-2 pb-1.5 self-end">{ko ? `${theYear} 교재` : `${theYear} book`}</div>
            <div role="columnheader" className="relative h-[58px]">
              <div className="absolute inset-0" style={{ marginRight: TRACK_PAD }}>
                <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink whitespace-nowrap" style={{ left: 2 }}>{ko ? '봄 학기' : 'Spring'}{assumed.spring && <span className="font-normal text-ink-3"> · {ko ? '날짜 가정*' : 'dates assumed*'}</span>}</span>
                <span className="absolute top-1 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink whitespace-nowrap" style={{ left: `calc(${pos(springCols)} + 4px)` }}>{ko ? '가을 학기' : 'Fall'}{assumed.fall && <span className="font-normal text-ink-3"> · {ko ? '날짜 가정*' : 'dates assumed*'}</span>}</span>
                {weeks.map((w, i) => (i === 0 || w.monday.slice(5, 7) !== weeks[i - 1].monday.slice(5, 7)) && <span key={w.n + '-' + i} className="absolute top-[20px] text-[length:calc(11px*var(--ts))] text-ink-3 whitespace-nowrap" style={{ left: `calc(${pos(i)} + 2px)` }}>{fmtMonth(w.monday)}</span>)}
                {pins.map(pn => <span key={pn.label} className="absolute bottom-1 -translate-x-1/2 text-[length:calc(11px*var(--ts))] font-semibold text-ink whitespace-nowrap" style={{ left: pos(pn.col) }} title={`${pn.label} · ${fmtDay(pn.date)}`}>{pn.label}</span>)}
              </div>
            </div>
          </div>
          {rows.map(r => {
            const isOpen = (!!placing && placing.key === r.key) || openedKey === r.key
            return (
              <Fragment key={r.key}>
                <div role="row" className={`grid border-b ${r.first ? 'border-t border-t-rule-2' : ''} ${isOpen ? 'bg-paper-2 border-b-transparent' : 'border-rule'}`} style={{ gridTemplateColumns: COLS, height: !r.strand ? 32 : tall(r) ? TALL_ROW : 40 }}>
                  <div role="cell" className="px-2 flex items-center font-display text-[length:calc(17px*var(--ts))] text-ink-2">{r.first ? `G${r.grade}` : ''}</div>
                  <div role="cell" className="px-2 flex items-center text-[length:calc(12px*var(--ts))] text-ink-2">{r.strand ? (ko ? STRAND_LABEL[r.strand].ko : STRAND_LABEL[r.strand].en) : ''}</div>
                  <div role="cell" className="px-2 flex items-center min-w-0 text-[length:calc(12px*var(--ts))]">{lastLine(r)}</div>
                  <div role="cell" className="px-2 flex items-center min-w-0">{decision(r)}</div>
                  <div role="cell" className="relative">{r.strand ? lane(r) : null}</div>
                </div>
                {canManage && isOpen && (
                  <div className="border-b border-rule-2 bg-paper-2 px-3 pb-3 pt-1 flex flex-col gap-2">
                    {placing && placing.key === r.key && <PlaceForm key={placing.k} terms={TERMS} p={p} ko={ko} me={me} cls={cls} grade={placing.grade} year={theYear} initialBookId={placing.bookId} initialTerm={placing.term}
                      existing={mine.filter(x => x.grade === placing.grade)} fail={fail} onDone={() => { setPlacing(null); p.reload() }} />}
                    {opened && openedKey === r.key && <PlacementCard terms={TERMS} hc={hol[opened.grade]?.hc} pl={opened} p={p} ko={ko} label={labelOf(opened)} yw={yw} fail={fail} confirmDialog={confirmDialog} onRemoved={() => setOpen(null)} />}
                  </div>
                )}
              </Fragment>
            )
          })}
          {rows.length === 0 && <p className="px-3 py-4 text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? `${cls}의 교재가 아직 없습니다.` : `No books for ${cls} yet.`}</p>}
        </div>
      </section>

      <p className="shrink-0 text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-relaxed max-w-[75ch]">
        {ko ? '점선 = 제안된 교재(눌러서 사용) · 회색 빗금 = 휴일 주 · 빨간 빗금 = 학기 넘침 · 세로 점선 = 레벨 테스트.' : 'Dashed = the suggested book, click to use it. Grey hatching = holiday weeks; red = past the book’s term. Vertical dashes = level tests, tagged with the unit each book is on.'}
        {canManage && !present && (ko ? ' 책 끝을 끌어 길이를, 단원 사이 선을 끌어 시간을 옮깁니다.' : ' Drag a book’s end to stretch it, or the line between two units to move time.')}
      </p>

      {/* Live readout while dragging */}
      {tip && draft && (() => {
        const pl = mine.find(x => x.id === tip.pl)
        if (!pl) return null
        const h = hol[pl.grade]
        const segs = segsOf(pl)
        const w = draft.weeks, total = sumOf(w), sug = suggestedOf(pl.id), shift = viewShift(pl.term, 'year', yw, h.hc)
        const length = placementLength(pl.term, yw, h.hc)
        const segName = (i: number) => segs.find(s => i >= s.from && i <= s.to)?.label || `#${i + 1}`
        const mid = Math.ceil(w.length / 2)
        return (
          <div className="fixed z-[90] pointer-events-none rounded bg-ink text-paper px-3 py-2 text-[length:calc(12px*var(--ts))] leading-snug shadow-lg tabular-nums max-w-[320px]"
            style={{ left: Math.min(tip.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 330), top: Math.max(8, tip.y - 140) }}>
            <b>{labelOf(pl)}</b> · {num(total)} {ko ? '주' : 'wk'}<br />
            {drag?.kind === 'div' ? <>{segName(drag.k)}: {num(w[drag.k])} {ko ? '주' : 'wk'} · {segName(drag.k + 1)}: {num(w[drag.k + 1])} {ko ? '주' : 'wk'}<br /></> : <>≈ {num(total / Math.max(1, w.length))} {ko ? '주/단원' : 'wk each'}<br /></>}
            {segName(mid - 1)} {ko ? '끝:' : 'done by'} {whenEnds(shift + sumOf(w.slice(0, mid)), h)} · {ko ? '끝나는 날:' : 'finishes'} {whenEnds(shift + total, h)}<br />
            {pins.map(pn => { const tag = tagAt(segs, w, shift, h, pn.col); return tag ? <span key={pn.label}>{pn.label}: {tag === '✓' ? (ko ? '끝남' : 'finished') : tag}<br /></span> : null })}
            {Math.abs(total - sug) < 0.01 ? (ko ? '제안과 같음' : 'Same as suggested') : `${total > sug ? '+' : '−'}${num(Math.abs(total - sug))} ${ko ? '주 (제안' : 'wk vs suggested ('}${num(sug)})`}
            {length > 0 && total > length + 0.01 && <><br /><span className="text-warn">{ko ? `학기보다 ${num(total - length)}주 넘침` : `Runs ${num(total - length)} wk past ${pl.term === 'year' ? 'the year' : 'the term'}`}</span></>}
          </div>
        )
      })()}
      {canManage && !present && mine.some(x => rowsOf(x.id).some(rr => Math.abs(Number(rr.weeks) - (p.units.find(u => u.id === rr.unit_id)?.default_weeks || 2)) > 1e-9)) && (
        <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 -mt-1 inline-flex items-center gap-1"><RotateCcw size={11} />{ko ? '바꾼 길이는 교재 이름을 눌러 열리는 카드에서 되돌릴 수 있습니다.' : 'Changed lengths can be reset from a book’s card: click its name.'}</p>
      )}
    </div>
  )

  // Present: the screen is the table, without the app's header and menus, for a projector.
  return present
    ? <div className="fixed inset-0 z-[80] bg-paper overflow-auto px-5 py-4" style={{ ['--ts' as any]: 1.15 }}>{body}</div>
    : body
}
