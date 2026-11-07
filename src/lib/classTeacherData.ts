import { supabase } from '@/lib/supabase'
import { classTeacherMap, type ClassTeacher } from '@/lib/classTeacher'

// Supabase side of classTeacher.ts, kept apart so the pure helpers stay testable.
export async function loadTeachers(): Promise<ClassTeacher[]> {
  const { data } = await supabase.from('teachers').select('id, name, english_class, role, is_active, photo_url')
  return (data as ClassTeacher[]) || []
}

// class name → teacher id, for writing students.teacher_id when a class changes.
export async function loadClassTeacherMap(): Promise<Record<string, string>> {
  return classTeacherMap(await loadTeachers())
}
