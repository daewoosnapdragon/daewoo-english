import { describe, it, expect } from 'vitest'
import { CRITERIA, TEMPLATES, buildFromTemplate, rubricScore, resolveStandard } from '@/components/curriculum/rubric-library'

describe('rubric library', () => {
  it('every criterion has four non-empty descriptors in both wordings', () => {
    for (const c of CRITERIA) {
      for (const band of ['k2', 'g35'] as const) {
        expect(c.levels[band], c.key).toHaveLength(4)
        c.levels[band].forEach(l => expect(l.trim().length, `${c.key} ${band}`).toBeGreaterThan(10))
      }
    }
  })
  it('criterion keys are unique and templates only reference real criteria', () => {
    const keys = CRITERIA.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const t of TEMPLATES) t.criteria.forEach(k => expect(keys, `${t.key} → ${k}`).toContain(k))
  })
  it('builds a template for a grade with resolved standards', () => {
    const r = buildFromTemplate('opinion', 3)!
    expect(r.band).toBe('g35')
    expect(r.criteria[0]).toMatchObject({ key: 'opinion', standard: 'W.3.1' })
    expect(buildFromTemplate('beginning_writer', 1)!.band).toBe('k2')
    expect(resolveStandard('L.{g}.2', 0)).toBe('L.K.2')
  })
})

describe('rubricScore', () => {
  it('scales marked levels to the total and leaves N/A out', () => {
    // 6 criteria, total 24: all 4s → 24; all 3s → 18
    expect(rubricScore({ a: 4, b: 4, c: 4, d: 4, e: 4, f: 4 }, 6, 24)).toBe(24)
    expect(rubricScore({ a: 3, b: 3, c: 3, d: 3, e: 3, f: 3 }, 6, 24)).toBe(18)
    // one N/A: 5 marked, all 4s → still full marks
    expect(rubricScore({ a: 4, b: 4, c: 4, d: 4, e: 4, f: 0 }, 6, 24)).toBe(24)
    // half marks
    expect(rubricScore({ a: 2, b: 2, c: 0 }, 3, 12)).toBe(6)
  })
  it('is null when nothing is marked', () => {
    expect(rubricScore({}, 6, 24)).toBeNull()
    expect(rubricScore({ a: 0 }, 6, 24)).toBeNull()
  })
})
