import { describe, it, expect } from 'vitest'
import { layoutPacing, weekList, type CurriculumPacing } from '../curriculumPacing'
import type { CurriculumUnit } from '../curriculumCore'
import { actualsFor, bookPattern, classDays, daySummary, followPlans, lessonSyncFor, linkedDays, planMoves, pushPlan, readPlanDay, teachingWeekOf, type PlanDay } from '../lessonSync'

const unit = (id: string, title = id): CurriculumUnit => ({ id, book_id: 'b1', sort_order: 0, title, summary: '', skill_tags: [], ccss_codes: [], default_weeks: 2, source: 'claude', confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' })
const row = (id: string, unit_id: string, sort_order: number, weeks: number, extra: Partial<CurriculumPacing> = {}): CurriculumPacing => ({ id, placement_id: 'p1', unit_id, sort_order, weeks, owner: 'master', teacher_id: null, gap_before: 0, fixed: false, done_at: null, created_at: '', updated_at: '', ...extra })
const units = [unit('u1'), unit('u2'), unit('u3'), unit('u4')]
const plan = [row('a', 'u1', 1, 2), row('b', 'u2', 2, 3), row('c', 'u3', 3, 2), row('d', 'u4', 4, 2)]
const spans = (rows: CurriculumPacing[]) => layoutPacing(rows, units).map(b => [b.unit.id, b.start, b.end])
const day = (subjects: PlanDay['subjects'], objective = ''): PlanDay => ({ subjects, objective, notes: '' })

describe('who has it', () => {
  it('is only Snapdragon on its own classes while it is tried out', () => {
    expect(lessonSyncFor('Snapdragon', 'Snapdragon')).toBe(true)
    expect(lessonSyncFor('Snapdragon', 'Lily')).toBe(false)
    expect(lessonSyncFor('Lily', 'Lily')).toBe(false)
  })
})

describe('reading days', () => {
  it('keeps unit and lesson links and finds the linked rows', () => {
    const d = readPlanDay(JSON.stringify({ subjects: [{ label: 'Into Reading', content: 'Chicken', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' }, { label: 'Writing', content: 'Journal' }], objective: 'x' }))
    expect(d.subjects[0]).toEqual({ label: 'Into Reading', content: 'Chicken', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' })
    expect(d.subjects[1]).toEqual({ label: 'Writing', content: 'Journal' })
    expect(linkedDays({ '2026-11-10': d })).toEqual([{ date: '2026-11-10', unit_id: 'u2', lesson_id: 'l1', placement_id: 'p1' }])
  })
})

describe('teachingWeekOf', () => {
  const yw = { spring: weekList('2026-03-02', '2026-07-17'), fall: weekList('2026-08-17', '2027-01-08') }
  it('counts teaching weeks, not holiday weeks', () => {
    expect(teachingWeekOf('2026-08-19', 'fall', yw, new Set(), new Set())).toBe(1)
    expect(teachingWeekOf('2026-10-14', 'fall', yw, new Set(), new Set([7]))).toBe(8)   // week 9, one holiday week before it
    expect(teachingWeekOf('2026-08-19', 'spring', yw, new Set(), new Set())).toBeNull()
    expect(teachingWeekOf('2026-08-19', 'year', yw, new Set([5]), new Set())).toBe(yw.spring.length - 1 + 1)
  })
})

describe('followPlans', () => {
  it('leaves the plan alone when nothing is linked', () => {
    expect(followPlans(plan, new Map())).toBe(plan)
  })
  it('a class behind: the named unit starts where the plans say and the rest follow', () => {
    // u2 was planned for weeks 3–5; the plans first name it in week 5 and again in week 6.
    const out = followPlans(plan, new Map([['u2', { first: 5, last: 6 }]]))
    expect(spans(out)).toEqual([['u1', 1, 2], ['u2', 5, 7], ['u3', 8, 9], ['u4', 10, 11]])
  })
  it('a finished unit ends when the next starts and counts as done', () => {
    const out = followPlans(plan, new Map([['u1', { first: 1, last: 3 }], ['u2', { first: 4, last: 4 }]]))
    expect(spans(out)).toEqual([['u1', 1, 3], ['u2', 4, 6], ['u3', 7, 8], ['u4', 9, 10]])
    expect(out[0].done_at).toBe('lesson-plans')
    expect(out[1].done_at).toBeNull()
  })
  it('a class ahead: earlier unnamed units are squeezed to fit', () => {
    const out = followPlans(plan, new Map([['u3', { first: 3, last: 3 }]]))
    const s = spans(out)
    expect(s[2]).toEqual(['u3', 3, 4])
    expect((s[1][2] as number)).toBeLessThanOrEqual(2)
  })
  it('a unit skipped so far moves after the one being taught', () => {
    const out = followPlans(plan, new Map([['u1', { first: 1, last: 2 }], ['u3', { first: 3, last: 3 }]]))
    expect(spans(out).map(x => x[0])).toEqual(['u1', 'u3', 'u2', 'u4'])
  })
  it('a named unit is never pushed late by earlier units that cannot fit; they move after it', () => {
    const five = [row('a', 'u1', 1, 2), row('b', 'u2', 2, 2), row('c', 'u3', 3, 2), row('d', 'u4', 4, 2)]
    const out = followPlans(five, new Map([['u4', { first: 1, last: 1 }]]))
    const s = spans(out)
    expect(s[0]).toEqual(['u4', 1, 2])
    expect(s.map(x => x[0])).toEqual(['u4', 'u1', 'u2', 'u3'])
  })
  it('two units started the same week share it and later units do not drift', () => {
    const out = followPlans(plan, new Map([['u1', { first: 3, last: 3 }], ['u2', { first: 3, last: 4 }]]))
    const s = spans(out)
    expect(s[1]).toEqual(['u2', 3.5, 5])          // planned 3 weeks from week 3: ends week 5
    expect(s[2]).toEqual(['u3', 6, 7])
    expect(out[0].done_at).toBeNull()             // still taught the week u2 began
  })
  it('works from the actual weeks of dated days', () => {
    const a = actualsFor([{ date: 'd1', unit_id: 'u2', lesson_id: null, placement_id: null }, { date: 'd2', unit_id: 'u2', lesson_id: null, placement_id: null }, { date: 'd3', unit_id: 'zz', lesson_id: null, placement_id: null }], new Set(['u1', 'u2']), d => ({ d1: 4, d2: 6, d3: 1 } as Record<string, number>)[d])
    expect(Array.from(a.entries())).toEqual([['u2', { first: 4, last: 6 }]])
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
