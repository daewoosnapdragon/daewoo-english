// ─── Loading what a class has been taught ────────────────────────
// Lesson plans live in parent_calendar (one row per class, grade and day,
// content JSON with the units each subject row links to); done units in
// curriculum_unit_done through the class's placements; objective banks in
// curriculum_unit_objectives; Standards page statuses in
// class_standard_status; the builder's own ticks in app_settings. Each
// source is optional: a missing table or an empty result just contributes
// nothing.

import { supabase } from '@/lib/supabase'
import { unitIdsFromPlanRows, parsePicks, picksKey } from '@/lib/taughtSkills'

export interface TaughtSources { planCodes: string[]; statusCodes: string[]; picks: { add: string[]; remove: string[] } }

const safe = async <T,>(p: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> => { try { const r = await p; return r.error ? [] : (r.data || []) } catch { return [] } }

export async function loadTaughtSources(cls: string, grade: number, semester: { id: string; start_date?: string | null; end_date?: string | null }): Promise<TaughtSources> {
  const from = semester.start_date || '0000-01-01', to = semester.end_date || '9999-12-31'
  const [planRows, placements, statusRows, pickRows] = await Promise.all([
    safe<{ content: any }>(supabase.from('parent_calendar').select('content').eq('english_class', cls).eq('grade', grade).gte('date', from).lte('date', to)),
    safe<{ id: string }>(supabase.from('curriculum_placements').select('id').eq('english_class', cls).eq('grade', grade)),
    safe<{ standard_code: string }>(supabase.from('class_standard_status').select('standard_code').eq('english_class', cls).eq('student_grade', grade)),
    safe<{ value: string }>(supabase.from('app_settings').select('value').eq('key', picksKey(cls, grade, semester.id))),
  ])
  const unitIds = new Set(unitIdsFromPlanRows(planRows))
  if (placements.length) {
    const done = await safe<{ unit_id: string }>(supabase.from('curriculum_unit_done').select('unit_id').in('placement_id', placements.map(p => p.id)))
    for (const d of done) unitIds.add(d.unit_id)
  }
  let planCodes: string[] = []
  if (unitIds.size) {
    const objectives = await safe<{ ccss_codes: string[] }>(supabase.from('curriculum_unit_objectives').select('ccss_codes').in('unit_id', Array.from(unitIds)))
    planCodes = objectives.flatMap(o => o.ccss_codes || [])
  }
  return { planCodes, statusCodes: statusRows.map(r => r.standard_code), picks: parsePicks(pickRows[0]?.value) }
}

export async function saveTaughtPicks(cls: string, grade: number, semesterId: string, picks: { add: string[]; remove: string[] }): Promise<string | null> {
  const { error } = await supabase.from('app_settings').upsert({ key: picksKey(cls, grade, semesterId), value: JSON.stringify(picks), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return error ? error.message : null
}
