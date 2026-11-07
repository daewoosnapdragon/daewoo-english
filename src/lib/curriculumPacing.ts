import { colorHex, type CurriculumBook, type CurriculumSeries, type CurriculumUnit, type Strand } from '@/lib/curriculumCore'

// ─── Placements and pacing ───────────────────────────────────────
// A placement is a book in a class and grade for a term; pacing is the order
// and weeks of its units. See supabase/migration-curriculum-placements.sql.
// The pure parts are here: which weeks a term has (from the grading periods
// in the semesters table), where each unit lands when its weeks are added
// up, which weeks are holidays, where today is, and what the ladder can
// say about a level's books across the grades. The pages call them.

export type Term = 'fall' | 'spring' | 'year'
export type Half = 'fall' | 'spring'
export const TERM_LABEL: Record<Term, { en: string; ko: string }> = { fall: { en: 'Fall', ko: '가을 학기' }, spring: { en: 'Spring', ko: '봄 학기' }, year: { en: 'Whole year', ko: '한 해' } }

export interface CurriculumPlacement {
  id: string; book_id: string; english_class: string; grade: number; academic_year: string; term: Term; is_master: boolean
  created_by: string | null; created_at: string; updated_at: string
}
export interface CurriculumPacing {
  id: string; placement_id: string; unit_id: string; sort_order: number; weeks: number; owner: 'master' | 'teacher'
  teacher_id: string | null; gap_before: number; fixed: boolean; done_at: string | null; created_at: string; updated_at: string
}
export interface CurriculumBlock {
  id: string; teacher_id: string; english_class: string; grade: number; academic_year: string; term: Half; title: string; strand: Strand
  skill_tags: string[]; start_week: number; weeks: number; notes: string; created_at: string; updated_at: string
}
export interface CurriculumHere { id: string; placement_id: string; teacher_id: string; unit_id: string | null; week: number; note: string; set_at: string }
export interface CurriculumPlanReview { id: string; placement_id: string; teacher_id: string; signature: string; comment: string; seen_by: string | null; seen_at: string | null; updated_at: string }

export const isPlacementsMissing = (message: string | undefined | null) => !!message && /curriculum_placements|curriculum_pacing/.test(message)
export const isPlansMissing = (message: string | undefined | null) => !!message && /curriculum_blocks|curriculum_here|curriculum_plan_reviews|gap_before|teacher_id/.test(message)

// ─── Dates and weeks ─────────────────────────────────────────────

/** What the helpers need from a semesters row. */
export type SemesterLike = { academic_year: string; type: string; start_date: string | null; end_date: string | null }

export const addDays = (key: string, n: number) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
/** The Monday of the week a date is in. */
export const mondayOf = (key: string) => { const wd = new Date(key + 'T12:00:00Z').getUTCDay(); return addDays(key, wd === 0 ? -6 : 1 - wd) }

export interface Week { n: number; monday: string; friday: string }

/** Every teaching week from the one holding `start` to the one holding `end`, numbered from 1. */
export function weekList(start: string, end: string): Week[] {
  const out: Week[] = []
  if (!start || !end || start > end) return out
  let m = mondayOf(start)
  const last = mondayOf(end)
  let n = 1
  while (m <= last && n < 60) { out.push({ n, monday: m, friday: addDays(m, 4) }); m = addDays(m, 7); n += 1 }
  return out
}

/** The academic years the semesters table knows, newest first. */
export const academicYears = (semesters: { academic_year: string }[]) => Array.from(new Set(semesters.map(s => s.academic_year).filter(Boolean))).sort().reverse()

export interface TermDates { start: string | null; end: string | null }
/** A term's dates: the earliest start and latest end of that half's grading periods in the year. */
export function termDates(semesters: SemesterLike[], year: string, half: Half): TermDates {
  const rows = semesters.filter(s => s.academic_year === year && s.type.startsWith(half))
  const starts = rows.map(s => s.start_date).filter((d): d is string => !!d).sort()
  const ends = rows.map(s => s.end_date).filter((d): d is string => !!d).sort()
  return { start: starts[0] || null, end: ends[ends.length - 1] || null }
}

