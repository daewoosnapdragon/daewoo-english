'use client'

import { useMemo } from 'react'
import { useApp } from '@/lib/context'
import { yearFor } from '@/lib/curriculumPacing'
import { splitUnitTitle } from '@/lib/curriculumCore'
import { classBooks, type ClassBook } from '@/lib/planLinks'
import { usePlanner } from '@/components/curriculum-planner/usePlanner'

/**
 * The class and grade's books for the month on screen, from the school plan,
 * with units, lessons and files: what a day's row can be linked to. Empty
 * while loading, or when the curriculum tables are not set up.
 */
export function useClassBooks(cls: string, grade: number, monthFirst: string, monthLast: string): { books: ClassBook[]; unitName: (unitId: string) => string | undefined } {
  const { semesters } = useApp()
  const p = usePlanner(true)
  const year = useMemo(() => yearFor(semesters, monthFirst, monthLast), [semesters, monthFirst, monthLast])
  const books = useMemo(() => p.missing ? [] : classBooks({
    cls, grade, year, monthFirst, monthLast, semesters,
    placements: p.placements, pacing: p.pacing, series: p.series, books: p.books, units: p.units, lessons: p.lessons, resources: p.resources,
  }), [p.missing, cls, grade, year, monthFirst, monthLast, semesters, p.placements, p.pacing, p.series, p.books, p.units, p.lessons, p.resources])
  // Any unit in the catalogue, not only this month's books, so a row linked to last term's book keeps its link while it names it.
  const names = useMemo(() => new Map(p.units.map(u => [u.id, splitUnitTitle(u.title).name])), [p.units])
  return { books, unitName: (id: string) => names.get(id) }
}
