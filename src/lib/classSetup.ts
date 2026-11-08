import type { CurriculumLesson, CurriculumUnit } from '@/lib/curriculumCore'

// ─── Class setup ─────────────────────────────────────────────────
// What a class sets once for lesson planning (supabase/migration-class-setup.sql):
// the usual weekdays of each book series, how it teaches a unit of each series
// (its recipe: the days each part of a unit takes, 0 to skip it), and the things
// that go on the same weekday every week. One row covers all grades (grade 0);
// a grade set up differently has its own row.

export interface Recipe { parts: Record<string, number> }
export interface StandingItem { id: string; title: string; weekday: number }
export interface ClassSetup {
  english_class: string
  grade: number
  days: Record<string, number[]>
  recipes: Record<string, Recipe>
  standing: StandingItem[]
  updated_at?: string | null
}

export const emptySetup = (cls: string, grade = 0): ClassSetup => ({ english_class: cls, grade, days: {}, recipes: {}, standing: [] })

/** The setup that applies to a class and grade: the grade's own row, else the class's all-grades row, else an empty one. */
export function setupFor(rows: ClassSetup[], cls: string, grade: number): ClassSetup {
  return rows.find(r => r.english_class === cls && r.grade === grade && grade > 0)
    || rows.find(r => r.english_class === cls && r.grade === 0)
    || emptySetup(cls, 0)
}

/** A lesson's part of the unit: its title up to a colon, so "High-frequency words: high, might" is "High-frequency words". */
export const partOf = (lessonTitle: string) => lessonTitle.split(':')[0].trim()

export interface SeriesPart { key: string; units: number; example: string }

/**
 * The parts a series' units are made of, in teaching order: lesson titles (up
 * to a colon) found in at least `minShare` of its units. Parts that only a few
 * units have (one School Link's subject, say) are left out; they take one day
 * each, as the book has them.
 */
export function seriesParts(units: Pick<CurriculumUnit, 'id'>[], lessons: Pick<CurriculumLesson, 'unit_id' | 'title' | 'sort_order' | 'notes'>[], minShare = 0.3): SeriesPart[] {
  if (!units.length) return []
  const ids = new Set(units.map(u => u.id))
  const seen = new Map<string, { units: Set<string>; pos: number; n: number; example: string }>()
  for (const l of lessons) {
    if (!ids.has(l.unit_id)) continue
    const key = partOf(l.title)
    if (!key) continue
    const s = seen.get(key) || { units: new Set<string>(), pos: 0, n: 0, example: '' }
    s.units.add(l.unit_id); s.pos += l.sort_order; s.n++
    if (!s.example) s.example = (l.notes || '').trim() || (l.title.includes(':') ? l.title.split(':').slice(1).join(':').trim() : '')
    seen.set(key, s)
  }
  return Array.from(seen.entries())
    .filter(([, s]) => s.units.size >= Math.max(2, Math.ceil(units.length * minShare)))
    .sort((a, b) => a[1].pos / a[1].n - b[1].pos / b[1].n)
    .map(([key, s]) => ({ key, units: s.units.size, example: s.example }))
}

/** Days a part takes under a recipe: what the recipe says, else one day. 0 means skipped. */
export const partDays = (recipe: Recipe | undefined, key: string) => {
  const n = recipe?.parts?.[key]
  return typeof n === 'number' && n >= 0 ? Math.min(3, Math.floor(n)) : 1
}

export interface LessonSlot<L> { lesson: L; part: string; n: number; of: number }

/** A unit's lessons as the class teaches them: skipped parts left out, a part over two days twice ("1 of 2", "2 of 2"). */
export function lessonSlots<L extends Pick<CurriculumLesson, 'title' | 'sort_order'>>(unitLessons: L[], recipe: Recipe | undefined): LessonSlot<L>[] {
  const out: LessonSlot<L>[] = []
  for (const lesson of [...unitLessons].sort((a, b) => a.sort_order - b.sort_order)) {
    const part = partOf(lesson.title)
    const of = partDays(recipe, part)
    for (let n = 1; n <= of; n++) out.push({ lesson, part, n, of })
  }
  return out
}

/** Class days a typical unit of these takes under the recipe: the median over the units that have lessons. */
export function typicalUnitDays(units: Pick<CurriculumUnit, 'id'>[], lessons: Pick<CurriculumLesson, 'unit_id' | 'title' | 'sort_order'>[], recipe: Recipe | undefined): number {
  const counts = units.map(u => lessonSlots(lessons.filter(l => l.unit_id === u.id), recipe).length).filter(n => n > 0).sort((a, b) => a - b)
  if (!counts.length) return 0
  return counts[Math.floor(counts.length / 2)]
}

/** Teaching weeks for that many class days at `perWeek` days a week, to a tenth; null with no usual days. */
export const weeksFor = (days: number, perWeek: number) => perWeek > 0 ? Math.round((days / perWeek) * 10) / 10 : null

/** The recipe with one part set; 1 day (the book's way) is dropped so the recipe only names what differs. */
export function withPart(recipe: Recipe | undefined, key: string, days: number): Recipe {
  const parts = { ...(recipe?.parts || {}) }
  if (days === 1) delete parts[key]; else parts[key] = Math.max(0, Math.min(3, days))
  return { parts }
}

/** Reads a row from the database, tolerating missing or malformed JSON. */
export function readSetup(row: Record<string, unknown>): ClassSetup {
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})
  const days: Record<string, number[]> = {}
  for (const [k, v] of Object.entries(obj(row.days))) if (Array.isArray(v)) days[k] = v.filter(n => Number.isInteger(n) && n >= 0 && n <= 4) as number[]
  const recipes: Record<string, Recipe> = {}
  for (const [k, v] of Object.entries(obj(row.recipes))) {
    const parts: Record<string, number> = {}
    for (const [p, n] of Object.entries(obj(obj(v).parts))) if (typeof n === 'number') parts[p] = n
    recipes[k] = { parts }
  }
  const standing = (Array.isArray(row.standing) ? row.standing : []).filter((s): s is StandingItem => !!s && typeof s.title === 'string' && Number.isInteger(s.weekday))
  return { english_class: String(row.english_class || ''), grade: Number(row.grade) || 0, days, recipes, standing, updated_at: (row.updated_at as string) || null }
}
