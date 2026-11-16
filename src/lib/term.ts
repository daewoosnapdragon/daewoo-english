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
