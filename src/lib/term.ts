// ─── Where we are in the term ────────────────────────────────────
// For the line under the masthead: which week of the semester today is,
// how far through it we are, and where the report card cutoff falls.
// Holidays are not taken out; the line is solid, as decided.

export interface TermProgress { week: number; weeks: number; frac: number; cutoff: number | null }

const day = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }

export function termProgress(start: string | null | undefined, end: string | null | undefined, today: string, cutoff?: string | null): TermProgress | null {
  if (!start || !end) return null
  const s = day(start), e = day(end) + 864e5, t = day(today) + 864e5 / 2
  if (!(e > s)) return null
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const weeks = Math.max(1, Math.ceil((e - s) / (7 * 864e5)))
  const week = Math.max(1, Math.min(weeks, Math.floor((t - s) / (7 * 864e5)) + 1))
  const c = cutoff ? clamp((day(cutoff) + 864e5 / 2 - s) / (e - s)) : null
  return { week, weeks, frac: clamp((t - s) / (e - s)), cutoff: c }
}

/** The first of each month inside the term, with where it falls on the line (0 to 1). */
export function termMonths(start: string | null | undefined, end: string | null | undefined): { label: string; frac: number }[] {
  if (!start || !end) return []
  const s = day(start), e = day(end) + 864e5
  if (!(e > s)) return []
  const out: { label: string; frac: number }[] = []
  const d = new Date(s)
  let y = d.getUTCFullYear(), m = d.getUTCMonth() + (d.getUTCDate() === 1 ? 0 : 1)
  for (;;) {
    if (m > 11) { m -= 12; y++ }
    const t = Date.UTC(y, m, 1)
    if (t >= e) break
    out.push({ label: new Date(t).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), frac: (t - s) / (e - s) })
    m++
  }
  return out
}

/** Whole days from today to a date (negative once it has passed). */
export function daysUntil(date: string, today: string): number {
  return Math.round((day(date) - day(today)) / 864e5)
}
