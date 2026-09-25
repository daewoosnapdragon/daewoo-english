import { describe, it, expect } from 'vitest'
import {
  weightedMean, compositeFrom, isTestedRow, rankRows, suggestClass,
  buildLevelCwpmNorms, getWrittenMcTotal,
} from '@/components/leveling/placement'
import { compositeWeightsFor } from '@/lib/utils'

describe('weightedMean', () => {
  it('renormalises over the terms that are present', () => {
    const v = weightedMean([{ score: 0.8, weight: 0.45 }, { score: 0.6, weight: 0.25 }, { score: null, weight: 0.25 }])
    expect(v).toBeCloseTo((0.8 * 0.45 + 0.6 * 0.25) / 0.7, 9)
  })
  it('is null with nothing present, and a plain mean with zero total weight', () => {
    expect(weightedMean([{ score: null, weight: 1 }])).toBeNull()
    expect(weightedMean([{ score: 0.2, weight: 0 }, { score: 0.6, weight: 0 }])).toBeCloseTo(0.4, 9)
  })
})

describe('compositeFrom', () => {
  it('ignores a term the grade does not have (Grade 4 short writing)', () => {
    const v = compositeFrom({ oral: 0.8, mc: 0.6, writing: 0.5, shortWriting: 0.9 }, compositeWeightsFor(4))
    expect(v).toBeCloseTo((0.8 * 0.45 + 0.6 * 0.25 + 0.5 * 0.25) / 0.95, 9)
  })
  it('renormalises when a term is missing', () => {
    const v = compositeFrom({ oral: 0.8, mc: 0.6 }, compositeWeightsFor(3))
    expect(v).toBeCloseTo((0.8 * 0.45 + 0.6 * 0.25) / 0.7, 9)
  })
  it('a student with no terms has no composite', () => {
    expect(compositeFrom({}, compositeWeightsFor(3))).toBeNull()
  })
})

describe('isTestedRow', () => {
  it('a zero is a measurement; nulls are not', () => {
    expect(isTestedRow({ oral: null, mc: null })).toBe(false)
    expect(isTestedRow({ oral: 0 })).toBe(true)
  })
})

describe('rankRows and suggestClass', () => {
  const row = (id: string, composite: number, isTested = true, extra: any = {}) =>
    ({ student: { id } as any, composite, isTested, score: {}, wrAcc: null, ...extra })

  it('ranks tested students low to high and cuts the grade into sextiles', () => {
    const out = rankRows([row('hi', 0.9), row('lo', 0.3), row('mid', 0.6), row('none', 0, false)])
    const by = Object.fromEntries(out.map(r => [r.student.id, r]))
    expect(by.lo.percentile).toBe(0)
    expect(by.mid.percentile).toBe(0.5)
    expect(by.hi.percentile).toBe(1)
    expect(by.lo.suggestedClass).toBe('Lily')
    expect(by.mid.suggestedClass).toBe('Sunflower')
    expect(by.hi.suggestedClass).toBe('Snapdragon')
  })
  it('untested students take no rank position and get no placement', () => {
    const out = rankRows([row('a', 0.9), row('b', 0.1), row('none', 0, false)])
    const none = out.find(r => r.student.id === 'none')!
    expect(none.percentile).toBeNull()
    expect(none.suggestedClass).toBeNull()
    // With the untested row excluded, 'b' is still the bottom of two → 0, 'a' → 1
    expect(out.find(r => r.student.id === 'a')!.percentile).toBe(1)
  })
  it('a lone tested student sits mid-grade', () => {
    const out = rankRows([row('only', 0.5)])
    expect(out[0].percentile).toBe(0.5)
    expect(out[0].suggestedClass).toBe('Sunflower')
  })
  it('very weak word reading forces Lily regardless of rank', () => {
    expect(suggestClass({ score: { word_reading_correct: 2 }, wrAcc: 0.9 }, 5, 6)).toBe('Lily')
    expect(suggestClass({ score: {}, wrAcc: 0.05 }, 5, 6)).toBe('Lily')
    expect(suggestClass({ score: {}, wrAcc: 0.9 }, 5, 6)).toBe('Snapdragon')
  })
})

describe('buildLevelCwpmNorms', () => {
  const st = (id: string) => ({ id, english_class: 'Daisy' } as any)
  const scores = {
    a: { calculated_metrics: { passage_level: 'M', cwpm: 90 } },
    b: { calculated_metrics: { passage_level: 'M', cwpm: 110 } },
    c: { calculated_metrics: { passage_level: 'M', cwpm: 100 } },
    d: { calculated_metrics: { passage_level: 'K', cwpm: 50 } },
    e: { calculated_metrics: { passage_level: 'K', cwpm: 70 } },
    f: { calculated_metrics: { passage_level: 'K', cwpm: 0 } },
  }
  it('takes the median per level and needs three readers to be reliable', () => {
    const norms = buildLevelCwpmNorms(['a', 'b', 'c', 'd', 'e', 'f'].map(st), scores)
    expect(norms.M).toEqual({ medianCwpm: 100, reliable: true })
    expect(norms.K).toEqual({ medianCwpm: 60, reliable: false })
  })
})

describe('getWrittenMcTotal', () => {
  it('prefers the total stored on the score', () => {
    expect(getWrittenMcTotal(1, 19)).toBe(19)
    expect(getWrittenMcTotal(3, 0)).toBe(26)
  })
  it('falls back to the grade table', () => {
    expect([1, 2, 3, 4, 5, 9].map(g => getWrittenMcTotal(g))).toEqual([25, 32, 26, 40, 37, 26])
  })
})
