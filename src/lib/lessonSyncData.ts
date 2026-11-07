import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { linkedDays, readPlanDay, type LinkedDay, type PlanDay } from '@/lib/lessonSync'

// ─── Lesson plans and the board: reads and writes ────────────────
// Day plans are parent_calendar rows keyed by date, class and grade, the way
// the Lesson Plans page stores them. The board reads the linked rows; Push
// and Pull rewrite a run of days.

/** Every day's plan for a class and grade between two dates, links kept. */
export async function fetchPlanDays(cls: string, grade: number, from: string, to: string): Promise<{ days: Record<string, PlanDay>; error: string | null }> {
  const days: Record<string, PlanDay> = {}
  // Supabase returns at most 1000 rows a request; a term of one class and grade is far fewer.
  const { data, error } = await supabase.from('parent_calendar').select('date, content').eq('english_class', cls).eq('grade', grade).gte('date', from).lte('date', to).order('date').limit(1000)
  for (const r of (data || []) as { date: string; content: unknown }[]) days[r.date] = readPlanDay(r.content)
  return { days, error: error?.message || null }
}

export async function fetchLinked(cls: string, grade: number, from: string, to: string): Promise<LinkedDay[]> {
  return linkedDays((await fetchPlanDays(cls, grade, from, to)).days)
}

/** Writes changed days back; an emptied day is saved empty so it stays cleared. */
export async function saveDays(cls: string, grade: number, changes: Record<string, PlanDay>, teacherId: string | null, what: string): Promise<string | null> {
  const rows = Object.entries(changes).map(([date, content]) => ({ date, english_class: cls, grade, content: JSON.stringify(content), updated_by: teacherId, updated_at: new Date().toISOString() }))
  if (!rows.length) return null
  const { error } = await supabase.from('parent_calendar').upsert(rows, { onConflict: 'date,english_class,grade' })
  if (!error) logActivity('edited', `Lesson plans · ${cls} · Grade ${grade}: ${what}`, { key: `lessons|${cls}|${grade}`, path: '/lesson-plans' })
  return error?.message || null
}
