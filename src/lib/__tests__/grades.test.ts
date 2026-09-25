import { describe, it, expect } from 'vitest'
import {
  percentToLetter, calculateWeightedAverage, weightedAverage, average,
  validateScore, getDisplayName, DEFAULT_WEIGHTS,
} from '@/lib/utils'

describe('percentToLetter', () => {
  it('maps the default scale at its boundaries', () => {
    expect(percentToLetter(100)).toBe('A+')
    expect(percentToLetter(97)).toBe('A+')
    expect(percentToLetter(96)).toBe('A')
    expect(percentToLetter(93)).toBe('A')
    expect(percentToLetter(90)).toBe('A-')
    expect(percentToLetter(87)).toBe('B+')
    expect(percentToLetter(83)).toBe('B')
    expect(percentToLetter(80)).toBe('B-')
    expect(percentToLetter(77)).toBe('C+')
    expect(percentToLetter(73)).toBe('C')
    expect(percentToLetter(70)).toBe('C-')
    expect(percentToLetter(67)).toBe('D+')
    expect(percentToLetter(63)).toBe('D')
    expect(percentToLetter(60)).toBe('D-')
    expect(percentToLetter(59)).toBe('E')
    expect(percentToLetter(0)).toBe('E')
  })
  it('rounds before looking up, so 96.5 is an A+ and 92.4 is an A-', () => {
    expect(percentToLetter(96.5)).toBe('A+')
    expect(percentToLetter(92.4)).toBe('A-')
    expect(percentToLetter(89.5)).toBe('A-')
  })
  it('uses a custom scale when one is given', () => {
    const scale = [{ letter: 'Pass', min: 70, max: 100 }, { letter: 'Fail', min: 0, max: 69 }]
    expect(percentToLetter(70, scale)).toBe('Pass')
    expect(percentToLetter(69, scale)).toBe('Fail')
  })
})

describe('calculateWeightedAverage', () => {
  const items = [
    { score: 8, maxScore: 10, assessmentType: 'formative' as const },   // 80
    { score: 9, maxScore: 10, assessmentType: 'formative' as const },   // 90 → formative avg 85
    { score: 70, maxScore: 100, assessmentType: 'summative' as const }, // 70
    { score: 15, maxScore: 20, assessmentType: 'performance_task' as const }, // 75
  ]

  it('averages within type, then weights by the grade default (G3 = 30/40/30)', () => {
    // 85*.30 + 70*.40 + 75*.30 = 76
    expect(calculateWeightedAverage(items, 3)).toBeCloseTo(76, 6)
  })
  it('uses the Grade 1 default (40/25/35) for Grade 1', () => {
    // 85*.40 + 70*.25 + 75*.35 = 34 + 17.5 + 26.25
    expect(calculateWeightedAverage(items, 1)).toBeCloseTo(77.75, 6)
  })
  it('renormalises over the types that have data', () => {
    const noPT = items.filter(i => i.assessmentType !== 'performance_task')
    // weights 30 and 40 → 3/7 and 4/7
    expect(calculateWeightedAverage(noPT, 3)).toBeCloseTo((85 * 3 + 70 * 4) / 7, 6)
  })
  it('returns the simple average when only one type has data', () => {
    const onlyF = items.filter(i => i.assessmentType === 'formative')
    expect(calculateWeightedAverage(onlyF, 3)).toBe(85)
  })
  it('prefers explicit custom weights over everything', () => {
    const w = { formative: 0, summative: 100, performance_task: 0 }
    expect(calculateWeightedAverage(items, 3, w)).toBeCloseTo(70, 6)
  })
  it('prefers a class override over the grade override in allWeights', () => {
    const all = {
      '3': { formative: 100, summative: 0, performance_task: 0 },
      '3-Snapdragon': { formative: 0, summative: 0, performance_task: 100 },
    }
    expect(calculateWeightedAverage(items, 3, null, 'Snapdragon', all)).toBeCloseTo(75, 6)
    expect(calculateWeightedAverage(items, 3, null, 'Lily', all)).toBeCloseTo(85, 6)
  })
  it('falls back to Grade 3 weights for an unknown grade', () => {
    expect(calculateWeightedAverage(items, 9)).toBeCloseTo(calculateWeightedAverage(items, 3)!, 9)
  })
  it('skips items with a zero max and returns null when nothing counts', () => {
    expect(calculateWeightedAverage([{ score: 5, maxScore: 0, assessmentType: 'formative' }], 3)).toBeNull()
    expect(calculateWeightedAverage([], 3)).toBeNull()
  })
  it('treats an unknown assessment type as formative', () => {
    const odd = [{ score: 5, maxScore: 10, assessmentType: 'quiz' as any }, items[0]]
    expect(calculateWeightedAverage(odd, 3)).toBe(65)
  })
  it('keeps every grade default summing to 100', () => {
    for (const g of [1, 2, 3, 4, 5]) {
      const w = DEFAULT_WEIGHTS[g]
      expect(w.formative + w.summative + w.performance_task).toBe(100)
    }
  })
})

describe('weightedAverage and average', () => {
  it('weights values and ignores nulls', () => {
    expect(weightedAverage([{ value: 80, weight: 1 }, { value: 100, weight: 3 }])).toBe(95)
    expect(weightedAverage([{ value: null, weight: 5 }, { value: 60, weight: 1 }])).toBe(60)
  })
  it('returns null with no values or zero total weight', () => {
    expect(weightedAverage([])).toBeNull()
    expect(weightedAverage([{ value: null, weight: 1 }])).toBeNull()
    expect(weightedAverage([{ value: 50, weight: 0 }])).toBeNull()
  })
  it('average skips nulls and NaN', () => {
    expect(average([80, null, 100, undefined, NaN])).toBe(90)
    expect(average([])).toBeNull()
  })
})

describe('validateScore', () => {
  it('accepts blank as "no score"', () => {
    expect(validateScore('', 10)).toEqual({ valid: true, value: null })
  })
  it('accepts numbers inside 0..max, including decimals', () => {
    expect(validateScore('8', 10)).toEqual({ valid: true, value: 8 })
    expect(validateScore('8.5', 10)).toEqual({ valid: true, value: 8.5 })
    expect(validateScore(10, 10)).toEqual({ valid: true, value: 10 })
    expect(validateScore(0, 10)).toEqual({ valid: true, value: 0 })
  })
  it('rejects text, negatives and scores over the max', () => {
    expect(validateScore('abc', 10).valid).toBe(false)
    expect(validateScore(-1, 10).valid).toBe(false)
    expect(validateScore(11, 10).valid).toBe(false)
  })
})

describe('getDisplayName', () => {
  it('prefers the nickname in parentheses', () => {
    expect(getDisplayName({ english_name: 'Lee Ji Su (Alex)' })).toBe('Alex')
  })
  it('drops the family name from a romanised name', () => {
    expect(getDisplayName({ english_name: 'Lee Ji Su' })).toBe('Ji Su')
    expect(getDisplayName({ english_name: 'Sa Yul' })).toBe('Yul')
    expect(getDisplayName({ english_name: 'Alex' })).toBe('Alex')
  })
  it('falls back to the Korean given name', () => {
    expect(getDisplayName({ korean_name: '이지수' })).toBe('지수')
    expect(getDisplayName({ korean_name: '사율' })).toBe('율')
    expect(getDisplayName({})).toBe('Unknown')
  })
})