/** The half of the year a date falls in, by the term dates; the nearer one when it is in neither. */
export function halfOf(semesters: SemesterLike[], year: string, date: string): Half {
  const f = termDates(semesters, year, 'fall'), s = termDates(semesters, year, 'spring')
  if (f.start && f.end && date >= f.start && date <= f.end) return 'fall'
  if (s.start && s.end && date >= s.start && date <= s.end) return 'spring'
  if (s.start && date >= s.start) return 'spring'
  return 'fall'
}

export interface YearWeeks { fall: Week[]; spring: Week[] }
export const yearWeeks = (semesters: SemesterLike[], year: string): YearWeeks => {
  const f = termDates(semesters, year, 'fall'), s = termDates(semesters, year, 'spring')
  return { fall: f.start && f.end ? weekList(f.start, f.end) : [], spring: s.start && s.end ? weekList(s.start, s.end) : [] }
}

/** How many weeks a placement has to fill: its term's weeks, or both halves for a year placement. */
export const placementLength = (term: Term, yw: YearWeeks) => term === 'year' ? yw.fall.length + yw.spring.length : yw[term].length

// ─── Where the units land ────────────────────────────────────────

export interface Bar { pacing: CurriculumPacing; unit: CurriculumUnit; start: number; end: number }

/** Adds the weeks up in order: unit 1 runs from week 1, unit 2 starts where it ends, and so on. `start` and `end` are in placement weeks and may be fractional. */
export function layoutPacing(pacing: CurriculumPacing[], units: CurriculumUnit[]): Bar[] {
  const byId = new Map(units.map(u => [u.id, u]))
  let cursor = 0
  const out: Bar[] = []
  for (const p of [...pacing].sort((a, b) => a.sort_order - b.sort_order)) {
    const unit = byId.get(p.unit_id)
    if (!unit) continue
    const w = Math.max(0.5, Number(p.weeks) || 0)
    cursor += Math.max(0, Number(p.gap_before) || 0)
    out.push({ pacing: p, unit, start: cursor + 1, end: cursor + w })
    cursor += w
  }
  return out
}

export const totalWeeks = (pacing: CurriculumPacing[]) => pacing.reduce((a, p) => a + (Number(p.weeks) || 0) + Math.max(0, Number(p.gap_before) || 0), 0)

export interface ViewBar extends Bar { viewStart: number; viewEnd: number; cutLeft: boolean; cutRight: boolean }

/**
 * The bars that show on a board for one half of the year. A placement for that
 * half starts at its week 1; a year placement shown in spring is shifted
 * back by the fall's weeks. Bars outside the view are dropped, bars crossing
 * its edges are cut and say so.
 */
export function barsForView(bars: Bar[], term: Term, view: Half, yw: YearWeeks): ViewBar[] {
  if (term !== 'year' && term !== view) return []
  const offset = term === 'year' && view === 'spring' ? yw.fall.length : 0
  const n = yw[view].length
  if (!n) return []
  const out: ViewBar[] = []
  for (const b of bars) {
    const s = b.start - offset, e = b.end - offset
    if (e < 1 || s > n) continue
    out.push({ ...b, viewStart: Math.max(1, s), viewEnd: Math.min(n, e), cutLeft: s < 1, cutRight: e > n })
  }
  return out
}

export interface Lane { strand: Strand; label: string; bars: (ViewBar & { placement: CurriculumPlacement; book: CurriculumBook; series: CurriculumSeries | undefined; color: string })[] }

const STRAND_ORDER: Strand[] = ['phonics', 'reading', 'writing', 'speaking', 'grammar', 'other']
const STRAND_EN: Record<Strand, string> = { phonics: 'Phonics', reading: 'Reading', writing: 'Writing', speaking: 'Speaking', grammar: 'Grammar', other: 'Other' }

