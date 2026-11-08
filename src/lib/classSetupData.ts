import { supabase } from '@/lib/supabase'
import { readSetup, type ClassSetup } from '@/lib/classSetup'

// Reads and writes curriculum_class_setup (supabase/migration-class-setup.sql).

export const isSetupMissing = (message: string | undefined | null) => !!message && /curriculum_class_setup/.test(message)

/** Every class's setup rows: a handful, so other classes' recipes can be copied. */
export async function fetchSetups(): Promise<{ rows: ClassSetup[]; error: string | null }> {
  const { data, error } = await supabase.from('curriculum_class_setup').select('english_class, grade, days, recipes, standing, updated_at').order('english_class').order('grade')
  if (error) return { rows: [], error: error.message }
  return { rows: (data || []).map(r => readSetup(r as Record<string, unknown>)), error: null }
}

type Field = 'days' | 'recipes' | 'standing'

/**
 * Saves one part of a class's setup (its days, recipes or every-week items),
 * creating the row if it is not there. Only that column is written, so two
 * people changing different parts at once do not undo each other.
 */
export async function saveSetupField(cls: string, grade: number, field: Field, value: ClassSetup[Field], teacherId: string | null | undefined): Promise<{ error: string | null; updated_at: string | null }> {
  const { data, error } = await supabase.from('curriculum_class_setup')
    .upsert({ english_class: cls, grade, [field]: value, updated_by: teacherId || null, updated_at: new Date().toISOString() }, { onConflict: 'english_class,grade' })
    .select('updated_at').single()
  return { error: error?.message || null, updated_at: (data as { updated_at?: string } | null)?.updated_at || null }
}

/** Makes a grade follow the class's all-grades setup again. */
export async function deleteGradeSetup(cls: string, grade: number): Promise<{ error: string | null }> {
  if (grade <= 0) return { error: 'The all-grades setup cannot be removed.' }
  const { error } = await supabase.from('curriculum_class_setup').delete().eq('english_class', cls).eq('grade', grade)
  return { error: error?.message || null }
}

/** Gives a grade its own setup, starting as a copy of the all-grades one. */
export async function createGradeSetup(from: ClassSetup, grade: number, teacherId: string | null | undefined): Promise<{ error: string | null }> {
  const { error } = await supabase.from('curriculum_class_setup').upsert({
    english_class: from.english_class, grade, days: from.days, recipes: from.recipes, standing: from.standing,
    updated_by: teacherId || null, updated_at: new Date().toISOString(),
  }, { onConflict: 'english_class,grade' })
  return { error: error?.message || null }
}
