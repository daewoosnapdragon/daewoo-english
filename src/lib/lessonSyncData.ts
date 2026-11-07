import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import { logActivity } from '@/lib/activity'
import { linkedDays, readPlanDay, type LinkedDay, type PlanDay } from '@/lib/lessonSync'

// ─── Lesson plans and the board: reads and writes ────────────────
// Day plans are parent_calendar rows keyed by date, class and grade, the way
// the Lesson Plans page stores them. The board reads the linked rows; Push
// and Pull rewrite a run of days.

/** Every day's plan for a class and grade between two dates, links kept. */
export async function fetchPlanDays(cls: string, grade: number, from: string, to: string): Promise<{ days: Record<string, PlanDay>; error: string | null }> {
  const days: Record<string, PlanDay> = {}
  const { data, error } = await fetchAll<{ date: string; content: unknown }>((f, t) => supabase.from('parent_calendar').select('date, content').eq('english_class', cls).eq('grade', grade).gte('date', from).lte('date', to).order('date').range(f, t))
  for (const r of data) days[r.date] = readPlanDay(r.content)
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

/**
 * Days a Push or Pull must not move plans onto or off: midterm and testing
 * days shown on the parent calendar for this grade (the same rule that tints
 * them on the Lesson Plans page), one date per day an event covers.
 */
export async function fetchFixedDays(from: string, to: string, grade: number): Promise<Set<string>> {
  const out = new Set<string>()
  const { data } = await supabase.from('calendar_events').select('date, end_date, type, target_grades, show_on_parent_calendar').in('type', ['midterm', 'testing']).lte('date', to)
  for (const ev of (data || []) as { date: string; end_date: string | null; target_grades: number[] | null; show_on_parent_calendar: boolean | null }[]) {
    if (!ev.show_on_parent_calendar) continue
    if (ev.target_grades && ev.target_grades.length && !ev.target_grades.includes(grade)) continue
    const end = ev.end_date && ev.end_date > ev.date ? ev.end_date : ev.date
    for (let d = ev.date; d <= end; d = nextDay(d)) if (d >= from && d <= to) out.add(d)
  }
  return out
}
const nextDay = (d: string) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10) }
