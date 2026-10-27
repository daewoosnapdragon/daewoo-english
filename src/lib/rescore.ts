import { supabase } from '@/lib/supabase'
import type { QuestionMapItem } from '@/types'
import { remarkResponses } from '@/lib/remark'
import { splitEarned } from '@/lib/domainSplit'
import { isRoutingColumnError } from '@/lib/domainRouting'

// ─── Re-scoring marked papers after the key changes ──────────────
// See remark.ts for the scoring itself; this walks the saved grade rows.

/** Re-score every saved paper of an assessment against its current map. Returns how many rows changed. */
export async function rescoreAfterKeyChange(assessment: { id: string; domain: string; mixed?: boolean | null; question_map?: QuestionMapItem[] | null }): Promise<number> {
  const map = assessment.question_map || []
  if (!map.length) return 0
  const { data, error } = await supabase.from('grades').select('id, score, item_responses, domain_scores, is_absent, is_exempt').eq('assessment_id', assessment.id)
  if (error || !data) return 0
  let changed = 0
  for (const g of data as any[]) {
    if (g.is_absent || g.is_exempt || !Array.isArray(g.item_responses) || !g.item_responses.length) continue
    const item_responses = remarkResponses(map, g.item_responses)
    const score = item_responses.reduce((s, r) => s + (Number(r.points) || 0), 0)
    const domain_scores = assessment.mixed ? splitEarned(map, item_responses, assessment.domain) : null
    if (score === Number(g.score) && JSON.stringify(item_responses) === JSON.stringify(g.item_responses) && JSON.stringify(domain_scores) === JSON.stringify(g.domain_scores ?? null)) continue
    let { error: e } = await supabase.from('grades').update({ score, item_responses, domain_scores }).eq('id', g.id)
    if (e && isRoutingColumnError(e.message)) ({ error: e } = await supabase.from('grades').update({ score, item_responses }).eq('id', g.id))
    if (!e) changed++
  }
  return changed
}
