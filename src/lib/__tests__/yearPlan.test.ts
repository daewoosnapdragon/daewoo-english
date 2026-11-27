import { describe, it, expect } from 'vitest'
import { changedWeeks, columnOfTeaching, moveBoundary, nextBook, spreadEvenly, teachingAtColumn } from '../yearPlan'
import type { CurriculumBook } from '../curriculumCore'

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

describe('stretching a book', () => {
  it('shares the new length evenly in half weeks and keeps the total', () => {
    expect(spreadEvenly(36, 12)).toEqual(Array(12).fill(3))
    const w = spreadEvenly(30, 12)
    expect(sum(w)).toBe(30)
    expect(w.every(x => x === 2.5)).toBe(true)
    const odd = spreadEvenly(31, 12)
    expect(sum(odd)).toBe(31)
    expect(odd.every(x => x === 2.5 || x === 3)).toBe(true)
  })
  it('never gives a unit less than half a week', () => {
    expect(spreadEvenly(2, 12)).toEqual(Array(12).fill(0.5))
    expect(spreadEvenly(-4, 3)).toEqual([0.5, 0.5, 0.5])
  })
  it('rounds the length to the half week', () => {
    expect(sum(spreadEvenly(10.3, 4))).toBe(10.5)
  })
  it('has nothing to share among no units', () => {
    expect(spreadEvenly(10, 0)).toEqual([])
  })
})

describe('moving the line between two units', () => {
  it('gives one unit what the other loses', () => {
    expect(moveBoundary([2, 2, 2], 0, 1)).toEqual([3, 1, 2])
    expect(moveBoundary([2, 2, 2], 1, -0.5)).toEqual([2, 1.5, 2.5])
  })
  it('stops at half a week either side', () => {
    expect(moveBoundary([2, 2, 2], 0, 5)).toEqual([3.5, 0.5, 2])
    expect(moveBoundary([2, 2, 2], 0, -5)).toEqual([0.5, 3.5, 2])
  })
  it('moves in half weeks', () => {
    expect(moveBoundary([2, 2], 0, 0.3)).toEqual([2.5, 1.5])
  })
  it('ignores a line that is not there', () => {
    expect(moveBoundary([2, 2], 1, 1)).toEqual([2, 2])
  })
})

describe('pointer to teaching weeks', () => {
  const none = new Set<number>()
  it('counts columns as weeks when there are no holidays', () => {
    expect(teachingAtColumn(0, none, 10)).toBe(0)
    expect(teachingAtColumn(3.5, none, 10)).toBe(3.5)
    expect(teachingAtColumn(12, none, 10)).toBe(10)
    expect(teachingAtColumn(-2, none, 10)).toBe(0)
  })
  it('skips holiday columns', () => {
    const hol = new Set([2])
    expect(teachingAtColumn(1, hol, 10)).toBe(1)
    expect(teachingAtColumn(1.5, hol, 10)).toBe(1)   // inside the holiday column
    expect(teachingAtColumn(3, hol, 10)).toBe(2)
    expect(teachingAtColumn(3.5, hol, 10)).toBe(2.5)
  })
  it('finds the column a teaching week ends in', () => {
    const hol = new Set([2])
    expect(columnOfTeaching(1, hol, 10)).toBe(1)
    expect(columnOfTeaching(2, hol, 10)).toBe(3)
    expect(columnOfTeaching(2.5, hol, 10)).toBe(4)
    expect(columnOfTeaching(0.5, none, 10)).toBe(1)
    expect(columnOfTeaching(12, none, 10)).toBe(12)  // past the view: counted on
  })
})

describe('what a drag changes', () => {
  it('lists only the rows whose weeks moved', () => {
    const rows = [{ id: 'a', sort_order: 1, weeks: 2 }, { id: 'b', sort_order: 2, weeks: 2 }, { id: 'c', sort_order: 3, weeks: 2 }]
    expect(changedWeeks(rows, [2, 3, 1])).toEqual([{ id: 'b', weeks: 3 }, { id: 'c', weeks: 1 }])
    expect(changedWeeks(rows, [2, 2, 2])).toEqual([])
  })
  it('goes by sort order, not array order', () => {
    const rows = [{ id: 'b', sort_order: 2, weeks: 2 }, { id: 'a', sort_order: 1, weeks: 2 }]
    expect(changedWeeks(rows, [3, 2])).toEqual([{ id: 'a', weeks: 3 }])
  })
})

