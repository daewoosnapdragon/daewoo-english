import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import { logActivity } from '@/lib/activity'
import { PHONICS_CONTENT_VERSION, type PhonicsCheckRow, type PhonicsMark } from '@/lib/phonics'

// ─── Phonics checks: reads and writes ────────────────────────────
// The table is supabase/migrations/20261110_phonics_checks.sql. Rows come
// back newest first.

export async function loadPhonicsChecks(studentIds: string[]): Promise<PhonicsCheckRow[]> {
  if (studentIds.length === 0) return []
  const { data } = await fetchAll<PhonicsCheckRow>((from, to) =>
    supabase.from('phonics_checks').select('*').in('student_id', studentIds)
      .order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(from, to))
  return (data || []).map(normalize)
}

export async function loadStudentPhonicsChecks(studentId: string): Promise<PhonicsCheckRow[]> {
  return loadPhonicsChecks([studentId])
}

export interface PhonicsCheckInput {
  student_id: string
  date: string
  assessed_by: string | null
  skills: string[]
  results: Record<string, Record<string, PhonicsMark>>
  heard: Record<string, Record<string, string>>
  observations: Record<string, string[]>
  notes: string
}

/** Inserts a new check, or replaces the contents of `id` when editing. */
export async function savePhonicsCheck(input: PhonicsCheckInput, id?: string, studentName = ''): Promise<{ id: string | null; error: string | null }> {
  // Only the sheets in the sitting are kept; marks on a sheet the teacher
  // un-ticked before saving are dropped. What was heard is kept only for
  // words still marked as errors.
  const results: PhonicsCheckInput['results'] = {}
  const heard: PhonicsCheckInput['heard'] = {}
  const observations: PhonicsCheckInput['observations'] = {}
  input.skills.forEach(s => {
    results[s] = input.results[s] || {}
    const h: Record<string, string> = {}
    Object.entries(input.heard[s] || {}).forEach(([w, said]) => { if (results[s][w] === 'error' && said.trim()) h[w] = said.trim() })
    heard[s] = h
    observations[s] = input.observations[s] || []
  })
  const row = { ...input, results, heard, observations, content_version: PHONICS_CONTENT_VERSION }
  const what = `Phonics check: ${studentName} · ${input.skills.length} ${input.skills.length === 1 ? 'sheet' : 'sheets'}`
  if (id) {
    const { error } = await supabase.from('phonics_checks').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { id: null, error: error.message }
    logActivity('edited', what, { path: '/reading' })
    return { id, error: null }
  }
  const { data, error } = await supabase.from('phonics_checks').insert(row).select('id').single()
  if (error) return { id: null, error: error.message }
  logActivity('saved', what, { path: '/reading' })
  return { id: data?.id || null, error: null }
}

export async function deletePhonicsCheck(id: string, studentName = ''): Promise<string | null> {
  const { error } = await supabase.from('phonics_checks').delete().eq('id', id)
  if (error) return error.message
  logActivity('deleted', `Phonics check: ${studentName}`, { path: '/reading' })
  return null
}

function normalize(r: any): PhonicsCheckRow {
  const obj = (v: any) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
  return {
    ...r,
    skills: Array.isArray(r.skills) ? r.skills : [],
    results: obj(r.results),
    heard: obj(r.heard),
    observations: obj(r.observations),
    notes: r.notes || '',
    content_version: r.content_version || '',
  }
}
