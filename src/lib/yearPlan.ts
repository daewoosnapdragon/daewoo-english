import type { CurriculumBook } from '@/lib/curriculumCore'

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
