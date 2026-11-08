import { describe, it, expect } from 'vitest'
import { bareObjective, unitsInWeek, weekDays } from '../curriculumWeek'

describe('unitsInWeek and weekDays', () => {
  it('finds the bars covering a week, including half weeks', () => {
    const bars = [{ id: 'a', viewStart: 1, viewEnd: 2 }, { id: 'b', viewStart: 3, viewEnd: 4.5 }, { id: 'c', viewStart: 4.5, viewEnd: 6 }]
    expect(unitsInWeek(bars, 2).map(b => b.id)).toEqual(['a'])
    expect(unitsInWeek(bars, 4).map(b => b.id)).toEqual(['b', 'c'])
    expect(unitsInWeek(bars, 7)).toEqual([])
  })
  it('lists Monday to Friday', () => {
    expect(weekDays({ n: 1, monday: '2027-08-30', friday: '2027-09-03' })).toEqual(['2027-08-30', '2027-08-31', '2027-09-01', '2027-09-02', '2027-09-03'])
  })
})


describe('bareObjective', () => {
  it('drops the Students will the printed plan already has', () => {
    expect(bareObjective('  Students will retell the story')).toBe('retell the story')
    expect(bareObjective('retell the story')).toBe('retell the story')
  })
})
