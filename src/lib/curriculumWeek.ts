import { addDays, type Bar, type Week } from '@/lib/curriculumPacing'
import type { CurriculumLesson, CurriculumUnit } from '@/lib/curriculumCore'

// ─── The week inside the board ───────────────────────────────────
// Zooming the board into one week: which units are running that week,
// their lessons as chips, and the five days' plans from the Lesson Plans
// page (parent_calendar rows, one per date, with a JSON content of subject
// rows, an objective and notes). Importing a lesson copies its words into
// the day and leaves a log row so the app still knows which lesson it was.
// The pure parts are here so they can be tested.

export interface DayContent { subjects: { label: string; content: string }[]; objective: string; notes: string }
export const emptyDay = (): DayContent => ({ subjects: [], objective: '', notes: '' })

/** Reads a parent_calendar content value, string or object, into a DayContent; anything odd becomes an empty day. */
export function readDay(raw: unknown): DayContent {
  try {
    const c: any = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!c || typeof c !== 'object') return emptyDay()
    const subjects = Array.isArray(c.subjects) ? c.subjects.filter((s: any) => s && typeof s === 'object').map((s: any) => ({ label: String(s.label || ''), content: String(s.content || '') })) : []
    return { subjects, objective: String(c.objective || ''), notes: String(c.notes || '') }
  } catch { return emptyDay() }
}

export interface LogRow { id: string; lesson_id: string; unit_id: string; english_class: string; grade: number; date: string; teacher_id: string | null; done: boolean; done_at: string | null; created_at: string }

/** The bars (units) that cover a given week of the view, in row order. */
export function unitsInWeek<T extends { viewStart: number; viewEnd: number }>(bars: T[], weekN: number): T[] {
  return bars.filter(b => b.viewStart <= weekN + 0.999 && b.viewEnd >= weekN - 0.001)
}

/** The five school days of a week, Monday to Friday, as date keys. */
export const weekDays = (w: Week) => [0, 1, 2, 3, 4].map(i => addDays(w.monday, i))

/**
 * Copies a lesson into a day: a subject row labelled with the book's subject
 * (the series name, which is what the Lesson Plans page lists), the lesson's
 * title as its content, the "students will" line added to the day's
 * objective, and the notes added to the day's notes. Nothing already there
 * is removed; an empty placeholder subject row is replaced.
 */
export function importIntoDay(day: DayContent, lesson: Pick<CurriculumLesson, 'title' | 'objective' | 'notes'>, subject: string, unit?: Pick<CurriculumUnit, 'title'>): DayContent {
  const subjects = day.subjects.filter(s => s.label.trim() || s.content.trim())
  const content = unit ? `${lesson.title} (${unit.title})` : lesson.title
  if (!subjects.some(s => s.label === subject && s.content === content)) subjects.push({ label: subject, content })
  const join = (a: string, b: string) => a.trim() ? (a.includes(b.trim()) ? a : `${a.trim()}\n${b.trim()}`) : b.trim()
  return {
    subjects,
    objective: lesson.objective.trim() ? join(day.objective, lesson.objective) : day.objective,
    notes: lesson.notes.trim() ? join(day.notes, lesson.notes) : day.notes,
  }
}

/** Takes a lesson out of a day again: its subject row, and its objective and notes lines. The log row goes separately. */
export function removeFromDay(day: DayContent, lesson: Pick<CurriculumLesson, 'title' | 'objective' | 'notes'>, subject: string, unit?: Pick<CurriculumUnit, 'title'>): DayContent {
  const content = unit ? `${lesson.title} (${unit.title})` : lesson.title
  const drop = (text: string, line: string) => line.trim() ? text.split('\n').filter(l => l.trim() !== line.trim()).join('\n') : text
  return { subjects: day.subjects.filter(s => !(s.label === subject && s.content === content)), objective: drop(day.objective, lesson.objective), notes: drop(day.notes, lesson.notes) }
}

export interface Coverage { code: string; taught: number; planned: number }

/** Per CCSS code: how many lessons with that code were marked done, and how many are imported but not yet done. */
export function coverage(logs: LogRow[], lessons: CurriculumLesson[]): Coverage[] {
  const m = new Map<string, Coverage>()
  const byId = new Map(lessons.map(l => [l.id, l]))
  for (const row of logs) {
    const l = byId.get(row.lesson_id)
    if (!l) continue
    for (const code of l.ccss_codes) {
      if (!m.has(code)) m.set(code, { code, taught: 0, planned: 0 })
      const c = m.get(code)!
      if (row.done) c.taught += 1; else c.planned += 1
    }
  }
  return Array.from(m.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}
