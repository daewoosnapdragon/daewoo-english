import type { CurriculumBook } from '@/lib/curriculumCore'
import { addDays, mondayOf, termDates, weekList, type CurriculumPlacement, type SemesterLike, type Term, type YearWeeks } from '@/lib/curriculumPacing'

// ─── Year plan: the pure parts of dragging a book on the timeline ──────────
// Drag a book's end and its units share the new length evenly; drag the line
// between two units and one gets what the other loses. Weeks move in halves
// and no unit goes below half a week, as setPacingWeeks stores them. The
// pointer is read in columns of the year view; holiday columns are not
// teaching weeks, so they are skipped. See YearPlanView.tsx.

const half = (n: number) => Math.round(n * 2) / 2

/** `total` weeks shared evenly over `k` units in half weeks: everyone gets the same, the half weeks left over go to units spread down the list. */
export function spreadEvenly(total: number, k: number): number[] {
  if (k <= 0) return []
  const halves = Math.max(k, Math.round(Math.max(0, total) * 2))
  const base = Math.floor(halves / k), extra = halves - base * k
  return Array.from({ length: k }, (_, i) => (base + (Math.floor((i + 1) * extra / k) > Math.floor(i * extra / k) ? 1 : 0)) / 2)
}

/** Moves the line between unit `k` and unit `k + 1` by `delta` weeks; neither unit goes below half a week. */
export function moveBoundary(weeks: number[], k: number, delta: number): number[] {
  if (k < 0 || k + 1 >= weeks.length) return weeks.slice()
  const d = Math.max(0.5 - weeks[k], Math.min(half(delta), weeks[k + 1] - 0.5))
  const out = weeks.slice()
  out[k] = weeks[k] + d
  out[k + 1] = weeks[k + 1] - d
  return out
}

/** A position across the view's columns (0 is the left edge of column 1) as teaching weeks gone by: holiday columns count for nothing. */
export function teachingAtColumn(pos: number, holidays: Set<number>, n: number): number {
  const p = Math.min(Math.max(0, pos), n)
  const whole = Math.floor(p + 1e-9)
  let t = 0
  for (let c = 1; c <= whole; c++) if (!holidays.has(c)) t += 1
  if (whole < n && !holidays.has(whole + 1)) t += p - whole
  return t
}

/** The column (1-based) that teaching week `t` ends in, holiday columns skipped. Past the view's last teaching week it counts on past the last column. */
export function columnOfTeaching(t: number, holidays: Set<number>, n: number): number {
  const cols: number[] = []
  for (let c = 1; c <= n; c++) if (!holidays.has(c)) cols.push(c)
  const k = Math.max(1, Math.ceil(t - 1e-9))
  if (!cols.length) return k
  return k <= cols.length ? cols[k - 1] : n + (k - cols.length)
}

/** The rows (in sort order) whose weeks differ from `weeks`, as patches for patchMasterRows. */
export function changedWeeks(rows: { id: string; sort_order: number; weeks: number }[], weeks: number[]): { id: string; weeks: number }[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order)
    .map((r, i) => ({ id: r.id, before: Number(r.weeks), weeks: weeks[i] }))
    .filter(r => r.weeks !== undefined && Math.abs(r.weeks - r.before) > 1e-9)
    .map(({ id, weeks }) => ({ id, weeks }))
}

/** The next level in the same series (by level number, retired books skipped), or nothing after the last. */
export function nextBook(book: CurriculumBook, books: CurriculumBook[]): CurriculumBook | undefined {
  const same = books.filter(b => b.series_id === book.series_id && (b.status !== 'retired' || b.id === book.id))
    .sort((a, b) => a.level_number.localeCompare(b.level_number, undefined, { numeric: true }))
  const i = same.findIndex(b => b.id === book.id)
  return i >= 0 ? same.slice(i + 1).find(b => b.status !== 'retired') : undefined
}

// ─── Meeting mode ───────────────────────────────────────────────
// Classes move up a grade in March: this year's Daisy G3 is last year's
// Daisy G2, and new G1s arrive. The plan follows the class, not students.

const TERM_ORDER: Term[] = ['spring', 'year', 'fall']

