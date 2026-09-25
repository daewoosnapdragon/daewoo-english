import { supabase } from '@/lib/supabase'
import { levelTestToReadingRecord, type LevelTestReadingRecord } from '@/lib/utils'

// The oral section of every level test a student has sat, as reading records,
// so the student page and the reading tab show the same history the Reading
// screen does. Dated by the test's creation; titled with the test's name.
export async function loadLevelTestReadingRecords(studentId: string): Promise<LevelTestReadingRecord[]> {
  const { data: scores } = await supabase.from('level_test_scores').select('level_test_id, raw_scores, calculated_metrics').eq('student_id', studentId)
  const list = scores || []
  if (list.length === 0) return []
  const { data: tests } = await supabase.from('level_tests').select('id, name, created_at').in('id', list.map((s: any) => s.level_test_id))
  const byId: Record<string, any> = Object.fromEntries((tests || []).map((t: any) => [t.id, t]))
  const out: LevelTestReadingRecord[] = []
  list.forEach((s: any) => {
    const t = byId[s.level_test_id]
    const rec = levelTestToReadingRecord(s, t?.created_at?.split('T')[0] || '', studentId)
    if (rec) out.push({ ...rec, passage_title: t?.name ? `Level test · ${t.name}` : 'Level test' })
  })
  return out
}

/** Ad-hoc reading assessments and level-test oral records together, newest first. */
export function mergeReadingRecords(adHoc: any[], levelTests: LevelTestReadingRecord[]): any[] {
  return [...adHoc, ...levelTests].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}
