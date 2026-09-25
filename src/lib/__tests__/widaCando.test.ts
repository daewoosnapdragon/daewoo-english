import { describe, it, expect } from 'vitest'
import { WIDA_CAN_DO, LEVELS, suggestLevel, ticksThrough, ticksClearFrom, widaBandForGrade } from '@/components/curriculum/wida-cando'
import { WIDA_DOMAINS } from '@/lib/wida'

describe('WIDA can-do statements', () => {
  it('has three or more plain statements for every domain, band and level, with unique ids', () => {
    const ids = new Set<string>()
    for (const d of WIDA_DOMAINS) for (const b of ['k2', 'g35'] as const) for (const lv of LEVELS) {
      const items = WIDA_CAN_DO[d][b][lv]
      expect(items.length, `${d} ${b} ${lv}`).toBeGreaterThanOrEqual(3)
      items.forEach(i => { expect(i.text.trim().length).toBeGreaterThan(12); expect(ids.has(i.id), i.id).toBe(false); ids.add(i.id) })
    }
  })
  it('suggests the highest level whose statements are at least half ticked, with no gaps', () => {
    const tick = (d: 'reading', b: 'g35', spec: Record<number, number>) => {
      const s = new Set<string>()
      for (const [lv, n] of Object.entries(spec)) WIDA_CAN_DO[d][b][Number(lv) as 1].slice(0, n).forEach(i => s.add(i.id))
      return s
    }
    expect(suggestLevel('reading', 'g35', new Set()).level).toBe(1)
    // three of four statements meets a level; two of four is halfway there
    expect(suggestLevel('reading', 'g35', tick('reading', 'g35', { 1: 4, 2: 4, 3: 3 })).level).toBe(3)
    expect(suggestLevel('reading', 'g35', tick('reading', 'g35', { 1: 4, 2: 4, 3: 2 }))).toMatchObject({ level: 2, decimal: 2.5 })
    expect(suggestLevel('reading', 'g35', tick('reading', 'g35', { 1: 4, 2: 4, 3: 1 }))).toMatchObject({ level: 2, decimal: 2.3 })
    // a gap: level 3 unticked, so a full level 4 does not count
    expect(suggestLevel('reading', 'g35', tick('reading', 'g35', { 1: 4, 2: 4, 4: 4 }))).toMatchObject({ level: 2, decimal: 2 })
    expect(suggestLevel('reading', 'g35', tick('reading', 'g35', { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 }))).toMatchObject({ level: 6, decimal: 6 })
  })
  it('skips ahead and clears back', () => {
    const through4 = ticksThrough('writing', 'k2', 4)
    expect(suggestLevel('writing', 'k2', through4)).toMatchObject({ level: 4, decimal: 4 })
    const back = ticksClearFrom('writing', 'k2', 3, through4)
    expect(suggestLevel('writing', 'k2', back)).toMatchObject({ level: 2, decimal: 2 })
  })
  it('bands by grade', () => {
    expect(widaBandForGrade(1)).toBe('k2'); expect(widaBandForGrade(2)).toBe('k2'); expect(widaBandForGrade(3)).toBe('g35')
  })
})
