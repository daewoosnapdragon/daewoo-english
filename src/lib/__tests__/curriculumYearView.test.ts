import { describe, it, expect } from 'vitest'
import { barsForView, layoutPacing, placementLength, teachingToColumns, viewWeeks, weekList, type CurriculumPacing } from '../curriculumPacing'
import { unitsInWeek } from '../curriculumWeek'
import type { CurriculumUnit } from '../curriculumCore'

const unit = (id: string): CurriculumUnit => ({ id, book_id: 'b1', sort_order: 0, title: id, summary: '', skill_tags: [], ccss_codes: [], default_weeks: 2, source: 'claude', confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' })
const row = (id: string, sort_order: number, weeks: number, extra: Partial<CurriculumPacing> = {}): CurriculumPacing => ({ id, placement_id: 'p1', unit_id: 'u' + id, sort_order, weeks, owner: 'master', created_at: '', updated_at: '', ...extra })
const units = [unit('ua'), unit('ub'), unit('uc')]
const yw = { spring: weekList('2027-03-01', '2027-03-26'), fall: weekList('2027-08-30', '2027-09-17') }  // 4 + 3 weeks

describe('the year view', () => {
  it('lists spring then fall, renumbered, each week knowing its half', () => {
    const w = viewWeeks(yw, 'year')
    expect(w.map(x => [x.n, x.half])).toEqual([[1, 'spring'], [2, 'spring'], [3, 'spring'], [4, 'spring'], [5, 'fall'], [6, 'fall'], [7, 'fall']])
    expect(viewWeeks(yw, 'fall').map(x => x.n)).toEqual([1, 2, 3])
  })
  it('places a fall placement after the spring and a year placement across both', () => {
    const bars = layoutPacing([row('a', 1, 2), row('b', 2, 1)], units)
    expect(barsForView(bars, 'fall', 'year', yw).map(b => [b.viewStart, b.viewEnd])).toEqual([[5, 6], [7, 7]])
    expect(barsForView(bars, 'spring', 'year', yw).map(b => [b.viewStart, b.viewEnd])).toEqual([[1, 2], [3, 3]])
    const year = layoutPacing([row('a', 1, 5), row('b', 2, 2)], units)
    expect(barsForView(year, 'year', 'year', yw).map(b => [b.viewStart, b.viewEnd, b.cutRight])).toEqual([[1, 5, false], [6, 7, false]])
  })
})

describe('holidays stretch units instead of being covered', () => {
  it('subtracts holiday weeks from the term and shifts bars past them', () => {
    expect(placementLength('fall', yw, { spring: 0, fall: 1 })).toBe(2)
    const bars = [{ viewStart: 1, viewEnd: 2 }, { viewStart: 3, viewEnd: 4 }]
    // column 2 is a holiday: the first unit runs columns 1 to 3, the second 4 to 5
    expect(teachingToColumns(bars, new Set([2]), 5)).toEqual([{ viewStart: 1, viewEnd: 3 }, { viewStart: 4, viewEnd: 5 }])
    // a half-week start keeps its fraction
    expect(teachingToColumns([{ viewStart: 1.5, viewEnd: 2 }], new Set([2]), 5)).toEqual([{ viewStart: 1.5, viewEnd: 3 }])
  })
})

describe('half-week bars', () => {
  const units = [{ id: 'h1' }, { id: 'h2' }].map(u => ({ id: u.id, book_id: 'b', sort_order: 0, title: u.id, summary: '', skill_tags: [], ccss_codes: [], default_weeks: 1, source: 'claude' as const, confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' }))
  const half = [row('a', 1, 0.5), row('b', 2, 2)].map((r, i) => ({ ...r, unit_id: units[i].id }))
  const yw = { spring: [], fall: weekList('2026-08-17', '2026-11-27') }
  it('are kept in the view, half a week wide, and the next unit starts beside them', () => {
    const bars = barsForView(layoutPacing(half, units), 'fall', 'fall', yw)
    expect(bars.map(b => [b.unit.id, b.viewStart, b.viewEnd])).toEqual([['h1', 1, 0.5], ['h2', 1.5, 2.5]])
  })
  it('stay half a week wide across holiday columns', () => {
    expect(teachingToColumns([{ viewStart: 1, viewEnd: 0.5 }, { viewStart: 1.5, viewEnd: 2.5 }], new Set([2]), 5)).toEqual([{ viewStart: 1, viewEnd: 0.5 }, { viewStart: 1.5, viewEnd: 3.5 }])
  })
  it('count as running in the week they sit in', () => {
    expect(unitsInWeek([{ viewStart: 1, viewEnd: 0.5 }, { viewStart: 1.5, viewEnd: 2.5 }], 1)).toHaveLength(2)
    expect(unitsInWeek([{ viewStart: 1, viewEnd: 0.5 }, { viewStart: 1.5, viewEnd: 2.5 }], 2)).toHaveLength(1)
  })
})
