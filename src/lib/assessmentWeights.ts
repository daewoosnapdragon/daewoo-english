import { useEffect, useState } from 'react'
import { DEFAULT_WEIGHTS, type AssessmentType } from '@/lib/utils'

// ─── Assessment weights, one source for every screen ─────────────
// Settings saves the formative / summative / performance-task weights to
// app_settings under 'assessment_weights', keyed "3" for a grade and
// "3-Snapdragon" for a class override. Every domain average in the app
// (gradebook, student views, progress reports, report cards, the semester
// grade sync) resolves its weights through here, so a change in Settings
// moves every number the same way. Loaded once per minute at most; saving
// in Settings clears the cache.

export type WeightTable = Record<string, Record<AssessmentType, number>>

let cache: { at: number; table: WeightTable } | null = null
let inflight: Promise<WeightTable> | null = null
const TTL = 60_000

export async function loadAssessmentWeights(): Promise<WeightTable> {
  if (cache && Date.now() - cache.at < TTL) return cache.table
  if (inflight) return inflight
  inflight = (async () => {
    let table: WeightTable = {}
    try {
      // Loaded lazily so the pure helpers stay importable without a Supabase env (tests).
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'assessment_weights').single()
      if (data?.value) { const parsed = JSON.parse(data.value); if (parsed && typeof parsed === 'object') table = parsed }
    } catch {}
    cache = { at: Date.now(), table }
    inflight = null
    return table
  })()
  return inflight
}

/** Call after Settings saves new weights so the next screen reads them. */
export function invalidateAssessmentWeights() { cache = null }

/** The weights a grade and class actually use: class override, else grade custom, else the grade default. */
export function weightsFor(table: WeightTable | null | undefined, grade: number, englishClass?: string | null): { weights: Record<AssessmentType, number>; source: 'class' | 'grade' | 'default' } {
  if (table && englishClass && table[`${grade}-${englishClass}`]) return { weights: table[`${grade}-${englishClass}`], source: 'class' }
  if (table && table[String(grade)]) return { weights: table[String(grade)], source: 'grade' }
  return { weights: DEFAULT_WEIGHTS[grade] || DEFAULT_WEIGHTS[3], source: 'default' }
}

/** The weight table for components; null until loaded, so callers can wait. */
export function useAssessmentWeights(): WeightTable | null {
  const [table, setTable] = useState<WeightTable | null>(cache && Date.now() - cache.at < TTL ? cache.table : null)
  useEffect(() => { let on = true; loadAssessmentWeights().then(t => { if (on) setTable(t) }); return () => { on = false } }, [])
  return table
}
