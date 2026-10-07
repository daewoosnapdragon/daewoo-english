import { supabase } from '@/lib/supabase'
import { getKSTDateString, toKSTDateString } from '@/lib/utils'

// ─── Behavior ladder ─────────────────────────────────────────────
// Three concern or negative notes on a student open a case for admin: the
// notes in one place, a step on the ladder, and an urgent notice to every
// admin and the class teacher. The case cannot be dismissed; it closes when
// the step's action ("Parents contacted") is recorded, which also writes a
// parent-contact entry on the student's log. The database does the opening
// (a trigger on behavior_logs, see supabase/migration-behavior-ladder.sql);
// this module reads cases and records what people do with them.

export interface LadderStep { threshold: number; label: string; action: string }
export interface LadderSettings { steps: LadderStep[]; overdue_days: number }
export const DEFAULT_LADDER: LadderSettings = {
  overdue_days: 2,
  steps: [
    { threshold: 3, label: 'Admin review and parent contact', action: 'Parents contacted' },
    { threshold: 3, label: 'Meeting with parents and admin', action: 'Meeting held' },
  ],
}

export type CaseStatus = 'open' | 'acknowledged' | 'closed'
export interface BehaviorCase {
  id: string; student_id: string; semester_id: string | null
  step: number; step_label: string; action_label: string; threshold: number
  status: CaseStatus; opened_reason: 'threshold' | 'flag'
  log_ids: string[]; ask: string; notice_id: string | null
  acknowledged_by: string | null; acknowledged_at: string | null
  action_date: string | null; action_note: string
  closed_by: string | null; closed_at: string | null
  created_at: string; updated_at: string
  students?: { english_name: string; korean_name: string; english_class: string; grade: number } | null
}

export interface LadderStatus { step: number; threshold: number; note_count: number; open_case_id: string | null; step_label: string; action_label: string }

/** Whether a Supabase error means migration-behavior-ladder.sql has not been run. */
export const isLadderMissing = (message: string | undefined | null) => !!message && /behavior_cases|behavior_ladder/.test(message)

export async function loadLadderSettings(): Promise<LadderSettings> {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'behavior_ladder').single()
    if (data?.value) {
      const parsed = JSON.parse(data.value)
      const steps = Array.isArray(parsed?.steps) ? parsed.steps.filter((s: any) => s && Number(s.threshold) > 0).map((s: any) => ({ threshold: Number(s.threshold), label: String(s.label || ''), action: String(s.action || 'Done') })) : []
      if (steps.length) return { steps, overdue_days: Math.max(0, Number(parsed.overdue_days ?? 2)) }
    }
  } catch {}
  return DEFAULT_LADDER
}

export async function saveLadderSettings(s: LadderSettings): Promise<string | null> {
  const { error } = await supabase.from('app_settings').upsert({ key: 'behavior_ladder', value: JSON.stringify(s) }, { onConflict: 'key' })
  return error ? error.message : null
}

/** Weekdays elapsed since an ISO timestamp, in Seoul time; holidays are not subtracted. */
export function schoolDaysSince(iso: string, today: string = getKSTDateString()): number {
  const start = new Date(toKSTDateString(iso) + 'T00:00:00Z')
  const end = new Date(today + 'T00:00:00Z')
  let n = 0
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1)
    const dow = next.getUTCDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}

export const isOverdue = (c: BehaviorCase, overdueDays: number, today?: string) => c.status === 'open' && schoolDaysSince(c.created_at, today) >= overdueDays

const CASE_SELECT = '*, students(english_name, korean_name, english_class, grade)'

