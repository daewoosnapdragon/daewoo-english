import { describe, it, expect } from 'vitest'
import { teacherForClass, resolveStudentTeacher, classTeacherMap } from '@/lib/classTeacher'

const teachers = [
  { id: 'fola', name: 'Fola', english_class: 'Lily', role: 'teacher', is_active: true },
  { id: 'old-daisy', name: 'Old Daisy', english_class: 'Daisy', role: 'teacher', is_active: false },
  { id: 'mina', name: 'Mina', english_class: 'Daisy', role: 'teacher', is_active: true },
  { id: 'admin', name: 'Victoria Park', english_class: 'Admin', role: 'admin', is_active: true },
]

describe('teacherForClass', () => {
  it('picks the active teacher of the class, never an inactive one', () => {
    expect(teacherForClass(teachers, 'Daisy')?.name).toBe('Mina')
    expect(teacherForClass(teachers, 'Lily')?.name).toBe('Fola')
  })
  it('is null for a class with no teacher', () => {
    expect(teacherForClass(teachers, 'Unplaced')).toBeNull()
    expect(teacherForClass(teachers, null)).toBeNull()
  })
})

describe('resolveStudentTeacher', () => {
  it('follows the student\'s class, not a stale teacher_id', () => {
    const s = { english_class: 'Daisy', teacher_id: 'fola' }
    expect(resolveStudentTeacher(teachers, s)?.name).toBe('Mina')
  })
  it('falls back to teacher_id only when the class has no teacher', () => {
    expect(resolveStudentTeacher(teachers, { english_class: 'Unplaced', teacher_id: 'fola' })?.name).toBe('Fola')
    expect(resolveStudentTeacher(teachers, { english_class: 'Unplaced', teacher_id: null })).toBeNull()
  })
})

describe('classTeacherMap', () => {
  it('maps each class to its active teacher and skips admins', () => {
    expect(classTeacherMap(teachers)).toEqual({ Lily: 'fola', Daisy: 'mina' })
  })
})
