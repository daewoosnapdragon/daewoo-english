import { supabase } from '@/lib/supabase'
import { loadScheduleRules, noClassOn, type ScheduleRules } from '@/lib/scheduleRules'

// ─── What the school calendar says about a day ───────────────────
// A day_off event means no class and a field_trip event means the students
// are away. Either way nobody is in the room, so attendance for the day is
// everyone absent with the event as the reason, filled in automatically the
// first time the day is opened (see fillAwayDays). Both respect the event's
// target grades (none = all).

export interface DayStatus { off: string | null; trip: string | null }

export type CalendarRow = { type: string; title: string; date: string; end_date: string | null; target_grades: number[] | null }

const appliesTo = (e: CalendarRow, grade: number | null | undefined) => {
  if (e.type !== 'day_off' && e.type !== 'field_trip') return false
  const tg = e.target_grades
  return !tg || tg.length === 0 || grade == null || tg.includes(grade)
}

export async function loadDayStatus(date: string, grade?: number | null): Promise<DayStatus> {
  const { data } = await supabase.from('calendar_events').select('type, title, date, end_date, target_grades').lte('date', date).or(`end_date.gte.${date},and(end_date.is.null,date.eq.${date})`)
  const evs = ((data || []) as CalendarRow[]).filter(e => appliesTo(e, grade))
  const off = evs.find(e => e.type === 'day_off')
  const trip = evs.find(e => e.type === 'field_trip')
  return { off: off?.title || null, trip: trip?.title || null }
}

/** Today (KST) is a day nobody is expected to mark: a whole-school day off. */
export async function isSchoolDayOff(date: string): Promise<boolean> {
  const s = await loadDayStatus(date, null)
  return !!s.off
}

/** The reason nobody is in class on a day: the day off first, else the field trip. */
export const awayReason = (s: DayStatus): string | null => s.off || s.trip

export interface AwayDay { date: string; reason: string; kind: 'off' | 'trip' }

const addDays = (key: string, n: number) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const weekdayOf = (key: string) => new Date(key + 'T12:00:00Z').getUTCDay()

/**
 * Every class day in [from, to] (inclusive) that a grade spends away: days off
 * and field trips on the calendar, one entry per calendar day. Weekends and the
 * grade's no-class weekdays from Settings are left out, since nothing was
 * expected on them anyway. A day that is both a day off and a trip counts as
 * the day off.
 */
export async function loadAwayDays(from: string, to: string, grade: number | null): Promise<AwayDay[]> {
  if (from > to) return []
  const [{ data }, rules] = await Promise.all([
    supabase.from('calendar_events').select('type, title, date, end_date, target_grades').lte('date', to).or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`),
    loadScheduleRules(),
  ])
  return expandAwayDays((data || []) as CalendarRow[], from, to, grade, rules)
}

/** The pure part of loadAwayDays: calendar rows in, one entry per away class day out. */
export function expandAwayDays(events: CalendarRow[], from: string, to: string, grade: number | null, rules: ScheduleRules): AwayDay[] {
  const byDate: Record<string, AwayDay> = {}
  events.filter(e => appliesTo(e, grade)).forEach(e => {
    const kind: AwayDay['kind'] = e.type === 'day_off' ? 'off' : 'trip'
    const last = e.end_date && e.end_date > e.date ? e.end_date : e.date
    for (let d = e.date < from ? from : e.date; d <= last && d <= to; d = addDays(d, 1)) {
      const dow = weekdayOf(d)
      if (dow === 0 || dow === 6) continue
      if (grade != null && noClassOn(rules, grade, dow)) continue
      if (!byDate[d] || (kind === 'off' && byDate[d].kind === 'trip')) byDate[d] = { date: d, reason: e.title, kind }
    }
  })
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Attendance rows with days off and field trips taken out, so a holiday never
 * counts as an absence (or a day present) anywhere absences are totalled.
 * Pass the student's grade when it is known, so a trip for another grade is
 * not mistaken for one of theirs.
 */
export async function withoutAwayDays<T extends { date: string }>(rows: T[], grade: number | null): Promise<T[]> {
  if (rows.length === 0) return rows
  let from = rows[0].date, to = rows[0].date
  rows.forEach(r => { if (r.date < from) from = r.date; if (r.date > to) to = r.date })
  const away = new Set((await loadAwayDays(from, to, grade)).map(a => a.date))
  return away.size === 0 ? rows : rows.filter(r => !away.has(r.date))
}

/**
 * Marks every student absent, with the day's reason as the note, on each away
 * day in [from, to] that has no attendance yet for these students. A day a
 * teacher already touched is left alone, so a student who came in anyway
 * keeps their mark. Returns the days that were filled.
 */
export async function fillAwayDays(students: { id: string }[], grade: number | null, from: string, to: string, recordedBy: string | null): Promise<AwayDay[]> {
  if (students.length === 0) return []
  const away = await loadAwayDays(from, to, grade)
  if (away.length === 0) return []
  const ids = students.map(s => s.id)
  const { data: existing } = await supabase.from('attendance').select('date').in('student_id', ids).in('date', away.map(a => a.date))
  const touched = new Set((existing || []).map((r: any) => r.date as string))
  const toFill = away.filter(a => !touched.has(a.date))
  if (toFill.length === 0) return []
  const rows = toFill.flatMap(a => ids.map(student_id => ({ student_id, date: a.date, status: 'absent', note: a.reason, recorded_by: recordedBy })))
  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date', ignoreDuplicates: true })
  return error ? [] : toFill
}
