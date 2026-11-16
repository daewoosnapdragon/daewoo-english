import { describe, it, expect } from 'vitest'
import { termProgress } from '../term'

describe('termProgress', () => {
  it('counts the week of the term and how far through it is', () => {
    const p = termProgress('2026-08-24', '2026-12-31', '2026-11-16', '2026-12-18')!
    expect(p.weeks).toBe(19)
    expect(p.week).toBe(13)
    expect(p.frac).toBeGreaterThan(0.6)
    expect(p.frac).toBeLessThan(0.7)
    expect(p.cutoff).toBeGreaterThan(0.85)
  })
  it('stays inside the term before it starts and after it ends', () => {
    expect(termProgress('2026-08-24', '2026-12-31', '2026-08-01')!.week).toBe(1)
    expect(termProgress('2026-08-24', '2026-12-31', '2026-08-01')!.frac).toBe(0)
    const after = termProgress('2026-08-24', '2026-12-31', '2027-02-01')!
    expect(after.week).toBe(after.weeks)
    expect(after.frac).toBe(1)
  })
  it('needs both dates', () => {
    expect(termProgress(null, '2026-12-31', '2026-11-16')).toBeNull()
    expect(termProgress('2026-08-24', undefined, '2026-11-16')).toBeNull()
  })
  it('has no cutoff mark without a cutoff date', () => {
    expect(termProgress('2026-08-24', '2026-12-31', '2026-11-16')!.cutoff).toBeNull()
  })
})
