import type { QuestionMapItem } from '@/types'

// ─── A paper as sections ─────────────────────────────────────────
// The set-up flow describes a paper section by section (multiple choice ×10,
// short answer ×2 worth 5, writing with a rubric) and derives the question
// map from that. Editing goes the other way: an existing map is folded back
// into sections, with per-question overrides for anything a section cannot
// say, so that deriving the map again gives back exactly what was saved.

export type SectionType = 'mc' | 'true_false' | 'short_answer' | 'open_ended' | 'rubric'
export type SectionRubric = NonNullable<QuestionMapItem['rubric']>
export interface Section { id: number; type: SectionType; count: number; points: number; key: string; standard?: string; rubric?: SectionRubric | null }

export const isChoiceType = (t: SectionType) => t === 'mc' || t === 'true_false'
export const lettersOf = (sec: Section) => isChoiceType(sec.type) ? sec.key.toUpperCase().replace(/[^A-E TF]/g, '').replace(/\s/g, '') : ''
export const countOf = (sec: Section) => isChoiceType(sec.type) ? lettersOf(sec).length : Math.max(0, Math.floor(sec.count))
export const defaultPoints = (t: SectionType) => t === 'short_answer' ? 5 : t === 'open_ended' ? 10 : 1

const SECTION_TYPES: SectionType[] = ['mc', 'true_false', 'short_answer', 'open_ended', 'rubric']

export function mapFromSections(sections: Section[], overrides: Record<number, Partial<QuestionMapItem>> = {}): QuestionMapItem[] {
  const out: QuestionMapItem[] = []
  for (const sec of sections) {
    const isChoice = isChoiceType(sec.type)
    const letters = lettersOf(sec)
    const n = countOf(sec)
    for (let i = 0; i < n; i++) {
      const num = out.length + 1
      const base: QuestionMapItem = sec.type === 'rubric' && sec.rubric
        ? { num, type: 'rubric', max_points: sec.rubric.criteria.length * 4, standard: sec.standard, rubric: sec.rubric }
        : { num, type: sec.type, max_points: sec.points, standard: sec.standard, ...(isChoice ? { answer_key: letters[i] } : {}) }
      out.push({ ...base, ...(overrides[num] || {}) })
    }
  }
  return out
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Fold a saved question map back into sections plus the overrides that make the round trip exact. */
export function sectionsFromMap(map: QuestionMapItem[]): { sections: Section[]; overrides: Record<number, Partial<QuestionMapItem>> } {
  const items = [...map].sort((a, b) => a.num - b.num)
  const sections: Section[] = []
  let nextId = 1
  for (const q of items) {
    const type: SectionType = SECTION_TYPES.includes(q.type as SectionType) ? (q.type as SectionType) : 'short_answer'
    const last = sections[sections.length - 1]
    const std = q.standard || undefined
    if (isChoiceType(type)) {
      // A choice item with no key still needs a letter to be counted; the override blanks it again.
      const letter = q.answer_key && /^[A-ET F]$/.test(q.answer_key) ? q.answer_key : 'A'
      if (last && last.type === type && last.points === q.max_points && (last.standard || undefined) === std) last.key += letter
      else sections.push({ id: nextId++, type, count: 0, points: q.max_points, key: letter, standard: std })
    } else if (type === 'rubric') {
      const rubric = q.rubric || null
      if (last && last.type === 'rubric' && same(last.rubric || null, rubric) && (last.standard || undefined) === std && (rubric || last.points === q.max_points)) last.count += 1
      else sections.push({ id: nextId++, type, count: 1, points: q.max_points, key: '', standard: std, rubric })
    } else {
      if (last && last.type === type && last.points === q.max_points && (last.standard || undefined) === std) last.count += 1
      else sections.push({ id: nextId++, type, count: 1, points: q.max_points, key: '', standard: std })
    }
  }
  // Whatever the sections cannot reproduce goes back as a per-question override.
  const regen = mapFromSections(sections)
  const overrides: Record<number, Partial<QuestionMapItem>> = {}
  items.forEach((q, i) => {
    const r = regen[i]
    if (!r) return
    const o: Partial<QuestionMapItem> = {}
    if (r.type !== q.type) o.type = q.type
    if (r.max_points !== q.max_points) o.max_points = q.max_points
    if ((r.standard || undefined) !== (q.standard || undefined)) o.standard = q.standard || undefined
    if ((r.answer_key || undefined) !== (q.answer_key || undefined)) o.answer_key = q.answer_key || undefined
    if (!same(r.rubric || null, q.rubric || null)) o.rubric = q.rubric || null
    if (Object.keys(o).length) overrides[i + 1] = o
  })
  return { sections, overrides }
}
