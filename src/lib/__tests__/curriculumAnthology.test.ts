import { describe, it, expect } from 'vitest'
import { anthologyProgress, columnToTeaching, fitToTerm, groupByModule, projectAnthology, shareWeeks, termsFor, viewsFor, type CurriculumPacing } from '../curriculumPacing'

const row = (id: string, sort_order: number, extra: Partial<CurriculumPacing> = {}): CurriculumPacing => ({ id, placement_id: 'p1', unit_id: 'u' + id, sort_order, weeks: 2, owner: 'master', teacher_id: null, gap_before: 0, fixed: false, done_at: null, created_at: '', updated_at: '', ...extra })

describe('projectAnthology', () => {
  it('shares the term in whole weeks, the leftover spread down the list', () => {
    const out = projectAnthology([row('a', 1), row('b', 2), row('c', 3)], 21)
    expect(out.map(r => r.weeks)).toEqual([7, 7, 7])
    expect(projectAnthology([row('a', 1), row('b', 2), row('c', 3), row('d', 4)], 21).map(r => r.weeks)).toEqual([5, 5, 5, 6])
    expect(projectAnthology(Array.from({ length: 9 }, (_, i) => row(String(i), i)), 21).map(r => r.weeks)).toEqual([2, 2, 3, 2, 2, 3, 2, 2, 3])
  })
  it('keeps a fixed story and shares the rest', () => {
    const out = projectAnthology([row('a', 1, { fixed: true, weeks: 9 }), row('b', 2), row('c', 3)], 21)
    expect(out.map(r => r.weeks)).toEqual([9, 6, 6])
  })
  it('never goes under half a week and leaves an empty list alone', () => {
    expect(projectAnthology(Array.from({ length: 10 }, (_, i) => row(String(i), i)), 3).every(r => r.weeks === 0.5)).toBe(true)
    expect(projectAnthology([], 21)).toEqual([])
  })
})

describe('fitToTerm', () => {
  it('spreads the term over the rows in whole weeks', () => {
    expect(fitToTerm([row('a', 1), row('b', 2), row('c', 3), row('d', 4)], 18)).toEqual([{ id: 'a', weeks: 4 }, { id: 'b', weeks: 5 }, { id: 'c', weeks: 4 }, { id: 'd', weeks: 5 }])
    const p = fitToTerm([row('a', 1), row('b', 2), row('c', 3)], 20)
    expect(p.reduce((s, x) => s + x.weeks, 0)).toBe(20)
    expect(p.every(x => Number.isInteger(x.weeks))).toBe(true)
  })
})

describe('shareWeeks', () => {
  it('uses whole weeks and fills the term', () => {
    expect(shareWeeks(10, 4)).toEqual([2, 3, 2, 3])
    expect(shareWeeks(21, 7)).toEqual([3, 3, 3, 3, 3, 3, 3])
  })
  it('falls back to half weeks only when rows outnumber weeks', () => {
    expect(shareWeeks(3, 6)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(shareWeeks(0, 2)).toEqual([0.5, 0.5])
  })
})

describe('views and terms for a year', () => {
  const wk = (n: number) => Array.from({ length: n }, (_, i) => ({ n: i + 1, monday: '', friday: '' }))
  it('hides a half with no dates, and Year with it', () => {
    expect(viewsFor({ spring: [], fall: wk(21) })).toEqual(['fall'])
    expect(termsFor({ spring: [], fall: wk(21) })).toEqual(['fall'])
    expect(viewsFor({ spring: wk(18), fall: wk(21) })).toEqual(['spring', 'fall', 'year'])
    expect(termsFor({ spring: wk(18), fall: wk(21) })).toEqual(['year', 'spring', 'fall'])
  })
})

describe('columnToTeaching', () => {
  it('does not count holiday columns', () => {
    expect(columnToTeaching(5, new Set([2]))).toBe(4)
    expect(columnToTeaching(2, new Set([2]))).toBe(2)
    expect(columnToTeaching(1, new Set([2]))).toBe(1)
  })
})

describe('anthologyProgress', () => {
  const rows = [row('a', 1, { done_at: 'x' }), row('b', 2, { done_at: 'x' }), row('c', 3), row('d', 4), row('e', 5), row('f', 6)]
  it('says how many are done against even pace', () => {
    expect(anthologyProgress(rows, 18, 10).text).toBe('2 of 6 done · 1 story behind')   // week 10 of 18: 3 expected
    expect(anthologyProgress(rows, 18, 7).text).toBe('2 of 6 done · on pace')
    expect(anthologyProgress(rows, 18, 1).text).toBe('2 of 6 done · 2 stories ahead')
    expect(anthologyProgress(rows, 18, null).text).toBe('2 of 6 done')
  })
})

describe('groupByModule', () => {
  it('groups stories by the module in their title, in book order', () => {
    const g = groupByModule([{ title: 'M2 W1 · b', sort_order: 3 }, { title: 'M1 W1 · a', sort_order: 1 }, { title: 'M1 W2 · c', sort_order: 2 }, { title: 'Plain', sort_order: 4 }])
    expect(g.map(x => [x.label, x.units.map(u => u.title)])).toEqual([['Module 1', ['M1 W1 · a', 'M1 W2 · c']], ['Module 2', ['M2 W1 · b']], ['Other', ['Plain']]])
  })
  it('keeps numbered units and School Links in one list', () => {
    const g = groupByModule([{ title: 'Unit 1 · In the Morning', sort_order: 1 }, { title: 'School Link 1 · Telling time', sort_order: 2 }, { title: 'Unit 2 · At Home', sort_order: 3 }])
    expect(g).toHaveLength(1)
    expect(g[0].units.map(u => u.title)).toEqual(['Unit 1 · In the Morning', 'School Link 1 · Telling time', 'Unit 2 · At Home'])
  })
})
