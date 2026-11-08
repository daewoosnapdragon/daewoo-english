import { colorHex, splitUnitTitle, type CurriculumBook, type CurriculumSeries, type CurriculumUnit, type Strand } from '@/lib/curriculumCore'

// ─── Placements and pacing ───────────────────────────────────────
// A placement is a book in a class and grade for a term; pacing is the order
// and weeks of its units. See supabase/migration-curriculum-placements.sql.
// One plan per book for a class and grade, kept by admin: the units in
// order, each with a suggested length in weeks (see
// supabase/migration-curriculum-class-plans.sql). The pure parts are here:
// which weeks a term has (from the grading periods in the semesters
// table), where each unit lands when its weeks are added up, which weeks
// are holidays and where today is. The pages call them.

export type Term = 'fall' | 'spring' | 'year'
export type Half = 'fall' | 'spring'
// The school year starts in March: spring is the first half, fall the second, and a whole-year book carries across the summer break.
export const TERM_LABEL: Record<Term, { en: string; ko: string }> = { spring: { en: 'Spring', ko: '봄 학기' }, fall: { en: 'Fall', ko: '가을 학기' }, year: { en: 'Whole year', ko: '한 해' } }
export const HALVES: Half[] = ['spring', 'fall']
/** What the board shows: one half, or the whole year with the summer between. */
export type View = Half | 'year'
export const VIEWS: View[] = ['spring', 'fall', 'year']
export const TERMS: Term[] = ['year', 'spring', 'fall']

export interface CurriculumPlacement {
  id: string; book_id: string; english_class: string; grade: number; academic_year: string; term: Term; is_master: boolean
  /** "Finish by": optional. */
  aim_date?: string | null
  created_by: string | null; created_at: string; updated_at: string
}
/** One unit of a book's plan for a class and grade: its place in the order and its suggested length. */
export interface CurriculumPacing {
  id: string; placement_id: string; unit_id: string; sort_order: number; weeks: number; owner: 'master' | 'teacher'
  created_at: string; updated_at: string
}
/** A unit a class has finished (see curriculum_unit_done). */
export interface UnitDone { id: string; placement_id: string; unit_id: string; done_at: string; done_by: string | null }

export const isPlacementsMissing = (message: string | undefined | null) => !!message && /curriculum_placements|curriculum_pacing/.test(message)

// ─── Dates and weeks ─────────────────────────────────────────────

/** What the helpers need from a semesters row. */
export type SemesterLike = { academic_year: string; type: string; start_date: string | null; end_date: string | null }

export const addDays = (key: string, n: number) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
/** The Monday of the week a date is in. */
export const mondayOf = (key: string) => { const wd = new Date(key + 'T12:00:00Z').getUTCDay(); return addDays(key, wd === 0 ? -6 : 1 - wd) }

export interface Week { n: number; monday: string; friday: string; half?: Half }

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

/**
 * The academic year whose terms overlap the dates from `from` to `to` (one day
 * when `to` is left out). With `latest`, a date outside every term (the summer
 * gap) gets the latest year already started, else the newest year; without it, ''.
 */
export function yearFor(semesters: SemesterLike[], from: string, to = from, latest = false): string {
  const years = academicYears(semesters)
  const hit = years.find(y => HALVES.some(h => { const t = termDates(semesters, y, h); return !!t.start && !!t.end && to >= t.start && from <= t.end }))
  if (hit || !latest) return hit || ''
  return years.find(y => HALVES.some(h => { const t = termDates(semesters, y, h); return !!t.start && t.start <= to })) || years[0] || ''
}

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
  if (s.start && s.end && date >= s.start && date <= s.end) return 'spring'
  if (f.start && f.end && date >= f.start && date <= f.end) return 'fall'
  if (f.start && date >= f.start) return 'fall'
  return 'spring'
}

export interface YearWeeks { spring: Week[]; fall: Week[] }
export const yearWeeks = (semesters: SemesterLike[], year: string): YearWeeks => {
  const f = termDates(semesters, year, 'fall'), s = termDates(semesters, year, 'spring')
  return { spring: s.start && s.end ? weekList(s.start, s.end) : [], fall: f.start && f.end ? weekList(f.start, f.end) : [] }
}

/** How many weeks a placement has to fill: its term's weeks, or both halves for a year placement. */
/** Holiday weeks per half, which do not count as teaching weeks. */
export interface HolidayCounts { spring: number; fall: number }
const NO_HOLIDAYS: HolidayCounts = { spring: 0, fall: 0 }
/** How many teaching weeks a placement has to fill: its term's weeks less its holiday weeks. */
export const placementLength = (term: Term, yw: YearWeeks, h: HolidayCounts = NO_HOLIDAYS) =>
  term === 'year' ? yw.spring.length + yw.fall.length - h.spring - h.fall : yw[term].length - h[term]
/** Teaching weeks between the start of a year placement and the start of the view: the spring's teaching weeks when looking at the fall. */
export const viewOffset = (term: Term, view: View, yw: YearWeeks, h: HolidayCounts = NO_HOLIDAYS) => term === 'year' && view === 'fall' ? yw.spring.length - h.spring : 0

