import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { schoolDaysSince, isOverdue } from '@/lib/behaviorLadder'
import { toKSTDateString } from '@/lib/utils'

describe('schoolDaysSince', () => {
  it('counts weekdays between the opening day and today', () => {
    expect(schoolDaysSince('2026-10-05T09:00:00Z', '2026-10-05')).toBe(0) // Monday, same day
    expect(schoolDaysSince('2026-10-05T09:00:00Z', '2026-10-07')).toBe(2) // Mon → Wed
    expect(schoolDaysSince('2026-10-09T15:00:00Z', '2026-10-12')).toBe(1) // Fri → Mon skips the weekend
    expect(schoolDaysSince('2026-10-02T15:00:00Z', '2026-10-09')).toBe(5) // a full week
  })
  it('marks an open case overdue after the configured school days, but never an acknowledged one', () => {
    const base = { created_at: '2026-10-05T09:00:00Z' } as any
    expect(isOverdue({ ...base, status: 'open' }, 2, '2026-10-06')).toBe(false)
    expect(isOverdue({ ...base, status: 'open' }, 2, '2026-10-07')).toBe(true)
    expect(isOverdue({ ...base, status: 'acknowledged' }, 2, '2026-10-20')).toBe(false)
  })
})

describe('toKSTDateString', () => {
  it('gives the Seoul day of a UTC timestamp, which is the next day before 09:00', () => {
    expect(toKSTDateString('2026-10-06T23:40:12.345678+00:00')).toBe('2026-10-07') // 08:40 in Seoul
    expect(toKSTDateString('2026-10-06T14:59:59Z')).toBe('2026-10-06') // 23:59 in Seoul
    expect(toKSTDateString('2026-10-06T15:00:00Z')).toBe('2026-10-07') // midnight in Seoul
  })
  it('passes a plain date through', () => {
    expect(toKSTDateString('2026-10-07')).toBe('2026-10-07')
  })
})

describe('schoolDaysSince in the Seoul morning', () => {
  it('counts from the Seoul day the case opened, not the UTC day', () => {
    // Opened 08:30 Wednesday in Seoul (23:30 Tuesday UTC); on Thursday that is one school day.
    expect(schoolDaysSince('2026-10-06T23:30:00Z', '2026-10-08')).toBe(1)
  })
})