/** Last year's books for a class: the grade below for G2 to G5, last year's G1 for G1; spring, then year, then fall. */
export function lastYearFor(placements: CurriculumPlacement[], cls: string, grade: number, prevYear: string, inStrand: (pl: CurriculumPlacement) => boolean): { grade: number; placements: CurriculumPlacement[] } {
  const g = grade > 1 ? grade - 1 : 1
  if (!prevYear) return { grade: g, placements: [] }
  const out = placements.filter(p => p.is_master && p.english_class === cls && p.grade === g && p.academic_year === prevYear && inStrand(p))
    .sort((a, b) => TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term))
  return { grade: g, placements: out }
}

/** What to offer: for a new G1 the book last year's G1 used, else the next level after the latest of last year's books (fall, then year, then spring). */
export function suggestBook(grade: number, last: CurriculumPlacement[], books: CurriculumBook[]): CurriculumBook | undefined {
  const latest = [...last].sort((a, b) => TERM_ORDER.indexOf(b.term) - TERM_ORDER.indexOf(a.term))[0]
  const book = latest ? books.find(b => b.id === latest.book_id) : undefined
  if (!book) return undefined
  return grade === 1 ? book : nextBook(book, books)
}

const SPRING_WEEKS = 20, FALL_WEEKS = 18
/** The nth Monday of a month (month 1-12). */
const nthMonday = (year: number, month: number, n: number) => addDays(mondayOf(`${year}-${String(month).padStart(2, '0')}-07`), 7 * (n - 1))

/** A year's weeks from Settings; a half with no dates is assumed: spring from the first Monday of March for 20 weeks, fall from the fourth Monday of August for 18. */
export function fillYearWeeks(semesters: SemesterLike[], year: string): { yw: YearWeeks; assumed: { spring: boolean; fall: boolean } } {
  const s = termDates(semesters, year, 'spring'), f = termDates(semesters, year, 'fall')
  const cal = Number((s.start || f.start || year).slice(0, 4)) || new Date().getFullYear()
  const springReal = !!(s.start && s.end), fallReal = !!(f.start && f.end)
  const spring = springReal ? weekList(s.start!, s.end!) : weekList(nthMonday(cal, 3, 1), addDays(nthMonday(cal, 3, 1), 7 * (SPRING_WEEKS - 1) + 4))
  const fall = fallReal ? weekList(f.start!, f.end!) : weekList(nthMonday(cal, 8, 4), addDays(nthMonday(cal, 8, 4), 7 * (FALL_WEEKS - 1) + 4))
  return { yw: { spring, fall }, assumed: { spring: !springReal, fall: !fallReal } }
}

const PERIOD_LABEL: Record<string, string> = { spring_mid: 'Spring midterm', spring_final: 'Spring final', fall_mid: 'Fall midterm', fall_final: 'Fall final' }
/** The level tests: the end date of each grading period of the year, in date order. */
export function levelTestDates(semesters: SemesterLike[], year: string): { label: string; date: string }[] {
  return semesters.filter(x => x.academic_year === year && PERIOD_LABEL[x.type] && x.end_date)
    .map(x => ({ label: PERIOD_LABEL[x.type], date: x.end_date as string }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Stories grouped by module ("M7 W1 · …"), in order: the module named from a summary's "Module 7 · Name,"; a story with no module badge is a group of its own. */
export function moduleGroups(items: { title: string; summary: string }[]): { key: string; label: string; from: number; to: number }[] {
  const out: { key: string; label: string; from: number; to: number }[] = []
  items.forEach((it, i) => {
    const m = it.title.match(/^M(\d+)\b/i)
    const key = m ? 'M' + m[1] : it.title
    const last = out[out.length - 1]
    if (m && last && last.key === key) { last.to = i } else out.push({ key, label: key, from: i, to: i })
    if (m) {
      const g = out[out.length - 1]
      const named = (it.summary || '').match(new RegExp(`Module ${m[1]}\\s*·\\s*([^,]+),`))
      if (named && g.label === key) g.label = `${key} · ${named[1].trim()}`
    }
  })
  return out
}

/** Which unit a book is in `t` weeks after it starts: its index, null before it starts, 'done' after its last unit. */
export function unitAt(weeks: number[], t: number): number | 'done' | null {
  if (t <= 0) return null
  let end = 0
  for (let i = 0; i < weeks.length; i++) { end += weeks[i]; if (t <= end + 1e-9) return i }
  return 'done'
}