/** One lane per strand that has a bar, in the fixed strand order. */
export function boardLanes(
  placements: CurriculumPlacement[], pacing: CurriculumPacing[], units: CurriculumUnit[], books: CurriculumBook[], series: CurriculumSeries[], view: Half, yw: YearWeeks,
  teacherId: string | null = null,
): Lane[] {
  const lanes = new Map<Strand, Lane>()
  for (const pl of placements) {
    const book = books.find(b => b.id === pl.book_id)
    if (!book) continue
    const se = series.find(s => s.id === book.series_id)
    const strand: Strand = se?.strand || 'other'
    const rows = effectiveRows(pacing, pl.id, teacherId)
    const laid = se?.kind === 'anthology' ? projectAnthology(rows, placementLength(pl.term, yw)) : rows
    const bars = barsForView(layoutPacing(laid, units), pl.term, view, yw)
    if (!bars.length) continue
    if (!lanes.has(strand)) lanes.set(strand, { strand, label: STRAND_EN[strand], bars: [] })
    const lane = lanes.get(strand)!
    for (const b of bars) lane.bars.push({ ...b, placement: pl, book, series: se, color: colorHex(se?.color || 'slate') })
  }
  return STRAND_ORDER.filter(s => lanes.has(s)).map(s => lanes.get(s)!)
}

// ─── Holidays and today ──────────────────────────────────────────

/** Weeks with three or more away days (days off or trips for the grade) are drawn as holiday weeks. */
export function holidayWeeks(away: { date: string; reason: string }[], weeks: Week[]): Map<number, string> {
  const out = new Map<number, string>()
  for (const w of weeks) {
    const hits = away.filter(a => a.date >= w.monday && a.date <= w.friday)
    if (hits.length >= 3) out.set(w.n, hits[0].reason)
  }
  return out
}

/** Today as a position in the view's weeks: week number plus the fraction of the week gone (Mon 0 … Fri 0.8), or null when outside. */
export function todayPosition(weeks: Week[], today: string): number | null {
  const w = weeks.find(x => today >= x.monday && today <= addDays(x.monday, 6))
  if (!w) return null
  const wd = new Date(today + 'T12:00:00Z').getUTCDay()
  const dayIndex = wd === 0 ? 5 : Math.min(5, wd - 1)
  return w.n + dayIndex / 5
}

// ─── The ladder ──────────────────────────────────────────────────

export interface LadderBook { book: CurriculumBook; series: CurriculumSeries | undefined; terms: Term[]; placements: CurriculumPlacement[] }
export interface LadderRow { grade: number; books: LadderBook[] }

/** One row per grade, 5 down to 1, with the books placed for that class and year; a book placed in both halves is one card with both terms. */
export function ladderRows(level: string, year: string, placements: CurriculumPlacement[], books: CurriculumBook[], series: CurriculumSeries[], grades: number[]): LadderRow[] {
  return [...grades].sort((a, b) => b - a).map(grade => {
    const mine = placements.filter(p => p.english_class === level && p.grade === grade && p.academic_year === year && p.is_master)
    const byBook = new Map<string, LadderBook>()
    for (const p of mine) {
      const book = books.find(b => b.id === p.book_id)
      if (!book) continue
      if (!byBook.has(book.id)) byBook.set(book.id, { book, series: series.find(s => s.id === book.series_id), terms: [], placements: [] })
      const lb = byBook.get(book.id)!
      lb.placements.push(p)
      if (!lb.terms.includes(p.term)) lb.terms.push(p.term)
    }
    const order = (lb: LadderBook) => STRAND_ORDER.indexOf(lb.series?.strand || 'other')
    return { grade, books: Array.from(byBook.values()).sort((a, b) => order(a) - order(b) || (a.series?.name || '').localeCompare(b.series?.name || '')) }
  })
}

export interface LadderCheck { kind: 'drop' | 'gap' | 'seam'; text: string }