describe('the next book', () => {
  const b = (id: string, series_id: string, level_number: string, status: 'confirmed' | 'retired' = 'confirmed'): CurriculumBook =>
    ({ id, series_id, level_number, title: '', status, drive_folder_url: '', notes: '', created_at: '', updated_at: '' })
  const books = [b('sp3', 'sp', '3'), b('sp10', 'sp', '10'), b('sp2', 'sp', '2'), b('sp4', 'sp', '4', 'retired'), b('hih1', 'hih', '1')]
  it('is the next level in the same series, in number order', () => {
    expect(nextBook(books[2], books)?.id).toBe('sp3')
    expect(nextBook(books[0], books)?.id).toBe('sp10')   // 4 is retired
  })
  it('is nothing after the last level', () => {
    expect(nextBook(books[1], books)).toBeUndefined()
    expect(nextBook(books[4], books)).toBeUndefined()
  })
})

// ─── Meeting mode helpers ───
import { fillYearWeeks, lastYearFor, levelTestDates, moduleGroups, suggestBook, unitAt } from '../yearPlan'
import type { CurriculumPlacement } from '../curriculumPacing'

const pl = (id: string, book_id: string, english_class: string, grade: number, academic_year: string, term: 'spring' | 'fall' | 'year', is_master = true): CurriculumPlacement =>
  ({ id, book_id, english_class, grade, academic_year, term, is_master, aim_date: null, created_by: null, created_at: '', updated_at: '' })
const bk = (id: string, series_id: string, level_number: string): CurriculumBook =>
  ({ id, series_id, level_number, title: '', status: 'confirmed', drive_folder_url: '', notes: '', created_at: '', updated_at: '' })

describe('what the class used last year', () => {
  const pls = [
    pl('a', 'rrb1p', 'Daisy', 2, '2026', 'fall'), pl('b', 'rrb1', 'Daisy', 2, '2026', 'spring'),
    pl('c', 'sp3', 'Daisy', 1, '2026', 'year'), pl('d', 'rrb3', 'Daisy', 3, '2026', 'fall'),
    pl('e', 'rrb2', 'Lily', 2, '2026', 'fall'), pl('f', 'rrb2', 'Daisy', 2, '2025', 'fall'), pl('g', 'x', 'Daisy', 2, '2026', 'fall', false),
  ]
  const all = () => true
  it('looks one grade lower in the same class for G2 to G5, spring before year before fall', () => {
    const r = lastYearFor(pls, 'Daisy', 3, '2026', all)
    expect(r.grade).toBe(2)
    expect(r.placements.map(p => p.id)).toEqual(['b', 'a'])
  })
  it('looks at last year’s grade 1 for a new grade 1', () => {
    const r = lastYearFor(pls, 'Daisy', 1, '2026', all)
    expect(r.grade).toBe(1)
    expect(r.placements.map(p => p.id)).toEqual(['c'])
  })
  it('keeps only the strand asked for', () => {
    expect(lastYearFor(pls, 'Daisy', 3, '2026', p => p.book_id === 'rrb1').placements.map(p => p.id)).toEqual(['b'])
  })
  it('has nothing without a previous year', () => {
    expect(lastYearFor(pls, 'Daisy', 3, '', all).placements).toEqual([])
  })
})

describe('the suggestion', () => {
  const books = [bk('rrb1', 'rr', 'Basic 1'), bk('rrb2', 'rr', 'Basic 2'), bk('sp3', 'sp', '3'), bk('sp4', 'sp', '4')]
  it('is the next level after the latest book of the grade below', () => {
    expect(suggestBook(3, [pl('b', 'rrb1', 'Daisy', 2, '2026', 'spring'), pl('x', 'sp3', 'Daisy', 2, '2026', 'fall')], books)?.id).toBe('sp4')
    expect(suggestBook(3, [pl('x', 'sp3', 'Daisy', 2, '2026', 'fall'), pl('y', 'rrb1', 'Daisy', 2, '2026', 'year')], books)?.id).toBe('sp4')
  })
  it('is the same book for a new grade 1', () => {
    expect(suggestBook(1, [pl('c', 'sp3', 'Daisy', 1, '2026', 'year')], books)?.id).toBe('sp3')
  })
  it('is nothing after the last level or with nothing last year', () => {
    expect(suggestBook(2, [pl('c', 'sp4', 'Daisy', 1, '2026', 'year')], books)).toBeUndefined()
    expect(suggestBook(2, [], books)).toBeUndefined()
  })
})

describe('the year’s weeks, real or assumed', () => {
  const springOnly = [
    { academic_year: '2027-2028', type: 'spring_mid', start_date: '2027-03-02', end_date: '2027-04-30' },
    { academic_year: '2027-2028', type: 'spring_final', start_date: '2027-05-03', end_date: '2027-07-16' },
  ]
  it('keeps real spring weeks and assumes 18 fall weeks from the fourth Monday of August', () => {
    const r = fillYearWeeks(springOnly, '2027-2028')
    expect(r.assumed).toEqual({ spring: false, fall: true })
    expect(r.yw.spring[0].monday).toBe('2027-03-01')
    expect(r.yw.fall[0].monday).toBe('2027-08-23')
    expect(r.yw.fall).toHaveLength(18)
  })
  it('assumes both halves when the year has no dates', () => {
    const r = fillYearWeeks([], '2027-2028')
    expect(r.assumed).toEqual({ spring: true, fall: true })
    expect(r.yw.spring[0].monday).toBe('2027-03-01')
    expect(r.yw.spring).toHaveLength(20)
    expect(r.yw.fall).toHaveLength(18)
  })
})

