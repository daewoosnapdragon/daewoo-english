'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { teacherForClass } from '@/lib/classTeacher'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { BOOK_COLORS, bookName, splitUnitTitle, type CurriculumLesson, type CurriculumResource } from '@/lib/curriculumCore'
import { getKSTDateString } from '@/lib/utils'
import { HALVES, academicYears, boardLanes, holidayWeeks, teachingToColumns, termDates, yearWeeks } from '@/lib/curriculumPacing'
import { unitsInWeek } from '@/lib/curriculumWeek'
import { linkedDays, planFollower, type PlanDay, type RunningUnit } from '@/lib/lessonSync'
import { fetchPlanDays } from '@/lib/lessonSyncData'
import type { TrayBook } from '@/lib/lessonTray'
import { usePlanner } from '@/components/curriculum-planner/usePlanner'

// ─── What the class board says, for the Lesson Plans page ────────
// For one class and grade: the units the board has running in each week,
// drawn the way the board draws them (the teacher's own plan, holiday
// weeks, and the units the lesson plans already name). The month on screen
// counts as it is typed, so linking a row moves the board at once.

export interface LessonSync {
  on: boolean; ready: boolean
  runningAt: (monday: string) => RunningUnit[]
  unitOrder: Map<string, string[]>
  lessonsOf: (unitId: string) => CurriculumLesson[]
  units: { id: string; title: string }[]
  lessons: CurriculumLesson[]
  /** Every plan day of the year this class and grade has, this month as it stands on screen. */
  planDays: Record<string, PlanDay>
  /** The books this class and grade have on the board this year, for the lesson tray. */
  books: TrayBook[]
  /** Unit → the Mondays the board first and last has it running. */
  unitWeeks: Map<string, { first: string; last: string }>
  /** Days with no class this year (days off and trips on the school calendar), and the year's last day. */
  away: Set<string>
  yearEnd: string
  /** Book id → the other classes and grades with that book on their board, and the unit each has running this week. */
  othersOnBook: Record<string, { cls: string; grade: number; unit: string }[]>
  resources: CurriculumResource[]
  refresh: () => void
}

