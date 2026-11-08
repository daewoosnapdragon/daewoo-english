'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchCatalogue, type Catalogue } from '@/lib/curriculumData'
import { fetchPlacements } from '@/lib/curriculumPlacementsData'
import { isCurriculumMissing } from '@/lib/curriculumCore'
import { isPlacementsMissing, type CurriculumPacing, type CurriculumPlacement, type UnitDone } from '@/lib/curriculumPacing'

// ─── Everything the planner pages read ───────────────────────────
// The catalogue (series, books, units, lessons, resources, skills) and the
// class plans (placements, their unit rows, Done ticks), loaded once and
// reloaded after a save. `missing` names the migration that has not been
// run yet, if any.

export interface Planner extends Catalogue { placements: CurriculumPlacement[]; pacing: CurriculumPacing[]; done: UnitDone[]; loading: boolean; missing: 'catalogue' | 'placements' | null; reload: () => Promise<void> }

const EMPTY: Catalogue = { series: [], books: [], units: [], lessons: [], resources: [], skills: [], objectives: [] }

/** `enabled` false loads nothing, for a page that only needs the planner for some viewers. */
export function usePlanner(enabled = true): Planner {
  const [cat, setCat] = useState<Catalogue>(EMPTY)
  const [placements, setPlacements] = useState<CurriculumPlacement[]>([])
  const [pacing, setPacing] = useState<CurriculumPacing[]>([])
  const [done, setDone] = useState<UnitDone[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState<'catalogue' | 'placements' | null>(null)
  const reload = useCallback(async () => {
    const [c, p] = await Promise.all([fetchCatalogue(), fetchPlacements()])
    if (c.error && isCurriculumMissing(c.error)) { setMissing('catalogue'); setLoading(false); return }
    setCat(c.data)
    if (p.error && isPlacementsMissing(p.error)) { setMissing('placements'); setLoading(false); return }
    setPlacements(p.placements); setPacing(p.pacing); setDone(p.done); setMissing(null); setLoading(false)
  }, [])
  useEffect(() => { if (enabled) reload(); else setLoading(false) }, [reload, enabled])
  return { ...cat, placements, pacing, done, loading, missing, reload }
}
