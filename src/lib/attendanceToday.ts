import { supabase } from '@/lib/supabase'
import { loadDayStatus } from '@/lib/calendarDays'
import { loadScheduleRules, noClassOn } from '@/lib/scheduleRules'

// ─── Today's attendance, grade by grade ──────────────────────────
// One answer to "is today's attendance done?", shared by the dashboard's
// Attendance today figure and the masthead (the dot on Attendance and the
// afternoon reminder), so the two never disagree. They used to ask the
// database two different ways: the reminder counted rows through a join
// and stayed up after the class was marked while the dashboard said "all
// marked".
//
// A grade only counts on a day it has class: not at the weekend, not on a
// day off or a field trip that applies to it, not on a weekday the schedule
// rules give it no class (Settings → Schedule).

export interface AttendanceDay {
  /** Saturday or Sunday in Korea. */
  weekend: boolean
  /** The day off every grade has today, if there is one. */
  off: string | null
  /** Grades with no class today, and why. */
  away: Record<number, string>
}

export interface GradeUnmarked { grade: number; unmarked: number; total: number }

export async function loadAttendanceDay(date: string, grades: number[]): Promise<AttendanceDay> {
  const weekday = new Date(date + 'T12:00:00').getDay()
  const weekend = weekday === 0 || weekday === 6
  const list = Array.from(new Set(grades)).sort((a, b) => a - b)
  const [school, rules, ...each] = await Promise.all([loadDayStatus(date, null), loadScheduleRules(), ...list.map(g => loadDayStatus(date, g))])
  const away: Record<number, string> = {}
  list.forEach((g, i) => {
    const why = each[i].off || each[i].trip || (noClassOn(rules, g, weekday) ? 'no class' : null)
    if (why) away[g] = why
  })
  // With no students to go by, a day-off event anywhere counts, as before.
  const offs = each.map(s => s.off)
  const off = list.length === 0 ? school.off : offs.every(Boolean) ? offs[0] : null
  return { weekend, off, away }
}

/** The grades still waiting to be marked today, lowest first. Empty when nobody has class. */
export function unmarkedByGrade(students: { id: string; grade: number }[], marked: Set<string>, day: AttendanceDay | null): GradeUnmarked[] {
  if (!day || day.weekend || day.off) return []
  const by: Record<number, GradeUnmarked> = {}
  for (const s of students) {
    if (day.away[s.grade]) continue
    const g = (by[s.grade] ||= { grade: s.grade, unmarked: 0, total: 0 })
    g.total++
    if (!marked.has(s.id)) g.unmarked++
  }
  return Object.values(by).filter(g => g.unmarked > 0).sort((a, b) => a.grade - b.grade)
}

/** Whether any of these students has class today at all. */
export function hasClassToday(students: { grade: number }[], day: AttendanceDay | null): boolean {
  return !!day && !day.weekend && !day.off && students.some(s => !day.away[s.grade])
}

/**
 * The teacher's own students and which of them are marked today, read the
 * same way the dashboard reads them.
 */
export async function loadClassAttendanceToday(englishClass: string, date: string) {
  const { data: studs } = await supabase.from('students').select('id, grade').eq('english_class', englishClass).eq('is_active', true)
  const students = (studs || []) as { id: string; grade: number }[]
  if (students.length === 0) return { students, marked: new Set<string>(), day: null as AttendanceDay | null }
  const [{ data: att }, day] = await Promise.all([
    supabase.from('attendance').select('student_id').eq('date', date).in('student_id', students.map(s => s.id)),
    loadAttendanceDay(date, students.map(s => s.grade)),
  ])
  return { students, marked: new Set(((att || []) as { student_id: string }[]).map(a => a.student_id)), day }
}
