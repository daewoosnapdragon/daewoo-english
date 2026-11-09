import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { DEFAULT_OVERTIME_SETTINGS, OVERTIME_KEY, daysOffIn, fmtDate, fmtRange, parseOvertimeSettings, type DayOffRow, type OvertimeEntry, type OvertimeSettings } from '@/lib/overtime'

// ─── Overtime: the reads and writes ──────────────────────────────
// Every write leaves a line in the activity log. Errors come back as a
// message (null when it worked); the page shows them as toasts.

const msg = (e: { message?: string } | null | undefined) => e?.message || null
const rowToEntry = (x: any): OvertimeEntry => ({ ...x, start_time: String(x.start_time).slice(0, 5), end_time: String(x.end_time).slice(0, 5), minutes: Number(x.minutes) })

/** True when the error says the table is not there yet. */
export const isOvertimeMissing = (message: string | null | undefined) => !!message && /overtime_entries/.test(message)

/**
 * Entries in [from, to] (one teacher's, or everyone's when teacherId is
 * null) and the whole-school days off in the same range.
 */
export async function fetchOvertime(teacherId: string | null, from: string, to: string): Promise<{ entries: OvertimeEntry[]; daysOff: Record<string, string>; error: string | null }> {
  let q = supabase.from('overtime_entries').select('*').gte('date', from).lte('date', to).order('date').order('start_time')
  if (teacherId) q = q.eq('teacher_id', teacherId)
  const [e, c] = await Promise.all([
    q.limit(5000),
    supabase.from('calendar_events').select('type, title, date, end_date, target_grades').eq('type', 'day_off').lte('date', to).or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`),
  ])
  return {
    entries: ((e.data || []) as any[]).map(rowToEntry),
    daysOff: daysOffIn((c.data || []) as DayOffRow[], from, to),
    error: msg(e.error),
  }
}

/** A teacher's latest entries, any month: for Same as last time and the reason chips. */
export async function fetchRecentOvertime(teacherId: string, n = 30): Promise<OvertimeEntry[]> {
  const { data } = await supabase.from('overtime_entries').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(n)
  return ((data || []) as any[]).map(rowToEntry)
}

/** Whole-school days off in [from, to]: for checking a date outside the month on screen. */
export async function fetchDaysOff(from: string, to: string): Promise<Record<string, string>> {
  const { data } = await supabase.from('calendar_events').select('type, title, date, end_date, target_grades').eq('type', 'day_off').lte('date', to).or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`)
  return daysOffIn((data || []) as DayOffRow[], from, to)
}

export type EntryDraft = Pick<OvertimeEntry, 'date' | 'start_time' | 'end_time' | 'minutes' | 'reason'>

const describe = (d: EntryDraft, who?: string) => `Overtime${who ? ` (${who})` : ''}: ${fmtDate(d.date)} ${fmtRange(d.start_time, d.end_time)}`

export async function addEntry(teacherId: string, d: EntryDraft, who?: string): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('overtime_entries').insert({ teacher_id: teacherId, ...d, reason: d.reason.trim() }).select('id').single()
  if (error) return { id: null, error: error.message }
  logActivity('created', describe(d, who), { path: '/overtime' })
  return { id: (data as any).id as string, error: null }
}

export async function updateEntry(id: string, d: EntryDraft, who?: string): Promise<string | null> {
  const { error } = await supabase.from('overtime_entries').update({ ...d, reason: d.reason.trim(), updated_at: new Date().toISOString() }).eq('id', id)
  if (!error) logActivity('edited', describe(d, who), { key: id, path: '/overtime' })
  return msg(error)
}

export async function deleteEntry(e: OvertimeEntry, who?: string): Promise<string | null> {
  const { error } = await supabase.from('overtime_entries').delete().eq('id', e.id)
  if (!error) logActivity('deleted', describe(e, who), { path: '/overtime' })
  return msg(error)
}

export async function loadOvertimeSettings(): Promise<OvertimeSettings> {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', OVERTIME_KEY).limit(1)
    return parseOvertimeSettings((data as any[] | null)?.[0]?.value)
  } catch { return DEFAULT_OVERTIME_SETTINGS }
}

export async function saveOvertimeSettings(s: OvertimeSettings): Promise<string | null> {
  const { error } = await supabase.from('app_settings').upsert({ key: OVERTIME_KEY, value: JSON.stringify(s), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (!error) logActivity('settings', 'Overtime')
  return msg(error)
}
