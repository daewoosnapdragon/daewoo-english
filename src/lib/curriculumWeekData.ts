import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import { logActivity } from '@/lib/activity'
import type { CurriculumLesson, CurriculumUnit } from '@/lib/curriculumCore'
import { importIntoDay, readDay, removeFromDay, type DayContent, type LogRow } from '@/lib/curriculumWeek'

// ─── The week inside the board: reads and writes ─────────────────
// Day plans are the Lesson Plans page's rows in parent_calendar, one per
// date, keyed by date, class and grade; this module reads and upserts them
// the same way that page does, so what is imported here appears there.
// Every import leaves a row in curriculum_lesson_log; marking a day done
// sets done on that day's rows.

const msg = (e: { message?: string } | null | undefined) => e?.message || null
const PATH = '/curriculum'
export const isLessonLogMissing = (message: string | undefined | null) => !!message && /curriculum_lesson_log/.test(message)

export async function fetchWeek(cls: string, grade: number, dates: string[]): Promise<{ days: Record<string, DayContent>; logs: LogRow[]; error: string | null; logMissing: boolean }> {
  const from = dates[0], to = dates[dates.length - 1]
  const [d, l] = await Promise.all([
    supabase.from('parent_calendar').select('date, content').eq('english_class', cls).eq('grade', grade).gte('date', from).lte('date', to),
    supabase.from('curriculum_lesson_log').select('*').eq('english_class', cls).eq('grade', grade).gte('date', from).lte('date', to),
  ])
  const days: Record<string, DayContent> = {}
  for (const row of (d.data || []) as any[]) days[row.date] = readDay(row.content)
  return { days, logs: (l.data || []) as LogRow[], error: d.error?.message || null, logMissing: isLessonLogMissing(l.error?.message) }
}

/** Every log row for a class and grade, for coverage. */
export async function fetchLogs(cls: string, grade: number): Promise<LogRow[]> {
  const { data } = await fetchAll<LogRow>((f, t) => supabase.from('curriculum_lesson_log').select('*').eq('english_class', cls).eq('grade', grade).order('date').order('id').range(f, t))
  return data
}

async function saveDay(date: string, cls: string, grade: number, content: DayContent, teacherId: string): Promise<string | null> {
  const { error } = await supabase.from('parent_calendar').upsert({ date, english_class: cls, grade, content: JSON.stringify(content), updated_by: teacherId, updated_at: new Date().toISOString() }, { onConflict: 'date,english_class,grade' })
  return msg(error)
}

/** Copies a lesson into a day's plan and logs it. */
export async function importLesson(date: string, cls: string, grade: number, lesson: CurriculumLesson, unit: CurriculumUnit, subject: string, current: DayContent, teacherId: string): Promise<string | null> {
  const next = importIntoDay(current, lesson, subject, unit)
  const e = await saveDay(date, cls, grade, next, teacherId)
  if (e) return e
  const { error } = await supabase.from('curriculum_lesson_log').upsert({ lesson_id: lesson.id, unit_id: unit.id, english_class: cls, grade, date, teacher_id: teacherId }, { onConflict: 'lesson_id,english_class,grade,date', ignoreDuplicates: true })
  if (!error) logActivity('saved', `Lesson into ${date}: ${lesson.title}`, { key: `${cls}|${grade}|${date}`, path: PATH })
  return msg(error)
}

/** Takes a lesson out of a day's plan and removes its log row. */
export async function removeLesson(date: string, cls: string, grade: number, lesson: CurriculumLesson, unit: CurriculumUnit, subject: string, current: DayContent, teacherId: string): Promise<string | null> {
  const e = await saveDay(date, cls, grade, removeFromDay(current, lesson, subject, unit), teacherId)
  if (e) return e
  const { error } = await supabase.from('curriculum_lesson_log').delete().eq('lesson_id', lesson.id).eq('english_class', cls).eq('grade', grade).eq('date', date)
  if (!error) logActivity('edited', `Lesson out of ${date}: ${lesson.title}`, { key: `${cls}|${grade}|${date}`, path: PATH })
  return msg(error)
}

/** Marks every imported lesson on a day done (or not). */
export async function setDayDone(date: string, cls: string, grade: number, done: boolean): Promise<string | null> {
  const { error } = await supabase.from('curriculum_lesson_log').update({ done, done_at: done ? new Date().toISOString() : null }).eq('english_class', cls).eq('grade', grade).eq('date', date)
  if (!error) logActivity('saved', `${done ? 'Day done' : 'Day reopened'}: ${cls} G${grade} ${date}`, { key: `${cls}|${grade}|${date}|done`, path: PATH })
  return msg(error)
}
