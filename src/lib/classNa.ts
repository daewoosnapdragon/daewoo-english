// ─── Class-level "not assessed" flags ────────────────────────────
// One row per semester, class, grade, area and document (progress report
// or report card) in class_report_settings. Every report screen reads
// them through here, so the document scoping lives in one place. Until
// supabase/migration-class-na-by-document.sql has run the table has no
// report_type column; the loaders then fall back to the old shared rows,
// so nothing breaks on the day the code goes out before the SQL.

import type { ReportDocument } from '@/lib/reportDocument'

// The client is imported inside each query so the pure helpers test without a database.
const db = async () => (await import('@/lib/supabase')).supabase

export const NA_DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const

export interface ClassNaRow { english_class: string; domain: string; is_na: boolean }

const unscoped = (e: any) => /report_type/.test(e?.message || '') || e?.code === '42703'

/** Flags for one class, as area → N/A. */
export async function loadClassNa(semesterId: string, englishClass: string, grade: number, doc: ReportDocument): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {}
  NA_DOMAINS.forEach(d => { out[d] = false })
  const supabase = await db()
  let { data, error } = await supabase.from('class_report_settings').select('domain, is_na').eq('semester_id', semesterId).eq('english_class', englishClass).eq('grade', grade).eq('report_type', doc)
  if (error && unscoped(error)) ({ data, error } = await supabase.from('class_report_settings').select('domain, is_na').eq('semester_id', semesterId).eq('english_class', englishClass).eq('grade', grade))
  ;(data || []).forEach((r: any) => { if ((NA_DOMAINS as readonly string[]).includes(r.domain)) out[r.domain] = !!r.is_na })
  return out
}

/** Flags for every class in a grade, for the whole-grade print. */
export async function loadGradeClassNa(semesterId: string, grade: number, doc: ReportDocument): Promise<ClassNaRow[]> {
  const supabase = await db()
  let { data, error } = await supabase.from('class_report_settings').select('english_class, domain, is_na').eq('semester_id', semesterId).eq('grade', grade).eq('report_type', doc)
  if (error && unscoped(error)) ({ data, error } = await supabase.from('class_report_settings').select('english_class, domain, is_na').eq('semester_id', semesterId).eq('grade', grade))
  return (data || []) as ClassNaRow[]
}

/** Sets one area's flag for one document. Returns an error message, or null. */
export async function saveClassNa(semesterId: string, englishClass: string, grade: number, doc: ReportDocument, domain: string, isNa: boolean, teacherId: string | null): Promise<string | null> {
  const row = { semester_id: semesterId, english_class: englishClass, grade, domain, report_type: doc, is_na: isNa, updated_by: teacherId, updated_at: new Date().toISOString() }
  const supabase = await db()
  const { error } = await supabase.from('class_report_settings').upsert(row, { onConflict: 'semester_id,english_class,grade,domain,report_type' })
  if (!error) return null
  if (unscoped(error)) return 'Run supabase/migration-class-na-by-document.sql first: the N/A flags are not yet kept per document.'
  if (error.code === '42P01') return 'class_report_settings table not set up yet. Run the SQL migration.'
  return error.message
}

/** Which areas were N/A on the other document, so the report card can offer to carry them over. */
export function carryOverCandidates(progress: Record<string, boolean>, card: Record<string, boolean>): string[] {
  return NA_DOMAINS.filter(d => progress[d] && !card[d])
}

/** Assessments per area this semester, mixed assessments counted in every area they touch. */
export function assessmentCounts(assessments: Array<{ domain?: string | null; mixed?: boolean | null; domain_split?: Record<string, number> | null }>): Record<string, number> {
  const out: Record<string, number> = {}
  NA_DOMAINS.forEach(d => { out[d] = 0 })
  for (const a of assessments) {
    if (a.mixed && a.domain_split) { for (const d of NA_DOMAINS) if (Number(a.domain_split[d] || 0) > 0) out[d]++ }
    else if (a.domain && (NA_DOMAINS as readonly string[]).includes(a.domain)) out[a.domain]++
  }
  return out
}
