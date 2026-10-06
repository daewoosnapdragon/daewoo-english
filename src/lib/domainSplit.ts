import type { QuestionMapItem, ItemResponse } from '@/types'
import type { WeightedGradeInput, AssessmentType } from '@/lib/utils'

// ─── Mixed assessments: points routed to domains by standard ─────
// A mixed assessment has questions tagged with standards from several
// domains. Each question's points go to the domain its standard implies
// (RL/RI → reading, RF → phonics, W → writing, SL → speaking, L → language);
// untagged questions go to the assessment's own domain. A rubric item's
// criteria route one by one. The split of possible points is stored on the
// assessment (domain_split) and each student's earned points per domain on
// the grade row (domain_scores), so every domain average can treat a mixed
// assessment as one small assessment per domain.

export const DOMAIN_FOR_PREFIX: Record<string, string> = { RL: 'reading', RI: 'reading', RF: 'phonics', W: 'writing', SL: 'speaking', L: 'language' }

export function domainForStandard(code: string | undefined | null, fallback: string): string {
  if (!code) return fallback
  const m = /^([A-Z]+)\./.exec(code.trim().toUpperCase())
  return (m && DOMAIN_FOR_PREFIX[m[1]]) || fallback
}

/** Possible points per domain for a question map. */
export function splitPossible(map: QuestionMapItem[], defaultDomain: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const q of map) {
    if (q.type === 'rubric' && q.rubric?.criteria?.length) {
      for (const c of q.rubric.criteria) { const d = domainForStandard(c.standard, domainForStandard(q.standard, defaultDomain)); out[d] = (out[d] || 0) + 4 }
    } else {
      const d = domainForStandard(q.standard, defaultDomain)
      out[d] = (out[d] || 0) + (Number(q.max_points) || 0)
    }
  }
  return out
}

/** Earned points per domain for one student's item responses. */
export function splitEarned(map: QuestionMapItem[], responses: ItemResponse[], defaultDomain: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const q of map) {
    const r = responses.find(x => x.q === q.num)
    if (!r) continue
    if (q.type === 'rubric' && q.rubric?.criteria?.length && r.levels) {
      for (const c of q.rubric.criteria) {
        const lv = r.levels[c.key]; if (lv == null) continue
        const d = domainForStandard(c.standard, domainForStandard(q.standard, defaultDomain))
        out[d] = (out[d] || 0) + Number(lv)
      }
    } else {
      const d = domainForStandard(q.standard, defaultDomain)
      out[d] = (out[d] || 0) + (Number(r.points) || 0)
    }
  }
  return out
}

/** True when more than one domain gets points. */
export function isMultiDomain(split: Record<string, number>): boolean {
  return Object.values(split).filter(v => v > 0).length > 1
}

/**
 * The routing columns an assessment should carry for its question map.
 * Routing is automatic: tagging a question with a standard from another
 * domain is the whole instruction. No map (or a map that stays inside the
 * assessment's own domain) means no routing, so the columns are cleared
 * rather than left stale from an earlier version of the paper.
 */
export function routingFor(map: QuestionMapItem[] | null | undefined, domain: string): { mixed: boolean; domain_split: Record<string, number> | null } {
  if (!map || map.length === 0) return { mixed: false, domain_split: null }
  const split = splitPossible(map, domain)
  return isMultiDomain(split) ? { mixed: true, domain_split: split } : { mixed: false, domain_split: null }
}

const TYPES = ['formative', 'summative', 'performance_task']
const typeOf = (a: any): AssessmentType => (TYPES.includes(a?.type) ? a.type : 'formative')

/**
 * The weighted items one domain gets from a set of assessments, one grade row
 * per assessment. Plain assessments contribute their whole score in their own
 * domain; mixed ones contribute their earned points over the possible points
 * for that domain. A mixed row saved without item detail (the plain score
 * list) is split in proportion to the possible points.
 */
export function itemsForDomain(domain: string, assessments: any[], gradeFor: (a: any) => any): WeightedGradeInput[] {
  const items: WeightedGradeInput[] = []
  for (const a of assessments) {
    const g = gradeFor(a)
    if (!g || g.is_exempt || g.is_absent) continue
    const split: Record<string, number> | null = a.mixed && a.domain_split ? a.domain_split : null
    if (!split) {
      if (a.domain !== domain || g.score == null || !(a.max_score > 0)) continue
      items.push({ score: Number(g.score), maxScore: Number(a.max_score), assessmentType: typeOf(a) })
      continue
    }
    const possible = Number(split[domain] || 0)
    if (possible <= 0) continue
    let earned: number | null = g.domain_scores?.[domain] != null ? Number(g.domain_scores[domain]) : null
    if (earned == null) {
      if (g.score == null || !(a.max_score > 0)) continue
      earned = Number(g.score) * (possible / Number(a.max_score))
    }
    items.push({ score: earned, maxScore: possible, assessmentType: typeOf(a) })
  }
  return items
}

/** Whether an assessment puts any points in a domain. */
export function touchesDomain(a: any, domain: string): boolean {
  if (a?.mixed && a.domain_split) return Number(a.domain_split[domain] || 0) > 0
  return a?.domain === domain
}