/** What the ladder can say about a level: a series whose level number falls between grades, a strand with no book at a grade, a series handing over to another. */
export function ladderChecks(rows: LadderRow[], series: CurriculumSeries[]): LadderCheck[] {
  const out: LadderCheck[] = []
  const asc = [...rows].sort((a, b) => a.grade - b.grade)
  const num = (s: string) => { const m = s.match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null }
  for (const se of series) {
    let prev: { grade: number; n: number } | null = null
    for (const r of asc) {
      for (const lb of r.books) {
        if (lb.series?.id !== se.id) continue
        const n = num(lb.book.level_number)
        if (n === null) continue
        if (prev && n < prev.n) out.push({ kind: 'drop', text: `${se.name} goes from ${prev.n} at Grade ${prev.grade} to ${n} at Grade ${r.grade}.` })
        prev = { grade: r.grade, n }
      }
    }
  }
  const strands = Array.from(new Set(asc.flatMap(r => r.books.map(lb => lb.series?.strand || 'other'))))
  for (const strand of strands) {
    const have = asc.filter(r => r.books.some(lb => (lb.series?.strand || 'other') === strand)).map(r => r.grade)
    const lo = Math.min(...have), hi = Math.max(...have)
    const missing = asc.map(r => r.grade).filter(g => g > lo && g < hi && !have.includes(g))
    if (missing.length) out.push({ kind: 'gap', text: `${STRAND_EN[strand as Strand]} has no book at Grade ${missing.join(', ')} but does above and below.` })
    for (let i = 1; i < asc.length; i++) {
      const a = asc[i - 1].books.filter(lb => (lb.series?.strand || 'other') === strand).map(lb => lb.series?.id)
      const b = asc[i].books.filter(lb => (lb.series?.strand || 'other') === strand).map(lb => lb.series?.id)
      if (a.length && b.length && !a.some(x => b.includes(x))) {
        const from = asc[i - 1].books.find(lb => (lb.series?.strand || 'other') === strand)?.series?.name
        const to = asc[i].books.find(lb => (lb.series?.strand || 'other') === strand)?.series?.name
        out.push({ kind: 'seam', text: `${STRAND_EN[strand as Strand]} changes series at Grade ${asc[i].grade}: ${from} to ${to}. Check the seam for skills neither covers.` })
      }
    }
  }
  return out
}

// ─── Teachers' own plans ─────────────────────────────────────────

export const masterRows = (pacing: CurriculumPacing[], placementId: string) => pacing.filter(p => p.placement_id === placementId && p.owner === 'master')
export const teacherRows = (pacing: CurriculumPacing[], placementId: string, teacherId: string) => pacing.filter(p => p.placement_id === placementId && p.owner === 'teacher' && p.teacher_id === teacherId)
/** The teacher's rows when they have made a copy, else the master's. */
export function effectiveRows(pacing: CurriculumPacing[], placementId: string, teacherId: string | null): CurriculumPacing[] {
  if (teacherId) { const mine = teacherRows(pacing, placementId, teacherId); if (mine.length) return mine }
  return masterRows(pacing, placementId)
}
export const hasOwnPlan = (pacing: CurriculumPacing[], placementId: string, teacherId: string) => teacherRows(pacing, placementId, teacherId).length > 0

export interface RowPatch { id: string; weeks?: number; gap_before?: number }
const half = (n: number) => Math.round(n * 2) / 2

/**
 * "We're here": make `unitId` start at `targetStart` (a placement week). Behind the
 * plan, the unit gets a gap before it. Ahead of it, the gap goes first, then the
 * units before it get shorter, latest first, never under half a week. Returns the
 * rows to change; empty when nothing can move.
 */
