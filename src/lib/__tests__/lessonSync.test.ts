import { describe, it, expect } from 'vitest'
import { layoutPacing, weekList, type CurriculumPacing } from '../curriculumPacing'
import type { CurriculumUnit } from '../curriculumCore'
import { bookPattern, classDays, daySummary, linkedDays, planMoves, pushPlan, readPlanDay, type PlanDay } from '../lessonSync'

const unit = (id: string, title = id): CurriculumUnit => ({ id, book_id: 'b1', sort_order: 0, title, summary: '', skill_tags: [], ccss_codes: [], default_weeks: 2, source: 'claude', confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' })
const row = (id: string, unit_id: string, sort_order: number, weeks: number, extra: Partial<CurriculumPacing> = {}): CurriculumPacing => ({ id, placement_id: 'p1', unit_id, sort_order, weeks, owner: 'master', created_at: '', updated_at: '', ...extra })
const units = [unit('u1'), unit('u2'), unit('u3'), unit('u4')]
const plan = [row('a', 'u1', 1, 2), row('b', 'u2', 2, 3), row('c', 'u3', 3, 2), row('d', 'u4', 4, 2)]
const spans = (rows: CurriculumPacing[]) => layoutPacing(rows, units).map(b => [b.unit.id, b.start, b.end])
const day = (subjects: PlanDay['subjects'], objective = ''): PlanDay => ({ subjects, objective, notes: '' })

describe('reading days', () => {
  it('keeps unit and lesson links and finds the linked rows', () => {
    const d = readPlanDay(JSON.stringify({ subjects: [{ label: 'Into Reading', content: 'Chicken', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' }, { label: 'Writing', content: 'Journal' }], objective: 'x' }))
    expect(d.subjects[0]).toEqual({ label: 'Into Reading', content: 'Chicken', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' })
    expect(d.subjects[1]).toEqual({ label: 'Writing', content: 'Journal' })
    expect(linkedDays({ '2026-11-10': d })).toEqual([{ date: '2026-11-10', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' }])
  })
})

describe('bookPattern', () => {
  it('reads the days each book was on', () => {
    const w: (PlanDay | null)[] = [day([{ label: 'IR', content: 'x', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' }, { label: 'Writing', content: 'Journal' }]), null, day([{ label: 'IR', content: 'y', unit_id: 'u2', lesson_id: 'l2', placement_id: 'p1' }]), null, null]
    expect(Array.from(bookPattern(w).entries())).toEqual([['p1', [0, 2]]])
  })
})
describe('pushPlan', () => {
  const T = ['mon', 'tue', 'wed', 'thu', 'fri']
  const D = (t: string) => day([{ label: 'R', content: t }])
  it('pushes every plan one class day later and empties the first', () => {
    const r = pushPlan(T, { mon: D('a'), tue: D('b'), thu: D('d') }, 1)
    expect(r.error).toBeNull()
    expect(r.moved).toBe(3)
    expect(r.changes.mon.subjects).toEqual([])
    expect(r.changes.tue.subjects[0].content).toBe('a')
    expect(r.changes.wed.subjects[0].content).toBe('b')
    expect(r.changes.thu.subjects).toEqual([])
    expect(r.changes.fri.subjects[0].content).toBe('d')
    // a day empty before and after is not written
    expect(Object.keys(pushPlan(['mon', 'tue', 'wed'], { mon: D('a') }, 1).changes).sort()).toEqual(['mon', 'tue'])
  })
  it('pulls the plans back into an empty day', () => {
    const r = pushPlan(T, { tue: D('b'), wed: D('c') }, -1)
    expect(r.changes.mon.subjects[0].content).toBe('b')
    expect(r.changes.tue.subjects[0].content).toBe('c')
    expect(r.changes.wed.subjects).toEqual([])
    expect(pushPlan(T, { mon: D('a') }, -1).error).toBeTruthy()
  })
  it('says so when there is no room or nothing to move', () => {
    expect(pushPlan(T, {}, 1).error).toBeTruthy()
    expect(pushPlan(T, { fri: D('e') }, 1).error).toBeTruthy()
  })
})

describe('classDays', () => {
  it('skips weekends, away days and no-class weekdays, but keeps the first day', () => {
    // 2026-11-11 is a Wednesday and away; Friday has no class for the grade.
    expect(classDays('2026-11-11', '2026-11-17', new Set(['2026-11-11', '2026-11-16']), wd => wd === 5)).toEqual(['2026-11-11', '2026-11-12', '2026-11-17'])
  })
})

describe('planMoves', () => {
  const T = ['mon', 'tue', 'wed', 'thu']
  const D = (t: string) => day([{ label: 'R', content: t }])
  it('lists each planned day and where it goes, for a preview', () => {
    expect(planMoves(T, { mon: D('a'), wed: D('c') }, 1)).toEqual([{ from: 'mon', to: 'tue', summary: 'R: a' }, { from: 'wed', to: 'thu', summary: 'R: c' }])
    expect(planMoves(T, { tue: D('b'), thu: D('d') }, -1)).toEqual([{ from: 'tue', to: 'mon', summary: 'R: b' }, { from: 'thu', to: 'wed', summary: 'R: d' }])
  })
  it('sums a day up in one line', () => {
    expect(daySummary(day([{ label: 'Into Reading', content: 'Chicken — Predict' }, { label: '', content: 'Journal' }]))).toBe('Into Reading: Chicken — Predict · Journal')
  })
})