/** Cases that still need something: all of them for admin, one class's for a teacher, or one student's (with history). */
export async function fetchCases(opts: { englishClass?: string | null; studentId?: string; includeClosed?: boolean }): Promise<{ cases: BehaviorCase[]; error: string | null }> {
  let q = supabase.from('behavior_cases').select(CASE_SELECT).order('created_at', { ascending: false })
  if (opts.studentId) q = q.eq('student_id', opts.studentId)
  if (!opts.includeClosed) q = q.neq('status', 'closed')
  const { data, error } = await q
  if (error) return { cases: [], error: error.message }
  let rows = (data || []) as BehaviorCase[]
  if (opts.englishClass) rows = rows.filter(c => c.students?.english_class === opts.englishClass)
  return { cases: rows, error: null }
}

export async function acknowledgeCase(c: BehaviorCase, teacherId: string): Promise<string | null> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('behavior_cases').update({ status: 'acknowledged', acknowledged_by: teacherId, acknowledged_at: now, updated_at: now }).eq('id', c.id).eq('status', 'open')
  if (error) return error.message
  if (c.notice_id) await supabase.from('notice_receipts').upsert({ notice_id: c.notice_id, teacher_id: teacherId }, { onConflict: 'notice_id,teacher_id', ignoreDuplicates: true })
  return null
}

/** Record the step's action: close the case, write the parent-contact entry, retire the notice. */
export async function closeCase(c: BehaviorCase, teacherId: string, actionDate: string, note: string): Promise<string | null> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('behavior_cases').update({
    status: 'closed', action_date: actionDate, action_note: note.trim(), closed_by: teacherId, closed_at: now, updated_at: now,
    ...(c.status === 'open' ? { acknowledged_by: teacherId, acknowledged_at: now } : {}),
  }).eq('id', c.id)
  if (error) return error.message
  const { error: logErr } = await supabase.from('behavior_logs').insert({
    student_id: c.student_id, date: actionDate, type: 'parent_contact', is_flagged: false, teacher_id: teacherId,
    note: `${c.action_label} (behavior ladder, step ${c.step})${note.trim() ? `: ${note.trim()}` : ''}`,
  })
  if (logErr) return logErr.message
  if (c.notice_id) {
    // Expire the notice as of yesterday (Seoul), so it leaves every board at once.
    const y = new Date(getKSTDateString() + 'T00:00:00Z'); y.setUTCDate(y.getUTCDate() - 1)
    await supabase.from('notices').update({ expires_on: y.toISOString().slice(0, 10), updated_at: now }).eq('id', c.notice_id)
  }
  return null
}

export async function updateAsk(caseId: string, ask: string): Promise<string | null> {
  const { error } = await supabase.from('behavior_cases').update({ ask: ask.trim(), updated_at: new Date().toISOString() }).eq('id', caseId)
  return error ? error.message : null
}

export async function ladderStatus(studentId: string): Promise<LadderStatus | null> {
  const { data, error } = await supabase.rpc('behavior_ladder_status', { p_student: studentId })
  if (error || !data) return null
  const row = Array.isArray(data) ? data[0] : data
  return row ? { step: Number(row.step), threshold: Number(row.threshold), note_count: Number(row.note_count), open_case_id: row.open_case_id || null, step_label: row.step_label || '', action_label: row.action_label || '' } : null
}

/** Re-run the check for every student; returns how many cases it opened. */
export async function sweepLadder(): Promise<number> {
  const { data, error } = await supabase.rpc('behavior_ladder_sweep')
  return error ? 0 : Number(data || 0)
}

/** Which admins have seen the case's notice (from notice receipts). */
export async function noticeSeenBy(noticeIds: string[]): Promise<Record<string, { teacher_id: string; seen_at: string | null }[]>> {
  if (!noticeIds.length) return {}
  const { data } = await supabase.from('notice_receipts').select('notice_id, teacher_id, seen_at').in('notice_id', noticeIds)
  const out: Record<string, { teacher_id: string; seen_at: string | null }[]> = {}
  ;(data || []).forEach((r: any) => { (out[r.notice_id] ||= []).push({ teacher_id: r.teacher_id, seen_at: r.seen_at }) })
  return out
}
