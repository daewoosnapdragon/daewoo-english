// ─── What a class has been taught this semester ──────────────────
// The comment builder puts the sentences for skills a class has actually
// covered first. Nobody has to tag anything for that: the first source is
// the lesson plans, which every teacher writes, through the units they
// link and the objective banks those units carry (CCSS codes). Assessment
// tags and the Standards page's statuses sharpen it where they exist, and
// a teacher can tick or untick a skill in the builder; those picks are
// remembered per class and semester. Pure merge here; the loader below
// does the queries.

import { familyOf } from '@/components/curriculum/standards-plain'

export type SkillSource = 'plans' | 'assessed' | 'standards' | 'teacher'

export interface TaughtInput {
  /** CCSS codes from the objective banks of units linked in lesson plans or marked done. */
  planCodes: string[]
  /** CCSS codes tagged on assessments and their question maps this semester. */
  assessedCodes: string[]
  /** Standards given a status on the Standards page for this class. */
  statusCodes: string[]
  /** The teacher's own ticks and unticks in the builder. */
  picks: { add: string[]; remove: string[] }
}

export interface TaughtSkills {
  /** Skill families, e.g. "RL.2", counted as taught. */
  families: Set<string>
  /** Where each family came from; a teacher's add wins, so it reads "teacher". */
  source: Record<string, SkillSource>
}

const fam = (code: string) => familyOf(String(code || '').trim().toUpperCase())

export function taughtSkills(i: TaughtInput): TaughtSkills {
  const source: Record<string, SkillSource> = {}
  const put = (codes: string[], s: SkillSource) => { for (const c of codes) { const f = fam(c); if (/^[A-Z]+\.\d+$/.test(f)) source[f] = s } }
  put(i.planCodes, 'plans')
  put(i.statusCodes, 'standards')
  put(i.assessedCodes, 'assessed')
  put(i.picks.add, 'teacher')
  for (const c of i.picks.remove) delete source[fam(c)]
  return { families: new Set(Object.keys(source)), source }
}

/** The unit ids a month of lesson plans links to, read from the saved day content. */
export function unitIdsFromPlanRows(rows: Array<{ content: any }>): string[] {
  const out = new Set<string>()
  for (const r of rows) {
    let c = r.content
    if (typeof c === 'string') { try { c = JSON.parse(c) } catch { continue } }
    for (const s of c?.subjects || []) if (s?.unit_id) out.add(String(s.unit_id))
  }
  return Array.from(out)
}

/** Codes from an assessment's tags and its question map, rubric criteria included. */
export function codesFromAssessments(assessments: Array<{ standards?: Array<{ code: string }> | null; question_map?: Array<{ standard?: string; rubric?: { criteria: Array<{ standard?: string }> } | null }> | null }>): string[] {
  const out: string[] = []
  for (const a of assessments) {
    for (const s of a.standards || []) if (s?.code) out.push(s.code)
    for (const q of a.question_map || []) {
      if (q.standard) out.push(q.standard)
      for (const c of q.rubric?.criteria || []) if (c.standard) out.push(c.standard)
    }
  }
  return out
}

/** The app_settings key the builder's ticks live under. */
export const picksKey = (cls: string, grade: number, semesterId: string) => `taught_skills:${cls}:${grade}:${semesterId}`

export function parsePicks(value: string | null | undefined): { add: string[]; remove: string[] } {
  try {
    const v = value ? JSON.parse(value) : null
    return { add: Array.isArray(v?.add) ? v.add.map(String) : [], remove: Array.isArray(v?.remove) ? v.remove.map(String) : [] }
  } catch { return { add: [], remove: [] } }
}

/** A tick on a family not already taught adds it; a tick on a taught one removes it. */
export function togglePick(picks: { add: string[]; remove: string[] }, family: string, taughtNow: boolean): { add: string[]; remove: string[] } {
  const add = picks.add.filter(f => f !== family), remove = picks.remove.filter(f => f !== family)
  return taughtNow ? { add, remove: [...remove, family] } : { add: [...add, family], remove }
}
