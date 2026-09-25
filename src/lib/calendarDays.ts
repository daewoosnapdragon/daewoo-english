import { supabase } from '@/lib/supabase'

// ─── What the school calendar says about a day ───────────────────
// A day_off event means no class, so attendance is not expected. A field_trip
// event means the students are away, so attendance is everyone absent with the
// trip as the reason. Both respect the event's target grades (none = all).

export interface DayStatus { off: string | null; trip: string | null }

export async function loadDayStatus(date: string, grade?: number | null): Promise<DayStatus> {
  const { data } = await supabase.from('calendar_events').select('type, title, date, end_date, target_grades').lte('date', date).or(`end_date.gte.${date},and(end_date.is.null,date.eq.${date})`)
  const evs = (data || []).filter((e: any) => {
    const tg = e.target_grades as number[] | null
    return e.type === 'day_off' || e.type === 'field_trip' ? (!tg || tg.length === 0 || grade == null || tg.includes(grade)) : false
  })
  const off = evs.find((e: any) => e.type === 'day_off')
  const trip = evs.find((e: any) => e.type === 'field_trip')
  return { off: off?.title || null, trip: trip?.title || null }
}

/** Today (KST) is a day nobody is expected to mark: a whole-school day off. */
export async function isSchoolDayOff(date: string): Promise<boolean> {
  const s = await loadDayStatus(date, null)
  return !!s.off
}
