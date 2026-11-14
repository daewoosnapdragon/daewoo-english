import { describe, it, expect } from 'vitest'
import { snapshotRows, snapshotFromRows } from '@/lib/progressSnapshot'

describe('progress report snapshot', () => {
  it('writes one row per area, keeping N/A as N/A', () => {
    const rows = snapshotRows('s1', 'sem1', { reading: 86.4, phonics: 90, writing: null, speaking: 83, language: 85 }, { phonics: true } as any, 't1', '2026-10-20T01:00:00Z')
    expect(rows).toHaveLength(5)
    expect(rows.find(r => r.domain === 'phonics')).toMatchObject({ grade: null, is_na: true })
    expect(rows.find(r => r.domain === 'reading')).toMatchObject({ grade: 86.4, is_na: false, taken_by: 't1', taken_at: '2026-10-20T01:00:00Z' })
    expect(rows.find(r => r.domain === 'writing')).toMatchObject({ grade: null, is_na: false })
  })
  it('reads the rows back with the latest print time', () => {
    const s = snapshotFromRows([{ domain: 'reading', grade: 82, taken_at: '2026-10-20T01:00:00Z' }, { domain: 'phonics', grade: 90, is_na: true, taken_at: '2026-10-21T01:00:00Z' }, { domain: 'writing', grade: '77' as any }])
    expect(s).toEqual({ grades: { reading: 82, phonics: null, writing: 77 }, takenAt: '2026-10-21T01:00:00Z' })
    expect(snapshotFromRows([])).toBeNull()
  })
})