/** What to add to a placement's teaching week to get the view's teaching week: the spring's teaching weeks for a fall placement in the year view, and minus them for a year placement seen in the fall. barsForView, pins and today all use it. */
export const viewShift = (term: Term, view: View, yw: YearWeeks, h: HolidayCounts = NO_HOLIDAYS) => view === 'year' ? (term === 'fall' ? yw.spring.length - h.spring : 0) : -viewOffset(term, view, yw, h)

/** The weeks a view shows: one half, or spring then fall renumbered 1..N with each week knowing its half. */
export function viewWeeks(yw: YearWeeks, view: View): Week[] {
  if (view !== 'year') return yw[view].map(w => ({ ...w, half: view }))
  const all = [...yw.spring.map(w => ({ ...w, half: 'spring' as Half })), ...yw.fall.map(w => ({ ...w, half: 'fall' as Half }))]
  return all.map((w, i) => ({ ...w, n: i + 1 }))
}

// ─── Where the units land ────────────────────────────────────────

export interface Bar { pacing: CurriculumPacing; unit: CurriculumUnit; start: number; end: number }

/**
 * Adds the weeks up in order: unit 1 runs from week 1, unit 2 starts where it ends, and so on. `start` and `end` are in placement weeks and may be fractional.
 * A bar covers the span (start − 1, end]: a whole unit in week 3 is start 3, end 3; a half-week unit at the start of week 1 is start 1, end 0.5.
 * So `end` can be less than `start` for a half week, and the width is always end − start + 1.
 */
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

export const totalWeeks = (pacing: CurriculumPacing[]) => pacing.reduce((a, p) => a + Math.max(0.5, Number(p.weeks) || 0), 0)

export interface ViewBar extends Bar { viewStart: number; viewEnd: number; cutLeft: boolean; cutRight: boolean }

/**
 * The bars that show on a board for one half of the year. A placement for that
 * half starts at its week 1; a year placement shown in the fall is shifted
 * back by the spring's weeks. Bars outside the view are dropped, bars crossing
 * its edges are cut and say so.
 */
export function barsForView(bars: Bar[], term: Term, view: View, yw: YearWeeks, h: HolidayCounts = NO_HOLIDAYS): ViewBar[] {
  if (view !== 'year' && term !== 'year' && term !== view) return []
  // In teaching weeks of the view: a fall placement seen in the year view starts after the spring's teaching weeks.
  const shift = viewShift(term, view, yw, h)
  const n = view === 'year' ? placementLength('year', yw, h) : yw[view].length - h[view]
  if (n <= 0) return []
  const out: ViewBar[] = []
  for (const b of bars) {
    const s = b.start + shift, e = b.end + shift
    // The bar covers (s − 1, e]; the view covers (0, n].
    if (e <= 0 || s - 1 >= n) continue
    out.push({ ...b, viewStart: Math.max(1, s), viewEnd: Math.min(n, e), cutLeft: s < 1, cutRight: e > n })
  }
  return out
}

/**
 * Teaching weeks to columns: holiday columns are skipped, so a unit that spans
 * a holiday week is drawn across it and ends a column later. `holidays` are
 * column numbers (1..n). Fractions inside a week are kept.
 */
export function teachingToColumns<T extends { viewStart: number; viewEnd: number }>(bars: T[], holidays: Set<number>, n: number): T[] {
  const col: number[] = []                         // col[t] = column of teaching week t (1-based)
  for (let c = 1; c <= n; c++) if (!holidays.has(c)) col.push(c)
  if (!col.length) return bars
  const colOf = (k: number) => col[Math.min(col.length, Math.max(1, k)) - 1]
  // Edges, not weeks: a bar covers (viewStart − 1, viewEnd]. The left edge L
  // sits inside teaching week floor(L)+1, the right edge R inside week ceil(R);
  // each keeps its fraction within its week, so half weeks stay half wide.
  return bars.map(b => {
    const L = b.viewStart - 1, R = b.viewEnd
    const kl = Math.floor(L + 1e-9) + 1, kr = Math.max(1, Math.ceil(R - 1e-9))
    const left = colOf(kl) - 1 + (L - (kl - 1))
    const right = colOf(kr) - (kr - R)
    return { ...b, viewStart: left + 1, viewEnd: Math.max(left + 0.5, right) }
  })
}

/** Holiday columns by half from away days: three or more away days in a week make it a holiday week. */
export function holidayCounts(holidaysSpring: Map<number, string>, holidaysFall: Map<number, string>): HolidayCounts {
  return { spring: holidaysSpring.size, fall: holidaysFall.size }
}

export interface Lane { strand: Strand; label: string; bars: (ViewBar & { placement: CurriculumPlacement; book: CurriculumBook; series: CurriculumSeries | undefined; color: string })[] }

