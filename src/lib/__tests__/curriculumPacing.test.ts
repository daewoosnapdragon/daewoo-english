import { describe, it, expect } from 'vitest'
import { aimWeek, masterRows, yearFor, barsForView, boardLanes, halfOf, holidayWeeks, layoutPacing, mondayOf, termDates, todayPosition, weekList, yearWeeks, type CurriculumPacing, type CurriculumPlacement } from '../curriculumPacing'
import type { CurriculumBook, CurriculumSeries, CurriculumUnit } from '../curriculumCore'

const sems = [
  { academic_year: '2027-2028', type: 'fall_mid', start_date: '2027-08-30', end_date: '2027-10-22' },
  { academic_year: '2027-2028', type: 'fall_final', start_date: '2027-10-25', end_date: '2027-12-31' },
  { academic_year: '2027-2028', type: 'spring_mid', start_date: '2028-03-02', end_date: '2028-04-28' },
  { academic_year: '2027-2028', type: 'spring_final', start_date: '2028-05-01', end_date: '2028-07-14' },
]

describe('weeks', () => {
  it('finds the Monday of a week', () => {
    expect(mondayOf('2027-09-01')).toBe('2027-08-30')  // a Wednesday
    expect(mondayOf('2027-09-05')).toBe('2027-08-30')  // the Sunday after
    expect(mondayOf('2027-08-30')).toBe('2027-08-30')
  })
  it('lists the weeks of a span, numbered from 1', () => {
    const w = weekList('2027-08-30', '2027-09-17')
    expect(w.map(x => x.n)).toEqual([1, 2, 3])
    expect(w[2].monday).toBe('2027-09-13'); expect(w[2].friday).toBe('2027-09-17')
    expect(weekList('2027-09-17', '2027-08-30')).toEqual([])
  })
  it('takes a term from the earliest start and latest end of its grading periods', () => {
    expect(termDates(sems, '2027-2028', 'fall')).toEqual({ start: '2027-08-30', end: '2027-12-31' })
    expect(termDates(sems, '2027-2028', 'spring')).toEqual({ start: '2028-03-02', end: '2028-07-14' })
    expect(termDates(sems, '2026-2027', 'fall')).toEqual({ start: null, end: null })
  })
  it('knows which half a date is in', () => {
    expect(halfOf(sems, '2027-2028', '2027-11-03')).toBe('fall')
    expect(halfOf(sems, '2027-2028', '2028-03-10')).toBe('spring')
    expect(halfOf(sems, '2027-2028', '2028-01-20')).toBe('fall')   // the winter break, after the fall, still shows the fall
  })
})

