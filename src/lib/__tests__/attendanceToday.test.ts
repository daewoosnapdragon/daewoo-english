import { describe, it, expect, vi } from 'vitest'

// The loaders talk to Supabase; the counting under test does not.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { unmarkedByGrade, hasClassToday, type AttendanceDay } from '@/lib/attendanceToday'

const school: AttendanceDay = { weekend: false, off: null, away: {} }
const lily = [
  { id: 'a', grade: 3 }, { id: 'b', grade: 3 },
  { id: 'c', grade: 4 }, { id: 'd', grade: 4 },
]

describe('unmarkedByGrade', () => {
  it('names each grade with students still unmarked', () => {
    expect(unmarkedByGrade(lily, new Set(['c', 'd']), school)).toEqual([{ grade: 3, unmarked: 2, total: 2 }])
  })

  it('is empty once every student is marked, so the reminder goes away', () => {
    expect(unmarkedByGrade(lily, new Set(['a', 'b', 'c', 'd']), school)).toEqual([])
  })

  it('leaves out a grade with no class today', () => {
    expect(unmarkedByGrade(lily, new Set(), { ...school, away: { 3: 'Field trip' } })).toEqual([{ grade: 4, unmarked: 2, total: 2 }])
  })

  it('says nothing at the weekend, on a day off, or before the day is known', () => {
    expect(unmarkedByGrade(lily, new Set(), { ...school, weekend: true })).toEqual([])
    expect(unmarkedByGrade(lily, new Set(), { ...school, off: 'Chuseok' })).toEqual([])
    expect(unmarkedByGrade(lily, new Set(), null)).toEqual([])
  })
})

describe('hasClassToday', () => {
  it('is false when every grade is away', () => {
    expect(hasClassToday(lily, { ...school, away: { 3: 'x', 4: 'y' } })).toBe(false)
    expect(hasClassToday(lily, school)).toBe(true)
  })
})