export function useLessonSync({ enabled, cls, grade, monthFirst, monthLast, dayData }: { enabled: boolean; cls: string; grade: number; monthFirst: string; monthLast: string; dayData: Record<string, PlanDay> }): LessonSync {
  const { semesters } = useApp()
  const { teachers } = useTeachers()
  const p = usePlanner(enabled)
  // The academic year the month is in, by its term dates.
  const year = useMemo(() => academicYears(semesters).find(y => HALVES.some(h => { const t = termDates(semesters, y, h); return !!t.start && !!t.end && monthLast >= t.start && monthFirst <= t.end })) || '', [semesters, monthFirst, monthLast])
  const yw = useMemo(() => yearWeeks(semesters, year), [semesters, year])
  const range = useMemo(() => { const s = termDates(semesters, year, 'spring'), f = termDates(semesters, year, 'fall'); return { from: s.start || f.start, to: f.end || s.end } }, [semesters, year])
  const [away, setAway] = useState<AwayDay[]>([])
  const [others, setOthers] = useState<Record<string, PlanDay>>({})
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])
  useEffect(() => {
    if (!enabled || !range.from || !range.to) { setAway([]); setOthers({}); return }
    let on = true
    Promise.all([loadAwayDays(range.from, range.to, grade), fetchPlanDays(cls, grade, range.from, range.to)]).then(([a, d]) => { if (on) { setAway(a); setOthers(d.days) } })
    return () => { on = false }
  }, [enabled, cls, grade, range.from, range.to, tick])

  const computed = useMemo(() => {
    const byMonday = new Map<string, RunningUnit[]>()
    const unitOrder = new Map<string, string[]>()
    const unitWeeks = new Map<string, { first: string; last: string }>()
    const books: TrayBook[] = []
    const othersOnBook: Record<string, { cls: string; grade: number; unit: string }[]> = {}
    if (!enabled || !year) return { byMonday, unitOrder, days: {} as Record<string, PlanDay>, unitWeeks, books, othersOnBook }
    // The rest of the term from the database, this month as it stands on screen.
    const days: Record<string, PlanDay> = {}
    for (const [d, v] of Object.entries(others)) if (d < monthFirst || d > monthLast) days[d] = v
    Object.assign(days, dayData)
    const linked = linkedDays(days)
    const teacherId = teacherForClass(teachers, cls)?.id || null
    const placements = p.placements.filter(x => x.english_class === cls && x.grade === grade && x.academic_year === year && x.is_master)
    for (const pl of placements) {
      const bk = p.books.find(b => b.id === pl.book_id); const se = bk && p.series.find(x => x.id === bk.series_id)
      if (bk && se && !books.some(b => b.placement_id === pl.id)) books.push({ placement_id: pl.id, book_id: bk.id, series_id: se.id, label: se.name, level: bk.level_number, color: BOOK_COLORS[se.color]?.hex || '#6B655B' })
    }
    const hs = holidayWeeks(away, yw.spring), hf = holidayWeeks(away, yw.fall)
    const hc = { spring: hs.size, fall: hf.size }
    const follow = teacherId && linked.length ? planFollower(linked, yw, new Set(hs.keys()), new Set(hf.keys())) : undefined
    for (const half of HALVES) {
      if (!yw[half].length) continue
      const lanes = boardLanes(placements, p.pacing, p.units, p.books, p.series, half, yw, teacherId, hc, follow)
      const bars = teachingToColumns(lanes.flatMap(l => l.bars), new Set((half === 'spring' ? hs : hf).keys()), yw[half].length).sort((a, b) => a.viewStart - b.viewStart)
      for (const b of bars) { const o = unitOrder.get(b.placement.id) || []; if (!o.includes(b.unit.id)) o.push(b.unit.id); unitOrder.set(b.placement.id, o) }
      for (const w of yw[half]) {
        for (const b of unitsInWeek(bars, w.n)) { const uw = unitWeeks.get(b.unit.id); if (!uw) unitWeeks.set(b.unit.id, { first: w.monday, last: w.monday }); else { if (w.monday < uw.first) uw.first = w.monday; if (w.monday > uw.last) uw.last = w.monday } }
        byMonday.set(w.monday, unitsInWeek(bars, w.n).map(b => ({
          placement_id: b.placement.id, unit_id: b.unit.id, label: b.series?.name || bookName(b.book, b.series), name: splitUnitTitle(b.unit.title).name,
          level: b.book.level_number, color: b.color, weekOf: w.n - Math.floor(b.viewStart) + 1, weeks: Math.ceil(b.viewEnd) - Math.floor(b.viewStart) + 1,
        })))
      }
    }
    // Other classes (and this class's other grades) with the same books: the unit each board has running this week.
    const t = new Date(getKSTDateString() + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
    const thisMonday = t.toISOString().slice(0, 10)
    const ours = new Set(books.map(b => b.book_id))
    const theirs = p.placements.filter(x => x.academic_year === year && x.is_master && ours.has(x.book_id) && !(x.english_class === cls && x.grade === grade))
    for (const half of HALVES) {
      const w = yw[half].find(x => x.monday === thisMonday)
      if (!w) continue
      for (const pl of theirs) {
        const lanes = boardLanes([pl], p.pacing, p.units, p.books, p.series, half, yw, teacherForClass(teachers, pl.english_class)?.id || null, hc)
        const bars = teachingToColumns(lanes.flatMap(l => l.bars), new Set((half === 'spring' ? hs : hf).keys()), yw[half].length)
        const now = unitsInWeek(bars, w.n)[0]
        if (now) (othersOnBook[pl.book_id] ||= []).push({ cls: pl.english_class, grade: pl.grade, unit: splitUnitTitle(now.unit.title).name })
      }
    }
    return { byMonday, unitOrder, days, unitWeeks, books, othersOnBook }
  }, [enabled, year, others, dayData, monthFirst, monthLast, teachers, cls, grade, p.placements, p.pacing, p.units, p.books, p.series, away, yw])

  const awaySet = useMemo(() => new Set(away.map(a => a.date)), [away])
  const lessonsOf = useCallback((unitId: string) => p.lessons.filter(l => l.unit_id === unitId).sort((a, b) => a.sort_order - b.sort_order), [p.lessons])
  const runningAt = useCallback((monday: string) => computed.byMonday.get(monday) || [], [computed])
  return { on: enabled, ready: enabled && !p.loading && !p.missing, runningAt, unitOrder: computed.unitOrder, lessonsOf, units: p.units, lessons: p.lessons, planDays: computed.days, books: computed.books, unitWeeks: computed.unitWeeks, away: awaySet, yearEnd: range.to || '', othersOnBook: computed.othersOnBook, resources: p.resources, refresh }
}
