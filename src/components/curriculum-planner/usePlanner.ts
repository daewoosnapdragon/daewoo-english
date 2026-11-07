'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchCatalogue, type Catalogue } from '@/lib/curriculumData'
import { fetchPlacements } from '@/lib/curriculumPlacementsData'
import { isCurriculumMissing } from '@/lib/curriculumCore'
import { isPlacementsMissing, type CurriculumPacing, type CurriculumPlacement } from '@/lib/curriculumPacing'

// ─── Everything the planner pages read ───────────────────────────
// The catalogue (series, books, units, lessons, resources, skills) and the
// placements with their pacing, loaded once and reloaded after a save.
// `missing` names the migration that has not been run yet, if any.

export interface Planner extends Catalogue { placements: CurriculumPlacement[]; pacing: CurriculumPacing[]; loading: boolean; missing: 'catalogue' | 'placements' | null; reload: () => Promise<void> }

const EMPTY: Catalogue = { series: [], books: [], units: [], lessons: [], resources: [], skills: [] }

export function usePlanner(): Planner {
  const [cat, setCat] = useState<Catalogue>(EMPTY)
  const [placements, setPlacements] = useState<CurriculumPlacement[]>([])
  const [pacing, setPacing] = useState<CurriculumPacing[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState<'catalogue' | 'placements' | null>(null)
  const reload = useCallback(async () => {
    const [c, p] = await Promise.all([fetchCatalogue(), fetchPlacements()])
    if (c.error && isCurriculumMissing(c.error)) { setMissing('catalogue'); setLoading(false); return }
    setCat(c.data)
    if (p.error && isPlacementsMissing(p.error)) { setMissing('placements'); setLoading(false); return }
    setPlacements(p.placements); setPacing(p.pacing); setMissing(null); setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])
  return { ...cat, placements, pacing, loading, missing, reload }
}
