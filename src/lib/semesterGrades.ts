import { supabase } from '@/lib/supabase'
import { itemsForDomain } from '@/lib/domainSplit'
import { calculateWeightedAverage } from '@/lib/utils'

// ─── Assessment scores → semester_grades ─────────────────────────
// Report cards and progress reports read from semester_grades, where a
// teacher's manual final_grade can override the number the assessments
// produce. The calculated_grade column is only right once somebody has
// computed it, so every report screen calls this first: it works out each
// student's weighted domain average from the class's assessments for the
// semester and writes calculated_grade for the whole class in one upsert.
// final_grade, is_na and the behaviour row are never touched. Archived
// semesters have no assessments to sync from and are skipped.

const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const

export type CalculatedGrades = Record<string, Record<string, number | null>> // student id → domain → %

export async function syncSemesterGrades(opts: {
  semesterId: string
  semesterType?: string | null
  englishClass: string
  grade: number
  students: Array<{ id: string; grade?: number; english_class?: string }>
}): Promise<CalculatedGrades> {
  const { semesterId, semesterType, englishClass, grade, students } = opts
  const out: CalculatedGrades = {}
  if (!semesterId || semesterType === 'archive' || students.length === 0) return out

  const { data: assessments } = await supabase.from('assessments').select('*')
    .eq('semester_id', semesterId).eq('grade', grade).eq('english_class', englishClass)
  if (!assessments || assessments.length === 0) return out

  const ids = students.map(s => s.id)
  const { data: grades } = await supabase.from('grades').select('student_id, assessment_id, score, is_exempt, is_absent, domain_scores')
    .in('assessment_id', assessments.map((a: any) => a.id)).in('student_id', ids)
  const byStudent: Record<string, any[]> = {}
  ;(grades || []).forEach((g: any) => { (byStudent[g.student_id] ||= []).push(g) })

  const rows: any[] = []
  for (const s of students) {
    const mine = byStudent[s.id] || []
    out[s.id] = {}
    for (const domain of DOMAINS) {
      const items = itemsForDomain(domain, assessments, (a: any) => mine.find((g: any) => g.assessment_id === a.id))
      const avg = calculateWeightedAverage(items, Number(s.grade || grade || 3))
      out[s.id][domain] = avg == null ? null : Math.round(avg * 10) / 10
      if (avg == null) continue
      rows.push({
        student_id: s.id, semester_id: semesterId, domain,
        calculated_grade: out[s.id][domain], english_class: s.english_class || englishClass, grade: s.grade || grade,
      })
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from('semester_grades').upsert(rows, { onConflict: 'student_id,semester_id,domain' })
    if (error) console.error('syncSemesterGrades:', error.message)
  }
  return out
}
