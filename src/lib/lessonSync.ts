import { addDays } from '@/lib/curriculumPacing'

// ─── Lesson plans: reading days and moving them ──────────────────
// A day's plan is a parent_calendar row; each subject row may carry the
// unit (and lesson) it is about, set when the teacher picks the unit as
// they type (see planLinks.ts). Move a day later / earlier slides a run of
// days a class day when a trip or a sick day takes one. The pure parts are
// here so they can be tested.

export interface SubjectRow { label: string; content: string; unit_id?: string; lesson_id?: string; placement_id?: string }
export interface PlanDay { subjects: SubjectRow[]; objective: string; notes: string }
export interface LinkedDay { date: string; unit_id: string; lesson_id: string | null; placement_id: string | null }

const str = (v: unknown) => typeof v === 'string' && v ? v : undefined

/** A parent_calendar content value as a day, keeping each row's unit and lesson links. */
export function readPlanDay(raw: unknown): PlanDay {
  try {
    const c: any = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!c || typeof c !== 'object') return { subjects: [], objective: '', notes: '' }
    const subjects: SubjectRow[] = Array.isArray(c.subjects) ? c.subjects.filter((s: any) => s && typeof s === 'object').map((s: any) => {
      const row: SubjectRow = { label: String(s.label || ''), content: String(s.content || '') }
      if (str(s.unit_id)) row.unit_id = s.unit_id
      if (str(s.lesson_id)) row.lesson_id = s.lesson_id
      if (str(s.placement_id)) row.placement_id = s.placement_id
      return row
    }) : []
    return { subjects, objective: String(c.objective || ''), notes: String(c.notes || '') }
  } catch { return { subjects: [], objective: '', notes: '' } }
}

export const isEmptyDay = (d: PlanDay | undefined | null) => !d || (!d.objective.trim() && !d.notes.trim() && d.subjects.every(s => !s.content.trim()))

/** Every linked subject row in some days, one entry per row. */
export function linkedDays(days: Record<string, PlanDay>): LinkedDay[] {
  const out: LinkedDay[] = []
  for (const [date, d] of Object.entries(days)) for (const s of d.subjects) if (s.unit_id && s.content.trim()) out.push({ date, unit_id: s.unit_id, lesson_id: s.lesson_id || null, placement_id: s.placement_id || null })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── A week's pattern ────────────────────────────────────────────

/** The weekdays (0 = Monday) each book was on in a week of plans, from its linked rows. */
export function bookPattern(week: (PlanDay | null)[]): Map<string, number[]> {
  const out = new Map<string, number[]>()
  week.forEach((d, day) => { for (const s of d?.subjects || []) if (s.placement_id) { const a = out.get(s.placement_id) || []; if (!a.includes(day)) a.push(day); out.set(s.placement_id, a) } })
  return out
}

// ─── Push and pull ───────────────────────────────────────────────

/**
 * Slides plans along a timeline of class days. `timeline[0]` is the day pushed
 * from (it may be a day off that still holds a plan); the rest are the class
 * days after it. Pushing moves every day's plan one class day later, up to the
 * last planned day, and empties the first. Pulling moves every plan after the
 * first day one class day earlier into it; the first day must be empty.
 * Returns only the days that change, with an empty day where a plan left.
 */
export function pushPlan(timeline: string[], days: Record<string, PlanDay>, dir: 1 | -1): { changes: Record<string, PlanDay>; moved: number; error: string | null } {
  const empty = (): PlanDay => ({ subjects: [], objective: '', notes: '' })
  let last = -1
  timeline.forEach((d, i) => { if (!isEmptyDay(days[d])) last = i })
  const changes: Record<string, PlanDay> = {}
  if (dir === 1) {
    if (last < 0) return { changes, moved: 0, error: 'Nothing planned from this day on.' }
    if (last + 1 >= timeline.length) return { changes, moved: 0, error: 'No class day left to push into.' }
    for (let i = last; i >= 0; i--) changes[timeline[i + 1]] = days[timeline[i]] ? clone(days[timeline[i]]) : empty()
    changes[timeline[0]] = empty()
    const moved = timeline.slice(0, last + 1).filter(d => !isEmptyDay(days[d])).length
    return { changes: real(changes, days), moved, error: null }
  }
  if (!isEmptyDay(days[timeline[0]])) return { changes, moved: 0, error: 'This day has a plan. Pull back into an empty day.' }
  if (last < 1) return { changes, moved: 0, error: 'Nothing planned after this day.' }
  for (let i = 0; i < last; i++) changes[timeline[i]] = days[timeline[i + 1]] ? clone(days[timeline[i + 1]]) : empty()
  changes[timeline[last]] = empty()
  const moved = timeline.slice(1, last + 1).filter(d => !isEmptyDay(days[d])).length
  return { changes: real(changes, days), moved, error: null }
}
/** Drops the days that were empty and stay empty, so no blank rows are written for them. */
const real = (changes: Record<string, PlanDay>, days: Record<string, PlanDay>) => Object.fromEntries(Object.entries(changes).filter(([d, c]) => !(isEmptyDay(c) && isEmptyDay(days[d]))))
const clone = (d: PlanDay): PlanDay => ({ subjects: d.subjects.map(s => ({ ...s })), objective: d.objective, notes: d.notes })

export interface PlanMove { from: string; to: string; summary: string }

/** One line for a day's plan in a preview: its subjects, "Into Reading: Interrupting Chicken — Predict · Writing: Journal". */
export function daySummary(d: PlanDay | undefined | null): string {
  if (!d) return ''
  const rows = d.subjects.filter(s => s.content.trim()).map(s => s.label.trim() ? `${s.label}: ${s.content}` : s.content)
  return rows.length ? rows.join(' · ') : d.objective.trim()
}

/** What a Push or Pull would do, day by day, for a preview: each planned day and the day it moves to. Same timeline rules as pushPlan. */
export function planMoves(timeline: string[], days: Record<string, PlanDay>, dir: 1 | -1): PlanMove[] {
  let last = -1
  timeline.forEach((d, i) => { if (!isEmptyDay(days[d])) last = i })
  const out: PlanMove[] = []
  if (dir === 1) { for (let i = 0; i <= last && i + 1 < timeline.length; i++) if (!isEmptyDay(days[timeline[i]])) out.push({ from: timeline[i], to: timeline[i + 1], summary: daySummary(days[timeline[i]]) }) }
  else { for (let i = 1; i <= last; i++) if (!isEmptyDay(days[timeline[i]])) out.push({ from: timeline[i], to: timeline[i - 1], summary: daySummary(days[timeline[i]]) }) }
  return out
}

/** The class days from `from` (always first, even when it is away) to `to`: weekdays the grade has class that are not away days. */
export function classDays(from: string, to: string, away: Set<string>, noClass: (weekday: number) => boolean): string[] {
  const out = [from]
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
    const wd = new Date(d + 'T12:00:00Z').getUTCDay()
    if (wd === 0 || wd === 6 || noClass(wd) || away.has(d)) continue
    out.push(d)
  }
  return out
}
