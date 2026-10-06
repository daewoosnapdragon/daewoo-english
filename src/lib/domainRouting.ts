import { supabase } from '@/lib/supabase'
import { splitEarned } from '@/lib/domainSplit'
import type { QuestionMapItem } from '@/types'

// ─── Keeping grade rows in step with a routed assessment ─────────
// A mixed assessment's grade rows carry domain_scores: the points each
// student earned per domain. They are written as papers are marked, but
// the question map can change afterwards (a standard retagged, routing
// switched on for a paper that was already scored), so after an
// assessment is saved every row that has item detail is recomputed from
// it. Rows entered as one plain total have no item detail and keep the
// proportional fallback.

export async function syncDomainScores(assessment: { id: string; domain: string; mixed?: boolean | null; question_map?: QuestionMapItem[] | null }): Promise<number> {
  const map = assessment.question_map || []
  const { data, error } = await supabase.from('grades').select('id, item_responses, domain_scores').eq('assessment_id', assessment.id)
  if (error || !data) return 0
  let changed = 0
  for (const g of data as any[]) {
    const next = assessment.mixed && Array.isArray(g.item_responses) && g.item_responses.length ? splitEarned(map, g.item_responses, assessment.domain) : null
    if (JSON.stringify(next) === JSON.stringify(g.domain_scores ?? null)) continue
    const { error: e } = await supabase.from('grades').update({ domain_scores: next }).eq('id', g.id)
    if (!e) changed++
  }
  return changed
}

/** True when a Supabase error means supabase/migration-mixed-assessments.sql has not been run. */
export const isRoutingColumnError = (message: string | undefined | null) => !!message && /domain_split|domain_scores|\bmixed\b/.test(message)
