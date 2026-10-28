// ─── Which teacher teaches a class ────────────────────────────────
// The teachers table is the one place a class's teacher is set (Settings).
// students.teacher_id is only a cached copy of that, and it goes stale
// whenever a student's class is edited without it, or a teacher changes
// class. Reports and the roster therefore resolve the teacher from the
// student's english_class first and fall back to teacher_id only when no
// active teacher has that class (Unplaced, a class with no teacher yet).

export interface ClassTeacher { id: string; name: string; english_class: string; role?: string; is_active?: boolean; photo_url?: string | null }

export function teacherForClass<T extends ClassTeacher>(teachers: T[], englishClass: string | null | undefined): T | null {
  if (!englishClass) return null
  const active = teachers.filter(t => t.is_active !== false && t.role !== 'admin')
  return active.find(t => t.english_class === englishClass) || null
}

export function resolveStudentTeacher<T extends ClassTeacher>(teachers: T[], student: { english_class?: string | null; teacher_id?: string | null }): T | null {
  return teacherForClass(teachers, student.english_class) || (student.teacher_id ? teachers.find(t => t.id === student.teacher_id) || null : null)
}

// class name → teacher id (first active teacher of each class).
export function classTeacherMap(teachers: ClassTeacher[]): Record<string, string> {
  const map: Record<string, string> = {}
  teachers.forEach(t => { if (t.is_active !== false && t.role !== 'admin' && t.english_class && !map[t.english_class]) map[t.english_class] = t.id })
  return map
}
