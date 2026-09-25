import { describe, it, expect } from 'vitest'
import { domainForStandard, splitPossible, splitEarned, itemsForDomain, isMultiDomain, touchesDomain } from '@/lib/domainSplit'
import { calculateWeightedAverage } from '@/lib/utils'

const map: any[] = [
  { num: 1, type: 'mc', max_points: 1, answer_key: 'A', standard: 'RL.3.3' },
  { num: 2, type: 'mc', max_points: 1, answer_key: 'B', standard: 'RF.3.3a' },
  { num: 3, type: 'short_answer', max_points: 2 },                                   // untagged → default
  { num: 4, type: 'rubric', max_points: 8, rubric: { name: 'W', criteria: [{ key: 'op', label: 'Opinion', levels: ['', '', '', ''], standard: 'W.3.1' }, { key: 'cap', label: 'Caps', levels: ['', '', '', ''], standard: 'L.3.2' }] } },
]

describe('domainForStandard', () => {
  it('routes by prefix and falls back', () => {
    expect(domainForStandard('RL.3.3', 'x')).toBe('reading')
    expect(domainForStandard('RI.K.1', 'x')).toBe('reading')
    expect(domainForStandard('RF.1.2a', 'x')).toBe('phonics')
    expect(domainForStandard('W.4.1', 'x')).toBe('writing')
    expect(domainForStandard('SL.2.1', 'x')).toBe('speaking')
    expect(domainForStandard('L.5.2e', 'x')).toBe('language')
    expect(domainForStandard(undefined, 'reading')).toBe('reading')
    expect(domainForStandard('ZZ.1.1', 'writing')).toBe('writing')
  })
})

describe('splitPossible and splitEarned', () => {
  it('sends each question to its standard’s domain, rubric criteria one by one', () => {
    expect(splitPossible(map, 'reading')).toEqual({ reading: 3, phonics: 1, writing: 4, language: 4 })
    expect(isMultiDomain(splitPossible(map, 'reading'))).toBe(true)
    expect(isMultiDomain(splitPossible(map.slice(0, 1), 'reading'))).toBe(false)
  })
  it('earned follows the same routing', () => {
    const responses: any[] = [
      { q: 1, points: 1 }, { q: 2, points: 0 }, { q: 3, points: 2 },
      { q: 4, points: 5, levels: { op: 3, cap: 2 } },
    ]
    expect(splitEarned(map, responses, 'reading')).toEqual({ reading: 3, phonics: 0, writing: 3, language: 2 })
  })
})

describe('itemsForDomain', () => {
  const plain = { id: 'p', domain: 'reading', max_score: 10, type: 'formative' }
  const mixed = { id: 'm', domain: 'reading', mixed: true, max_score: 12, type: 'summative', domain_split: { reading: 3, phonics: 1, writing: 4, language: 4 } }
  const grades: Record<string, any> = {
    p: { score: 8 },
    m: { score: 8, domain_scores: { reading: 3, phonics: 0, writing: 3, language: 2 } },
  }
  const gradeFor = (a: any) => grades[a.id]
  it('gives a plain assessment whole and a mixed one per domain', () => {
    expect(itemsForDomain('reading', [plain, mixed], gradeFor)).toEqual([
      { score: 8, maxScore: 10, assessmentType: 'formative' },
      { score: 3, maxScore: 3, assessmentType: 'summative' },
    ])
    expect(itemsForDomain('writing', [plain, mixed], gradeFor)).toEqual([{ score: 3, maxScore: 4, assessmentType: 'summative' }])
    expect(itemsForDomain('speaking', [plain, mixed], gradeFor)).toEqual([])
  })
  it('splits a mixed row saved without item detail in proportion', () => {
    const items = itemsForDomain('writing', [mixed], () => ({ score: 6 }))
    expect(items[0].maxScore).toBe(4)
    expect(items[0].score).toBeCloseTo(2, 9)
  })
  it('skips exempt and absent rows and feeds the weighting unchanged', () => {
    expect(itemsForDomain('reading', [plain], () => ({ score: 8, is_exempt: true }))).toEqual([])
    const items = itemsForDomain('reading', [plain, mixed], gradeFor)
    // formative 80, summative 100 → G3 30/40 → (80*30 + 100*40)/70
    expect(calculateWeightedAverage(items, 3)).toBeCloseTo((80 * 30 + 100 * 40) / 70, 6)
  })
  it('touchesDomain reads the split for mixed and the domain otherwise', () => {
    expect(touchesDomain(mixed, 'language')).toBe(true)
    expect(touchesDomain(mixed, 'speaking')).toBe(false)
    expect(touchesDomain(plain, 'reading')).toBe(true)
  })
})