const STRAND_ORDER: Strand[] = ['phonics', 'reading', 'writing', 'speaking', 'grammar', 'other']
const STRAND_EN: Record<Strand, string> = { phonics: 'Phonics', reading: 'Reading', writing: 'Writing', speaking: 'Speaking', grammar: 'Grammar', other: 'Other' }

/** One lane per strand that has a bar, in the fixed strand order: each book's plan, units end to end at their suggested lengths. */
export function boardLanes(
  placements: CurriculumPlacement[], pacing: CurriculumPacing[], units: CurriculumUnit[], books: CurriculumBook[], series: CurriculumSeries[], view: View, yw: YearWeeks,
  h: HolidayCounts = NO_HOLIDAYS,
): Lane[] {
  const lanes = new Map<Strand, Lane>()
  for (const pl of placements) {
    const book = books.find(b => b.id === pl.book_id)
    if (!book) continue
    const se = series.find(s => s.id === book.series_id)
    const strand: Strand = se?.strand || 'other'
    const bars = barsForView(layoutPacing(masterRows(pacing, pl.id), units), pl.term, view, yw, h)
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

// ─── A book's plan ───────────────────────────────────────────────

export const masterRows = (pacing: CurriculumPacing[], placementId: string) => pacing.filter(p => p.placement_id === placementId && p.owner !== 'teacher')

const halfDown = (n: number) => Math.max(0.5, Math.floor(n * 2 + 1e-9) / 2)

/**
 * Whole weeks for `k` rows out of `avail`: everyone gets the same, and the weeks
 * left over go one each to rows spread evenly down the list, so the total is the
 * term. Only when there are more rows than weeks does a row get half a week.
 */
export function shareWeeks(avail: number, k: number): number[] {
  if (k <= 0) return []
  const a = Math.max(0, avail)
  if (a < k) return Array.from({ length: k }, () => halfDown(a / k))
  const whole = Math.floor(a + 1e-9)
  const base = Math.floor(whole / k), extra = whole - base * k
  return Array.from({ length: k }, (_, i) => base + (Math.floor((i + 1) * extra / k) > Math.floor(i * extra / k) ? 1 : 0))
}

/** Lengths that make a plan fill the term exactly, shared as evenly as whole weeks go: for "Fit to the term". */
export function fitToTerm(rows: CurriculumPacing[], length: number): { id: string; weeks: number }[] {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  if (!sorted.length || length <= 0) return []
  const shares = shareWeeks(length, sorted.length)
  return sorted.map((r, i) => ({ id: r.id, weeks: shares[i] }))
}

/** Where an aim date falls, as a teaching week of the placement (holiday weeks before it not counted), or null outside its term. */
export function aimWeek(aim: string | null | undefined, term: Term, yw: YearWeeks, holidays: { spring: Set<number>; fall: Set<number> }): number | null {
  if (!aim) return null
  const halves: Half[] = term === 'year' ? ['spring', 'fall'] : [term]
  let before = 0
  for (const h of halves) {
    const w = yw[h].find(x => aim >= x.monday && aim <= addDays(x.monday, 6))
    if (w) return before + w.n - Array.from(holidays[h]).filter(n => n < w.n).length
    before += yw[h].length - holidays[h].size
  }
  return null
}

/** A column of the view as a teaching week: holiday columns before it are not counted, and a holiday column itself counts as the teaching week after it. */
export function columnToTeaching(col: number, holidays: Set<number>): number {
  const c = Math.round(col)
  return c - Array.from(holidays).filter(h => h < c).length
}

/** The halves of a year that have dates, and so the views worth offering: a half with no weeks is hidden, and Year only shows when both halves have weeks. */
export function viewsFor(yw: YearWeeks): View[] {
  const out: View[] = HALVES.filter(h => yw[h].length > 0)
  if (out.length === 2) out.push('year')
  return out.length ? out : ['fall']
}
/** Which terms a placement can be given in a year: a half with no dates is not offered, nor is Whole year unless both halves have them. */
export const termsFor = (yw: YearWeeks): Term[] => { const v = viewsFor(yw); return TERMS.filter(t => v.includes(t as View)) }


/** Units grouped by the module or section in their title badge ("M3 W1 · …" → Module 3; "Closed Syllables · …" → Closed Syllables), in book order. */
export function groupByModule<T extends { title: string; sort_order: number }>(units: T[]): { key: string; label: string; units: T[] }[] {
  const out: { key: string; label: string; units: T[] }[] = []
  for (const u of [...units].sort((a, b) => a.sort_order - b.sort_order)) {
    const badge = splitUnitTitle(u.title).badge
    const m = badge.match(/^M(\d+)/i)
    // "Unit 4", "Lesson 12" or "School Link 3" is a numbering, not a section: those stay ungrouped.
    const key = m ? 'M' + m[1] : (/^(unit|lesson|school link)\s*\d+/i.test(badge) || !badge ? 'other' : badge)
    let g = out.find(x => x.key === key)
    if (!g) { g = { key, label: m ? `Module ${m[1]}` : (badge || 'Other'), units: [] }; out.push(g) }
    g.units.push(u)
  }
  return out
}
