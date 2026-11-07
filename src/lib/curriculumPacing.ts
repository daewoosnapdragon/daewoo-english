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
export interface CurriculumPacing { id: string; placement_id: string; unit_id: string; sort_order: number; weeks: number; owner: 'master' | 'teacher'; created_at: string; updated_at: string }

export const isPlacementsMissing = (message: string | undefined | null) => !!message && /curriculum_placements|curriculum_pacing/.test(message)

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
    out.push({ pacing: p, unit, start: cursor + 1, end: cursor + w })
    cursor += w
  }
  return out
}

export const totalWeeks = (pacing: CurriculumPacing[]) => pacing.reduce((a, p) => a + (Number(p.weeks) || 0), 0)

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
): Lane[] {
  const lanes = new Map<Strand, Lane>()
  for (const pl of placements) {
    const book = books.find(b => b.id === pl.book_id)
    if (!book) continue
    const se = series.find(s => s.id === book.series_id)
    const strand: Strand = se?.strand || 'other'
    const bars = barsForView(layoutPacing(pacing.filter(p => p.placement_id === pl.id), units), pl.term, view, yw)
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