export function reflowTo(rows: CurriculumPacing[], units: CurriculumUnit[], unitId: string, targetStart: number): RowPatch[] {
  const bars = layoutPacing(rows, units)
  const i = bars.findIndex(b => b.unit.id === unitId)
  if (i < 0) return []
  let delta = half(targetStart) - bars[i].start
  if (Math.abs(delta) < 0.25) return []
  const me = bars[i].pacing
  if (delta > 0) return [{ id: me.id, gap_before: half(Math.max(0, Number(me.gap_before) || 0) + delta) }]
  const patches: RowPatch[] = []
  let need = -delta
  const gap = Math.max(0, Number(me.gap_before) || 0)
  if (gap > 0) { const take = Math.min(gap, need); patches.push({ id: me.id, gap_before: half(gap - take) }); need = half(need - take) }
  for (let j = i - 1; j >= 0 && need > 0; j--) {
    const r = bars[j].pacing
    const g = Math.max(0, Number(r.gap_before) || 0)
    let gapTake = Math.min(g, need)
    need = half(need - gapTake)
    const room = Math.max(0, (Number(r.weeks) || 0) - 0.5)
    const take = Math.min(room, need)
    need = half(need - take)
    if (gapTake > 0 || take > 0) patches.push({ id: r.id, gap_before: half(g - gapTake), weeks: half((Number(r.weeks) || 0) - take) })
  }
  return patches
}

/** Applies patches to a copy of the rows, for a preview before saving. */
export function applyPatches(rows: CurriculumPacing[], patches: RowPatch[]): CurriculumPacing[] {
  return rows.map(r => { const p = patches.find(x => x.id === r.id); return p ? { ...r, weeks: p.weeks ?? r.weeks, gap_before: p.gap_before ?? r.gap_before } : r })
}

export interface Deviation { unit: CurriculumUnit; kind: 'later' | 'earlier' | 'longer' | 'shorter' | 'dropped' | 'added'; by: number; text: string }

/** How a teacher's plan differs from the master, unit by unit. */
export function deviations(master: CurriculumPacing[], teacher: CurriculumPacing[], units: CurriculumUnit[]): Deviation[] {
  const m = layoutPacing(master, units), t = layoutPacing(teacher, units)
  const out: Deviation[] = []
  const wk = (n: number) => `${half(n)} wk`
  for (const tb of t) {
    const mb = m.find(x => x.unit.id === tb.unit.id)
    if (!mb) { out.push({ unit: tb.unit, kind: 'added', by: 0, text: `${tb.unit.title}: added` }); continue }
    const shift = half(tb.start - mb.start)
    if (Math.abs(shift) >= 0.5) out.push({ unit: tb.unit, kind: shift > 0 ? 'later' : 'earlier', by: Math.abs(shift), text: `${tb.unit.title}: ${wk(Math.abs(shift))} ${shift > 0 ? 'later' : 'earlier'}` })
    const dw = half(tb.pacing.weeks - mb.pacing.weeks)
    if (Math.abs(dw) >= 0.5) out.push({ unit: tb.unit, kind: dw > 0 ? 'longer' : 'shorter', by: Math.abs(dw), text: `${tb.unit.title}: ${wk(Math.abs(dw))} ${dw > 0 ? 'longer' : 'shorter'}` })
  }
  for (const mb of m) if (!t.some(x => x.unit.id === mb.unit.id)) out.push({ unit: mb.unit, kind: 'dropped', by: 0, text: `${mb.unit.title}: dropped` })
  return out
}

/** A short fingerprint of a plan, so a review can tell whether it changed since it was seen. */
export const planSignature = (rows: CurriculumPacing[]) => [...rows].sort((a, b) => a.sort_order - b.sort_order).map(r => `${r.unit_id.slice(0, 8)}:${r.sort_order}:${r.weeks}:${r.gap_before || 0}`).join('|')

/** Blocks for one half of a class and grade's year, as bars in view weeks. */
export function blockBars(blocks: CurriculumBlock[], cls: string, grade: number, year: string, view: Half, teacherId: string | null, n: number): (CurriculumBlock & { viewStart: number; viewEnd: number })[] {
  return blocks
    .filter(b => b.english_class === cls && b.grade === grade && b.academic_year === year && b.term === view && (!teacherId || b.teacher_id === teacherId))
    .map(b => ({ ...b, viewStart: Math.max(1, Number(b.start_week)), viewEnd: Math.min(n, Number(b.start_week) + Math.max(0.5, Number(b.weeks)) - 1) }))
    .filter(b => b.viewEnd >= b.viewStart)
}

