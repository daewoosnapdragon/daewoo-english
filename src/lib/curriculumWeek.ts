import { addDays, type Week } from '@/lib/curriculumPacing'

// ─── One week of a plan ──────────────────────────────────────────
// Small helpers for a week of a class's plan: which units run in it, its
// school days, and an objective without the "Students will" the printed
// plan already puts in front.

/** The bars (units) that cover a given week of the view, in row order. */
export function unitsInWeek<T extends { viewStart: number; viewEnd: number }>(bars: T[], weekN: number): T[] {
  // A bar covers (viewStart − 1, viewEnd] and the week (weekN − 1, weekN]; they meet when they overlap.
  return bars.filter(b => b.viewStart - 1 < weekN - 1e-6 && b.viewEnd > weekN - 1 + 1e-6)
}

/** The five school days of a week, Monday to Friday, as date keys. */
export const weekDays = (w: Week) => [0, 1, 2, 3, 4].map(i => addDays(w.monday, i))

/** "Students will identify…" → "identify…": the printed plan already puts "Students will" in front. */
export const bareObjective = (text: string) => (text || '').trim().replace(/^students will\s+/i, '')