const unit = (id: string, weeks = 2): CurriculumUnit => ({ id, book_id: 'b1', sort_order: 0, title: id, summary: '', skill_tags: [], ccss_codes: [], default_weeks: weeks, source: 'claude', confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' })
const pace = (id: string, unit_id: string, sort_order: number, weeks: number, placement_id = 'p1'): CurriculumPacing => ({ id, placement_id, unit_id, sort_order, weeks, owner: 'master', created_at: '', updated_at: '' })

describe('layout', () => {
  const units = [unit('u1'), unit('u2'), unit('u3')]
  const pacing = [pace('a', 'u2', 2, 3), pace('b', 'u1', 1, 2), pace('c', 'u3', 3, 1.5)]
  it('adds the weeks up in sort order', () => {
    const bars = layoutPacing(pacing, units)
    expect(bars.map(b => [b.unit.id, b.start, b.end])).toEqual([['u1', 1, 2], ['u2', 3, 5], ['u3', 6, 6.5]])
  })
  it('skips pacing rows whose unit is gone', () => {
    expect(layoutPacing([pace('x', 'nope', 1, 2)], units)).toEqual([])
  })
  it('shows a year placement in the fall shifted back by the spring weeks, cut at the edges', () => {
    const yw = { spring: weekList('2027-03-01', '2027-03-26'), fall: weekList('2027-08-30', '2027-09-17') }  // 4 spring weeks, 3 fall weeks
    const bars = layoutPacing([pace('a', 'u1', 1, 3), pace('b', 'u2', 2, 3), pace('c', 'u3', 3, 3)], units)
    const fall = barsForView(bars, 'year', 'fall', yw)
    expect(fall.map(b => [b.unit.id, b.viewStart, b.viewEnd, b.cutLeft, b.cutRight])).toEqual([['u2', 1, 2, true, false], ['u3', 3, 3, false, true]])
    const spring = barsForView(bars, 'year', 'spring', yw)
    expect(spring.map(b => [b.unit.id, b.viewStart, b.viewEnd])).toEqual([['u1', 1, 3], ['u2', 4, 4]])
    expect(barsForView(bars, 'spring', 'fall', yw)).toEqual([])
  })
})

describe('board lanes', () => {
  const series: CurriculumSeries[] = [{ id: 's1', name: 'Super Phonics', publisher: '', strand: 'phonics', color: 'plum', kind: 'sequence', sort_order: 1, created_at: '' }, { id: 's2', name: 'Into Reading', publisher: '', strand: 'reading', color: 'blue', kind: 'sequence', sort_order: 2, created_at: '' }]
  const books: CurriculumBook[] = [{ id: 'b1', series_id: 's1', level_number: '2', title: '', status: 'confirmed', drive_folder_url: '', notes: '', created_at: '', updated_at: '' }, { id: 'b2', series_id: 's2', level_number: '2', title: '', status: 'confirmed', drive_folder_url: '', notes: '', created_at: '', updated_at: '' }]
  const pl = (id: string, book_id: string, term: 'fall' | 'spring' | 'year', grade = 2): CurriculumPlacement => ({ id, book_id, english_class: 'Daisy', grade, academic_year: '2027-2028', term, is_master: true, created_by: null, created_at: '', updated_at: '' })
  it('groups bars by strand in the fixed order and colours them by series', () => {
    const yw = yearWeeks(sems, '2027-2028')
    const units = [unit('u1'), { ...unit('u2'), book_id: 'b2' }]
    const lanes = boardLanes([pl('p2', 'b2', 'fall'), pl('p1', 'b1', 'fall')], [pace('a', 'u1', 1, 4, 'p1'), pace('b', 'u2', 1, 6, 'p2')], units, books, series, 'fall', yw)
    expect(lanes.map(l => l.strand)).toEqual(['phonics', 'reading'])
    expect(lanes[0].bars[0].color).toBe('#6B4C9A')
    expect(lanes[1].bars[0].viewEnd).toBe(6)   // a unit is as long as its suggested weeks
  })
})

describe('holidays and today', () => {
  const weeks = weekList('2027-08-30', '2027-09-24')
  it('marks a week with three or more away days', () => {
    const away = [{ date: '2027-09-14', reason: 'Chuseok' }, { date: '2027-09-15', reason: 'Chuseok' }, { date: '2027-09-16', reason: 'Chuseok' }, { date: '2027-09-21', reason: 'Trip' }]
    const h = holidayWeeks(away, weeks)
    expect(Array.from(h.entries())).toEqual([[3, 'Chuseok']])
  })
  it('places today inside its week', () => {
    expect(todayPosition(weeks, '2027-09-08')).toBe(2.4)   // Wednesday of week 2
    expect(todayPosition(weeks, '2027-09-12')).toBe(3)     // Sunday counts as the end of week 2
    expect(todayPosition(weeks, '2027-10-20')).toBeNull()
  })
})

describe('yearFor', () => {
  const sems = [
    { academic_year: '2025-2026', type: 'spring_mid', start_date: '2025-03-03', end_date: '2025-07-18' },
    { academic_year: '2025-2026', type: 'fall_mid', start_date: '2025-08-18', end_date: '2026-01-09' },
    { academic_year: '2026-2027', type: 'fall_mid', start_date: '2026-08-17', end_date: '2027-01-08' },
  ]
  it('finds the year a date or a month falls in', () => {
    expect(yearFor(sems, '2026-12-08')).toBe('2026-2027')
    expect(yearFor(sems, '2025-07-01', '2025-07-31')).toBe('2025-2026')
  })
  it('in the gap between terms gives nothing, or the latest year started when asked', () => {
    expect(yearFor(sems, '2026-07-30')).toBe('')
    expect(yearFor(sems, '2026-07-30', undefined, true)).toBe('2025-2026')
    expect(yearFor(sems, '2024-01-01', undefined, true)).toBe('2026-2027')
  })
})

describe('class plans', () => {
  it('reads only the school plan rows, not teachers\' old copies', () => {
    const rows = [pace('a', 'u1', 1, 2), { ...pace('t', 'u1', 1, 5), owner: 'teacher' as const }, pace('b', 'u2', 1, 2, 'p2')]
    expect(masterRows(rows, 'p1').map(r => r.id)).toEqual(['a'])
  })
  it('places an aim date as a teaching week, holiday weeks not counted', () => {
    const yw = { spring: weekList('2027-03-01', '2027-03-26'), fall: weekList('2027-08-30', '2027-09-24') }   // 4 + 4 weeks
    const none = { spring: new Set<number>(), fall: new Set<number>() }
    expect(aimWeek('2027-09-08', 'fall', yw, none)).toBe(2)
    expect(aimWeek('2027-09-08', 'fall', yw, { spring: new Set<number>(), fall: new Set([1]) })).toBe(1)
    expect(aimWeek('2027-09-08', 'year', yw, none)).toBe(6)
    expect(aimWeek('2027-03-10', 'fall', yw, none)).toBeNull()
    expect(aimWeek(null, 'fall', yw, none)).toBeNull()
  })
})
