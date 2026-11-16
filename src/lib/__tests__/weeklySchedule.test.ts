import { describe, expect, it } from 'vitest'
import { SCHEDULE, parseTime } from '@/components/dashboard/WeeklySchedule'

// The dashboard's "now" marker: every period must sit inside the school day,
// so the morning never matches an afternoon class.
const mins = (h: number, m: number) => h * 60 + m
const activeAt = (h: number, m: number) => SCHEDULE.findIndex(p => {
  const t = mins(h, m)
  return t >= mins(p.startHour, p.startMin) && t < mins(p.endHour, p.endMin)
})

describe('weekly schedule times', () => {
  it('reads afternoon hours as PM, start and end alike', () => {
    expect(parseTime('1:20')).toEqual({ h: 13, m: 20 })
    expect(parseTime('3:50')).toEqual({ h: 15, m: 50 })
    expect(parseTime('9:10')).toEqual({ h: 9, m: 10 })
    expect(parseTime('12:30')).toEqual({ h: 12, m: 30 })
  })

  it('every period starts before it ends', () => {
    for (const p of SCHEDULE) expect(mins(p.startHour, p.startMin)).toBeLessThan(mins(p.endHour, p.endMin))
  })

  it('marks nothing before school and the right period during it', () => {
    expect(activeAt(8, 41)).toBe(-1)
    expect(activeAt(9, 30)).toBe(0)
    expect(SCHEDULE[activeAt(13, 30)].time).toBe('1:20-2:00')
    expect(SCHEDULE[activeAt(15, 55)].time).toBe('3:50-4:30')
    expect(activeAt(17, 0)).toBe(-1)
  })
})