/** The lag in weeks between a pin and today: positive when the class is behind where it said it was. */
export const lagWeeks = (pin: { week: number; set_at: string }, todayPos: number | null, weeks: Week[]) => {
  if (todayPos === null) return 0
  const setDay = pin.set_at.slice(0, 10)
  const setPos = todayPosition(weeks, setDay)
  return setPos === null ? 0 : half(todayPos - setPos)
}

// ─── Anthologies: a reading list, not a pacing ───────────────────

const halfDown = (n: number) => Math.max(0.5, Math.floor(n * 2 + 1e-9) / 2)
const halfUp = (n: number) => Math.max(0.5, Math.round(n * 2) / 2)

/**
 * Shares the term across the stories: every row without a fixed length gets an
 * equal share of what is left after the fixed ones and the gaps, in half weeks.
 * Returns copies of the rows with `weeks` filled in; nothing is written.
 */
export function projectAnthology(rows: CurriculumPacing[], length: number): CurriculumPacing[] {
  if (!rows.length) return rows
  const fixed = rows.filter(r => r.fixed)
  const free = rows.filter(r => !r.fixed)
  const used = fixed.reduce((a, r) => a + (Number(r.weeks) || 0), 0) + rows.reduce((a, r) => a + Math.max(0, Number(r.gap_before) || 0), 0)
  const share = free.length ? halfDown((Math.max(length, 0) - used) / free.length) : 0
  return rows.map(r => r.fixed ? r : { ...r, weeks: length > 0 ? share : halfUp(Number(r.weeks) || 2) })
}

/** Sets every row's weeks so the total is the term: the same share for all, in half weeks, last row taking the remainder. */
export function fitToTerm(rows: CurriculumPacing[], length: number): RowPatch[] {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  if (!sorted.length || length <= 0) return []
  const gaps = sorted.reduce((a, r) => a + Math.max(0, Number(r.gap_before) || 0), 0)
  const share = halfDown((length - gaps) / sorted.length)
  const patches = sorted.map(r => ({ id: r.id, weeks: share }))
  const last = patches[patches.length - 1]
  last.weeks = halfUp(length - gaps - share * (sorted.length - 1))
  return patches
}

export interface Progress { done: number; total: number; expected: number; diff: number; text: string }

/**
 * Where a reading list stands: stories done against the number even pace would
 * have reached by today. `pos` is today in placement weeks (null outside the term).
 */
export function anthologyProgress(rows: CurriculumPacing[], length: number, pos: number | null): Progress {
  const total = rows.length
  const done = rows.filter(r => !!r.done_at).length
  const expected = pos === null || !length || !total ? 0 : Math.min(total, Math.floor((pos - 1) / length * total + 0.5))
  const diff = done - expected
  let text = `${done} of ${total} done`
  if (pos !== null && length && total) text += diff === 0 ? ' · on pace' : diff > 0 ? ` · ${diff} ${diff === 1 ? 'story' : 'stories'} ahead` : ` · ${-diff} ${-diff === 1 ? 'story' : 'stories'} behind`
  return { done, total, expected, diff, text }
}

/** Stories grouped by the module in their title badge ("M3 W1 · …" → "M3"), in book order. */
export function groupByModule<T extends { title: string; sort_order: number }>(units: T[]): { key: string; label: string; units: T[] }[] {
  const out: { key: string; label: string; units: T[] }[] = []
  for (const u of [...units].sort((a, b) => a.sort_order - b.sort_order)) {
    const m = u.title.match(/^(M\d+)\b/i)
    const key = m ? m[1].toUpperCase() : 'other'
    let g = out.find(x => x.key === key)
    if (!g) { g = { key, label: m ? `Module ${m[1].slice(1)}` : 'Other', units: [] }; out.push(g) }
    g.units.push(u)
  }
  return out
}