describe('level tests', () => {
  it('are the end dates of the grading periods, in date order, labelled', () => {
    const sems = [
      { academic_year: '2027', type: 'fall_mid', start_date: '2027-08-23', end_date: '2027-10-15' },
      { academic_year: '2027', type: 'spring_mid', start_date: '2027-03-02', end_date: '2027-04-30' },
      { academic_year: '2027', type: 'spring_final', start_date: '2027-05-03', end_date: '2027-07-16' },
      { academic_year: '2027', type: 'fall_final', start_date: '2027-10-18', end_date: null },
      { academic_year: '2026', type: 'spring_mid', start_date: '2026-03-02', end_date: '2026-04-30' },
    ]
    expect(levelTestDates(sems, '2027')).toEqual([
      { label: 'Spring midterm', date: '2027-04-30' }, { label: 'Spring final', date: '2027-07-16' }, { label: 'Fall midterm', date: '2027-10-15' },
    ])
  })
})

describe('Into Reading modules', () => {
  it('groups stories of one module and names it from the summary', () => {
    const g = moduleGroups([
      { title: 'M7 W1 · Storm Report', summary: 'Opinion Writing. Module 7 · The Big Outdoors, week 1, paired with Sam & Dave Dig a Hole.' },
      { title: 'M7 W1 · Sam & Dave Dig a Hole', summary: '' },
      { title: 'M7 W2 · Next', summary: '' },
      { title: 'M8 W1 · Other', summary: 'No module name here.' },
      { title: 'Review week', summary: '' },
    ])
    expect(g).toEqual([
      { key: 'M7', label: 'M7 · The Big Outdoors', from: 0, to: 2 },
      { key: 'M8', label: 'M8', from: 3, to: 3 },
      { key: 'Review week', label: 'Review week', from: 4, to: 4 },
    ])
  })
})

describe('the unit at a week', () => {
  it('is the unit running then, nothing before the start, done after the end', () => {
    expect(unitAt([3, 3, 3], 0)).toBeNull()
    expect(unitAt([3, 3, 3], 0.5)).toBe(0)
    expect(unitAt([3, 3, 3], 3)).toBe(0)
    expect(unitAt([3, 3, 3], 3.5)).toBe(1)
    expect(unitAt([3, 3, 3], 10)).toBe('done')
  })
})

// ─── Review fixes ───
import { classKey, teachingAtColumnOpen } from '../yearPlan'

describe('dragging past the last week', () => {
  it('keeps counting weeks beyond the last column', () => {
    const hol = new Set([2])
    expect(teachingAtColumnOpen(10, hol, 10)).toBe(9)
    expect(teachingAtColumnOpen(13.5, hol, 10)).toBe(12.5)
    expect(teachingAtColumnOpen(3.5, hol, 10)).toBe(2.5)
  })
})

describe('the class keys', () => {
  const k = (over: Partial<Parameters<typeof classKey>[0]>) => classKey({ key: 'ArrowRight', alt: false, ctrl: false, meta: false, shift: false, defaultPrevented: false, inField: false, onGrip: false, dialogOpen: false, panelOpen: false, present: false, ...over })
  it('switch class with plain arrows', () => {
    expect(k({})).toBe('next')
    expect(k({ key: 'ArrowLeft' })).toBe('prev')
  })
  it('leave the arrows alone with a modifier (browser Back), when already handled, or in a field, a dialog, a handle or an open form', () => {
    expect(k({ alt: true })).toBeNull()
    expect(k({ meta: true })).toBeNull()
    expect(k({ ctrl: true })).toBeNull()
    expect(k({ shift: true })).toBeNull()
    expect(k({ defaultPrevented: true })).toBeNull()
    expect(k({ inField: true })).toBeNull()
    expect(k({ dialogOpen: true })).toBeNull()
    expect(k({ onGrip: true })).toBeNull()
    expect(k({ panelOpen: true })).toBeNull()
  })
  it('leave Present with Esc, but not from inside a field', () => {
    expect(k({ key: 'Escape', present: true })).toBe('exit')
    expect(k({ key: 'Escape', present: true, inField: true })).toBeNull()
    expect(k({ key: 'Escape', present: false })).toBeNull()
    expect(k({ key: 'a' })).toBeNull()
  })
})
