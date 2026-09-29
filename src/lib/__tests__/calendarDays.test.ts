import { describe, it, expect, vi } from 'vitest'

// calendarDays talks to Supabase for the live loaders; the pure expander under test does not.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { expandAwayDays, type CalendarRow } from '@/lib/calendarDays'
import { DEFAULT_SCHEDULE_RULES } from '@/lib/scheduleRules'

const ev = (over: Partial<CalendarRow>): CalendarRow => ({ type: 'day_off', title: 'Chuseok', date: '2026-09-24', end_date: '2026-09-25', target_grades: null, ...over })

describe('expandAwayDays', () => {
  it('turns a multi-day day off into one entry per weekday', () => {
    // Chuseok 2026: Thu 24 – Sat 26. Saturday drops out.
    const out = expandAwayDays([ev({ end_date: '2026-09-26' })], '2026-08-01', '2026-09-29', 4, DEFAULT_SCHEDULE_RULES)
    expect(out).toEqual([
      { date: '2026-09-24', reason: 'Chuseok', kind: 'off' },
      { date: '2026-09-25', reason: 'Chuseok', kind: 'off' },
    ])
  })

  it('clips to the window on both ends', () => {
    const out = expandAwayDays([ev({ date: '2026-09-21', end_date: '2026-09-25' })], '2026-09-23', '2026-09-24', 4, DEFAULT_SCHEDULE_RULES)
    expect(out.map(a => a.date)).toEqual(['2026-09-23', '2026-09-24'])
  })

  it('skips a grade’s no-class weekday and respects target grades', () => {
    // Mon 21 Sep: Grade 5 has no Monday class by default, Grade 4 does
    const mon = [ev({ date: '2026-09-21', end_date: null, title: 'Teacher day' })]
    expect(expandAwayDays(mon, '2026-09-01', '2026-09-30', 5, DEFAULT_SCHEDULE_RULES)).toEqual([])
    expect(expandAwayDays(mon, '2026-09-01', '2026-09-30', 4, DEFAULT_SCHEDULE_RULES).map(a => a.date)).toEqual(['2026-09-21'])
    const g2 = [ev({ target_grades: [2], title: 'Grade 2 trip', type: 'field_trip', end_date: null })]
    expect(expandAwayDays(g2, '2026-09-01', '2026-09-30', 4, DEFAULT_SCHEDULE_RULES)).toEqual([])
    expect(expandAwayDays(g2, '2026-09-01', '2026-09-30', 2, DEFAULT_SCHEDULE_RULES)).toEqual([{ date: '2026-09-24', reason: 'Grade 2 trip', kind: 'trip' }])
  })

  it('prefers the day off when a trip lands on the same day, and ignores other event types', () => {
    const both = [ev({ type: 'field_trip', title: 'Zoo', end_date: null }), ev({ end_date: null }), ev({ type: 'meeting', title: 'Staff', end_date: null })]
    expect(expandAwayDays(both, '2026-09-01', '2026-09-30', 3, DEFAULT_SCHEDULE_RULES)).toEqual([{ date: '2026-09-24', reason: 'Chuseok', kind: 'off' }])
  })

  it('returns nothing for an empty or inverted window', () => {
    expect(expandAwayDays([ev({})], '2026-10-01', '2026-09-01', 3, DEFAULT_SCHEDULE_RULES)).toEqual([])
    expect(expandAwayDays([], '2026-09-01', '2026-09-30', 3, DEFAULT_SCHEDULE_RULES)).toEqual([])
  })
})
