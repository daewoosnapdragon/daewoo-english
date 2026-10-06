import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { schoolDaysSince, isOverdue } from '@/lib/behaviorLadder'

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
