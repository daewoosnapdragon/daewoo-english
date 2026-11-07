'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchCatalogue, type Catalogue } from '@/lib/curriculumData'
import { fetchPlacements } from '@/lib/curriculumPlacementsData'
import { isCurriculumMissing } from '@/lib/curriculumCore'
import { isPlacementsMissing, isPlansMissing, type CurriculumBlock, type CurriculumHere, type CurriculumPacing, type CurriculumPlacement, type CurriculumPlanReview } from '@/lib/curriculumPacing'

// ─── Everything the planner pages read ───────────────────────────
// The catalogue (series, books, units, lessons, resources, skills) and the
// placements with their pacing, loaded once and reloaded after a save.
// `missing` names the migration that has not been run yet, if any;
// `plansMissing` means the teacher-plans migration is not run, so the
// board shows the master without the teacher's own tools.

export interface Planner extends Catalogue { placements: CurriculumPlacement[]; pacing: CurriculumPacing[]; blocks: CurriculumBlock[]; here: CurriculumHere[]; reviews: CurriculumPlanReview[]; loading: boolean; missing: 'catalogue' | 'placements' | null; plansMissing: boolean; reload: () => Promise<void> }

const EMPTY: Catalogue = { series: [], books: [], units: [], lessons: [], resources: [], skills: [] }

/** `enabled` false loads nothing, for a page that only needs the planner for some viewers. */
export function usePlanner(enabled = true): Planner {
  const [cat, setCat] = useState<Catalogue>(EMPTY)
  const [placements, setPlacements] = useState<CurriculumPlacement[]>([])
  const [pacing, setPacing] = useState<CurriculumPacing[]>([])
  const [blocks, setBlocks] = useState<CurriculumBlock[]>([])
  const [here, setHere] = useState<CurriculumHere[]>([])
  const [reviews, setReviews] = useState<CurriculumPlanReview[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState<'catalogue' | 'placements' | null>(null)
  const [plansMissing, setPlansMissing] = useState(false)
  const reload = useCallback(async () => {
    const [c, p] = await Promise.all([fetchCatalogue(), fetchPlacements()])
    if (c.error && isCurriculumMissing(c.error)) { setMissing('catalogue'); setLoading(false); return }
    setCat(c.data)
    if (p.error && isPlacementsMissing(p.error)) { setMissing('placements'); setLoading(false); return }
    setPlacements(p.placements); setPacing(p.pacing); setBlocks(p.blocks); setHere(p.here); setReviews(p.reviews)
    setPlansMissing(!!p.plansError && isPlansMissing(p.plansError)); setMissing(null); setLoading(false)
  }, [])
  useEffect(() => { if (enabled) reload(); else setLoading(false) }, [reload, enabled])
  return { ...cat, placements, pacing, blocks, here, reviews, loading, missing, plansMissing, reload }
}
