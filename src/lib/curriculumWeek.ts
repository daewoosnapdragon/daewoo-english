import { addDays, type Bar, type Week } from '@/lib/curriculumPacing'
import { splitUnitTitle, type CurriculumLesson, type CurriculumUnit } from '@/lib/curriculumCore'

// ─── The week inside the board ───────────────────────────────────
// Zooming the board into one week: which units are running that week,
// their lessons as chips, and the five days' plans from the Lesson Plans
// page (parent_calendar rows, one per date, with a JSON content of subject
// rows, an objective and notes). Importing a lesson copies its words into
// the day and leaves a log row so the app still knows which lesson it was.
// The pure parts are here so they can be tested.

export interface DayContent { subjects: { label: string; content: string; unit_id?: string; lesson_id?: string; placement_id?: string }[]; objective: string; notes: string }
export const emptyDay = (): DayContent => ({ subjects: [], objective: '', notes: '' })

/** Reads a parent_calendar content value, string or object, into a DayContent; anything odd becomes an empty day. */
export function readDay(raw: unknown): DayContent {
  try {
    const c: any = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!c || typeof c !== 'object') return emptyDay()
    // Rows linked to a board unit keep their links (see lessonSync.ts), so saving a day here never drops them.
    const subjects = Array.isArray(c.subjects) ? c.subjects.filter((s: any) => s && typeof s === 'object').map((s: any) => {
      const row: DayContent['subjects'][number] = { label: String(s.label || ''), content: String(s.content || '') }
      for (const k of ['unit_id', 'lesson_id', 'placement_id'] as const) if (typeof s[k] === 'string' && s[k]) row[k] = s[k]
      return row
    }) : []
    return { subjects, objective: String(c.objective || ''), notes: String(c.notes || '') }
  } catch { return emptyDay() }
}

export interface LogRow { id: string; lesson_id: string; unit_id: string; english_class: string; grade: number; date: string; teacher_id: string | null; done: boolean; done_at: string | null; created_at: string }

/** The bars (units) that cover a given week of the view, in row order. */
export function unitsInWeek<T extends { viewStart: number; viewEnd: number }>(bars: T[], weekN: number): T[] {
  // A bar covers (viewStart − 1, viewEnd] and the week (weekN − 1, weekN]; they meet when they overlap.
  return bars.filter(b => b.viewStart - 1 < weekN - 1e-6 && b.viewEnd > weekN - 1 + 1e-6)
}

/** The five school days of a week, Monday to Friday, as date keys. */
export const weekDays = (w: Week) => [0, 1, 2, 3, 4].map(i => addDays(w.monday, i))

/** "Students will identify…" → "identify…": the printed plan already puts "Students will" in front. */
export const bareObjective = (text: string) => (text || '').trim().replace(/^students will\s+/i, '')

/** How a board lesson reads in a day's subject row: "Interrupting Chicken — Predict". The subject label (the book) comes before it. */
export const lessonLine = (unitTitle: string, lessonTitle: string) => `${splitUnitTitle(unitTitle).name} — ${lessonTitle}`

const objectiveParts = (text: string) => (text || '').split(/\n|;\s+/).map(x => x.trim()).filter(Boolean)

/**
 * Copies a lesson into a day: a subject row labelled with the book's subject
 * (the series name, which is what the Lesson Plans page lists) reading
 * "Unit — lesson" and linked to the unit and lesson, the lesson's objective
 * added to the day's "students will" line (without its own "Students will",
 * joined with "; "), and its notes added to the day's notes. Nothing already
 * there is removed; an empty placeholder subject row is replaced.
 */
export function importIntoDay(day: DayContent, lesson: Pick<CurriculumLesson, 'title' | 'objective' | 'notes'> & { id?: string }, subject: string, unit?: Pick<CurriculumUnit, 'title'> & { id?: string }): DayContent {
  const subjects = day.subjects.filter(s => s.label.trim() || s.content.trim())
  const content = unit ? lessonLine(unit.title, lesson.title) : lesson.title
  if (!subjects.some(s => s.label === subject && s.content === content)) subjects.push({ label: subject, content, ...(unit?.id ? { unit_id: unit.id } : {}), ...(lesson.id ? { lesson_id: lesson.id } : {}) })
  const obj = bareObjective(lesson.objective)
  const objective = !obj || objectiveParts(day.objective).some(x => bareObjective(x).toLowerCase() === obj.toLowerCase()) ? day.objective : (day.objective.trim() ? `${day.objective.trim().replace(/[.;\s]+$/, '')}; ${obj}` : obj)
  const joinNote = (a: string, b: string) => a.trim() ? (a.includes(b.trim()) ? a : `${a.trim()}\n${b.trim()}`) : b.trim()
  return { subjects, objective, notes: lesson.notes.trim() ? joinNote(day.notes, lesson.notes) : day.notes }
}

/** Takes a lesson out of a day again: its subject row, and its objective and notes lines. The log row goes separately. */
export function removeFromDay(day: DayContent, lesson: Pick<CurriculumLesson, 'title' | 'objective' | 'notes'>, subject: string, unit?: Pick<CurriculumUnit, 'title'>): DayContent {
  const content = unit ? lessonLine(unit.title, lesson.title) : lesson.title
  const legacy = unit ? `${lesson.title} (${unit.title})` : lesson.title   // rows imported before Nov 2026
  const obj = bareObjective(lesson.objective).toLowerCase()
  const objective = obj ? objectiveParts(day.objective).filter(x => bareObjective(x).toLowerCase() !== obj).join('; ') : day.objective
  const dropNote = (text: string, line: string) => line.trim() ? text.split('\n').filter(l => l.trim() !== line.trim()).join('\n') : text
  return { subjects: day.subjects.filter(s => !(s.label === subject && (s.content === content || s.content === legacy))), objective, notes: dropNote(day.notes, lesson.notes) }
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
