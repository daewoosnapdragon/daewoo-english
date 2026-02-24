'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, Teacher, SchoolSettings, Semester, EnglishClass, Grade } from '@/types'

// ─── Teachers ────────────────────────────────────────────────────────

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .order('role', { ascending: false }) // admin first
      if (!error && data) setTeachers(data)
      setLoading(false)
    }
    fetch()
  }, [])

  return { teachers, loading }
}

// ─── Students ────────────────────────────────────────────────────────

interface UseStudentsOptions {
  grade?: Grade | null
  english_class?: EnglishClass | null
  teacher_id?: string | null
  search?: string
}

export function useStudents(options: UseStudentsOptions = {}) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('students')
      .select(`
        *,
        teachers ( name )
      `)
      .eq('is_active', true)

    if (options.grade) query = query.eq('grade', options.grade)
    if (options.english_class) query = query.eq('english_class', options.english_class)
    if (options.teacher_id) query = query.eq('teacher_id', options.teacher_id)

    query = query.order('grade').order('english_class').order('korean_name')

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    let result = (data || []).map((row: any) => ({
      ...row,
      teacher_name: row.teachers?.name || '',
    }))

    // Client-side search (faster than ilike for small datasets)
    if (options.search) {
      const q = options.search.toLowerCase()
      result = result.filter((s: Student) =>
        s.english_name.toLowerCase().includes(q) ||
        s.korean_name.includes(q) ||
        String(s.class_number).includes(q)
      )
    }

    setStudents(result)
    setLoading(false)
  }, [options.grade, options.english_class, options.teacher_id, options.search])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return { students, loading, error, refetch: fetchStudents }
}

// ─── Student Count by Class ──────────────────────────────────────────

export interface ClassCount {
  english_class: EnglishClass
  grade: Grade
  count: number
}

export function useClassCounts() {
  const [counts, setCounts] = useState<ClassCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('students')
        .select('grade, english_class')
        .eq('is_active', true)

      if (!error && data) {
        const map = new Map<string, ClassCount>()
        data.forEach((row: any) => {
          const key = `${row.grade}-${row.english_class}`
          if (!map.has(key)) {
            map.set(key, { english_class: row.english_class, grade: row.grade, count: 0 })
          }
          map.get(key)!.count++
        })
        setCounts(Array.from(map.values()))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { counts, loading }
}

// ─── School Settings ─────────────────────────────────────────────────

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .single()
      if (!error && data) setSettings(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const updateSettings = async (updates: Partial<SchoolSettings>) => {
    if (!settings) return
    const { error } = await supabase
      .from('school_settings')
      .update(updates)
      .eq('id', settings.id)
    if (!error) setSettings({ ...settings, ...updates })
    return error
  }

  return { settings, loading, updateSettings }
}

// ─── Semesters ───────────────────────────────────────────────────────

export function useSemesters() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('type')
      if (!error && data) {
        setSemesters(data)
        const active = data.find((s: Semester) => s.is_active)
        if (active) setActiveSemester(active)
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { semesters, activeSemester, loading }
}

// ─── Student CRUD ────────────────────────────────────────────────────

export function useStudentActions() {
  const addStudent = async (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single()
    return { data, error }
  }

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  }

  const deactivateStudent = async (id: string) => {
    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', id)
    return { error }
  }

  return { addStudent, updateStudent, deactivateStudent }
}

// ─── Bulk Roster Upload ──────────────────────────────────────────────

export interface RosterRow {
  korean_class: string
  class_number: number
  korean_name: string
  english_name: string
  grade: number
  english_class: string
  teacher?: string
}

export interface RosterPreview {
  matched: { existing: Student; incoming: RosterRow; changes: string[] }[]
  newStudents: RosterRow[]
  notFound: Student[]
  duplicates: { row: RosterRow; conflict: string }[]
}

export function useRosterUpload() {
  const previewUpload = async (rows: RosterRow[]): Promise<RosterPreview> => {
    // Fetch all current active students
    const { data: existing } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)

    const currentStudents = existing || []
    const matched: RosterPreview['matched'] = []
    const newStudents: RosterRow[] = []
    const duplicates: RosterPreview['duplicates'] = []
    const matchedIds = new Set<string>()

    for (const row of rows) {
      // Try to match by Korean name + English name (most reliable)
      const match = currentStudents.find(s =>
        s.korean_name === row.korean_name &&
        (s.english_name.toLowerCase() === row.english_name.toLowerCase() ||
         s.english_name.toLowerCase().includes(row.english_name.split(' (')[0].toLowerCase()))
      )

      if (match) {
        matchedIds.add(match.id)
        const changes: string[] = []
        if (match.korean_class !== row.korean_class) changes.push(`Korean class: ${match.korean_class} → ${row.korean_class}`)
        if (match.class_number !== row.class_number) changes.push(`Class number: ${match.class_number} → ${row.class_number}`)
        if (match.grade !== row.grade) changes.push(`Grade: ${match.grade} → ${row.grade}`)
        if (match.english_class !== row.english_class) changes.push(`English class: ${match.english_class} → ${row.english_class}`)

        if (changes.length > 0) {
          matched.push({ existing: match, incoming: row, changes })
        }
      } else {
        // Check for duplicate korean_class + class_number in same grade
        const dupeInUpload = rows.filter(r =>
          r !== row && r.grade === row.grade && r.korean_class === row.korean_class && r.class_number === row.class_number
        )
        if (dupeInUpload.length > 0) {
          duplicates.push({ row, conflict: `Duplicate: Grade ${row.grade} ${row.korean_class}반 #${row.class_number}` })
        } else {
          newStudents.push(row)
        }
      }
    }

    const notFound = currentStudents.filter(s => !matchedIds.has(s.id))

    return { matched, newStudents, notFound, duplicates }
  }

  const applyUpload = async (preview: RosterPreview, teacherMap: Record<string, string>) => {
    const errors: string[] = []

    // Update matched students
    for (const m of preview.matched) {
      const { error } = await supabase
        .from('students')
        .update({
          korean_class: m.incoming.korean_class,
          class_number: m.incoming.class_number,
          grade: m.incoming.grade,
          english_class: m.incoming.english_class,
        })
        .eq('id', m.existing.id)
      if (error) errors.push(`Failed to update ${m.existing.english_name}: ${error.message}`)
    }

    // Insert new students
    for (const row of preview.newStudents) {
      const teacherId = teacherMap[row.english_class] || null
      const { error } = await supabase
        .from('students')
        .insert({
          korean_name: row.korean_name,
          english_name: row.english_name,
          grade: row.grade,
          korean_class: row.korean_class,
          class_number: row.class_number,
          english_class: row.english_class,
          teacher_id: teacherId,
          is_active: true,
        })
      if (error) errors.push(`Failed to add ${row.english_name}: ${error.message}`)
    }

    return errors
  }

  return { previewUpload, applyUpload }
}
