// ─── What the progress report said ───────────────────────────────
// The progress report prints the running composite as it stands that day
// and nothing kept it, so the report card's "since October" had to be
// rebuilt from the papers' dates. Now every print of a progress report,
// single or batch, writes the grades it showed to
// progress_report_snapshots, one row per area, and the latest print wins
// (the last print is the one that went home). The fact sheet reads the
// snapshot first and falls back to the rebuild only when there is none.

import { supabase } from '@/lib/supabase'

export const SNAPSHOT_DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const

export interface SnapshotRow { student_id: string; semester_id: string; domain: string; grade: number | null; is_na: boolean; taken_at: string; taken_by: string | null }

/** One row per area, N/A areas kept as N/A so the report card can tell "not assessed" from "no grade". */
export function snapshotRows(studentId: string, semesterId: string, domainGrades: Record<string, number | null>, domainNa: Record<string, boolean>, takenBy: string | null, takenAt = new Date().toISOString()): SnapshotRow[] {
  return SNAPSHOT_DOMAINS.map(d => ({
    student_id: studentId, semester_id: semesterId, domain: d,
    grade: domainNa[d] ? null : (domainGrades[d] ?? null), is_na: !!domainNa[d], taken_at: takenAt, taken_by: takenBy,
  }))
}

export interface Snapshot { grades: Record<string, number | null>; takenAt: string | null }

/** The grades per area from snapshot rows, null when there are none. */
export function snapshotFromRows(rows: Array<{ domain: string; grade: number | null; is_na?: boolean | null; taken_at?: string | null }>): Snapshot | null {
  if (!rows || rows.length === 0) return null
  const grades: Record<string, number | null> = {}
  let takenAt: string | null = null
  for (const r of rows) {
    grades[r.domain] = r.is_na ? null : (r.grade == null ? null : Number(r.grade))
    if (r.taken_at && (!takenAt || r.taken_at > takenAt)) takenAt = r.taken_at
  }
  return { grades, takenAt }
}

const missing = (e: any) => e?.code === '42P01' || /progress_report_snapshots/.test(e?.message || '')

/** Writes the rows; a missing table is reported once in the console and never blocks a print. */
export async function saveProgressSnapshot(rows: SnapshotRow[]): Promise<void> {
  if (rows.length === 0) return
  try {
    const { error } = await supabase.from('progress_report_snapshots').upsert(rows, { onConflict: 'student_id,semester_id,domain' })
    if (error && !missing(error)) console.error('progress snapshot:', error.message)
    if (error && missing(error)) console.warn('progress snapshot: run supabase/migration-progress-snapshots.sql')
  } catch (e: any) { console.error('progress snapshot:', e?.message || e) }
}

export async function loadProgressSnapshot(studentId: string, semesterId: string): Promise<Snapshot | null> {
  try {
    const { data, error } = await supabase.from('progress_report_snapshots').select('domain, grade, is_na, taken_at').eq('student_id', studentId).eq('semester_id', semesterId)
    if (error) return null
    return snapshotFromRows(data || [])
  } catch { return null }
}
