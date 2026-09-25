import { describe, it, expect } from 'vitest'
import {
  isCorrectAnswer, acceptedLetters, hasMultipleKeys,
  compIsCountable, compRatioForComposite, capComponent, COMP_FRUSTRATION_RATIO, COMPONENT_CAP,
  writingWasMarked, writingTotalFrom, writtenCompleteFrom,
  compositeWeightsFor,
} from '@/lib/utils'

const ABCD = ['A', 'B', 'C', 'D']

describe('answer keys', () => {
  it('scores the single key and nothing else', () => {
    expect(isCorrectAnswer({ correct: 'B' }, 'B')).toBe(true)
    expect(isCorrectAnswer({ correct: 'B' }, 'A')).toBe(false)
    expect(isCorrectAnswer({ correct: 'B' }, null)).toBe(false)
    expect(isCorrectAnswer({ correct: 'B' }, '')).toBe(false)
  })
  it('scores accepted alternatives', () => {
    const q = { correct: 'B', acceptable: ['D'] }
    expect(isCorrectAnswer(q, 'D')).toBe(true)
    expect(isCorrectAnswer(q, 'C')).toBe(false)
    expect(acceptedLetters(q, ABCD)).toEqual(['B', 'D'])
    expect(hasMultipleKeys(q)).toBe(true)
  })
  it('acceptAny scores any answered letter but never a blank', () => {
    const q = { correct: 'A', acceptAny: true }
    expect(isCorrectAnswer(q, 'D')).toBe(true)
    expect(isCorrectAnswer(q, null)).toBe(false)
    expect(acceptedLetters(q, ABCD)).toEqual(ABCD)
    expect(hasMultipleKeys(q)).toBe(true)
  })
  it('an empty acceptable list is still a single key', () => {
    expect(hasMultipleKeys({ correct: 'A', acceptable: [] })).toBe(false)
    expect(hasMultipleKeys({ correct: 'A' })).toBe(false)
  })
})

describe('comprehension: countable, not administered, not entered', () => {
  it('nothing counts without a record or a total', () => {
    expect(compIsCountable(null)).toBe(false)
    expect(compIsCountable({ comp_total: null })).toBe(false)
    expect(compIsCountable({ comp_total: 5, comp_not_administered: true })).toBe(false)
  })
  it('a genuine zero counts when questions were scored', () => {
    expect(compIsCountable({ comp_total: 0, comp_answered: 3 })).toBe(true)
    expect(compIsCountable({ comp_total: 0, comp_answered: 0 })).toBe(false)
  })
  it('legacy rows without comp_answered count only positive totals', () => {
    expect(compIsCountable({ comp_total: 0 })).toBe(false)
    expect(compIsCountable({ comp_total: 4 })).toBe(true)
  })
  it('ratio is total over max, capped at the component ceiling', () => {
    expect(compRatioForComposite({ comp_total: 6, comp_max: 10, comp_answered: 10 })).toBeCloseTo(0.6, 9)
    expect(compRatioForComposite({ comp_total: 20, comp_max: 10, comp_answered: 10 })).toBe(COMPONENT_CAP)
    expect(compRatioForComposite({ comp_total: 15, comp_answered: 15 })).toBe(1) // default max 15
  })
  it('not administered scores at the top of the frustration band', () => {
    expect(compRatioForComposite({ comp_not_administered: true, comp_max: 10, comp_frustration_max: 4 })).toBeCloseTo(0.4, 9)
    expect(compRatioForComposite({ comp_not_administered: true })).toBe(COMP_FRUSTRATION_RATIO)
  })
  it('not entered yet is null', () => {
    expect(compRatioForComposite({})).toBeNull()
    expect(compRatioForComposite(null)).toBeNull()
  })
  it('capComponent clamps to 1.0 and passes null through', () => {
    expect(capComponent(1.2)).toBe(1)
    expect(capComponent(0.7)).toBe(0.7)
    expect(capComponent(null)).toBeNull()
  })
})

describe('writing: unmarked is not a zero', () => {
  it('an empty rubric means the rubric was never opened', () => {
    expect(writingWasMarked({ written_rubric: {} })).toBe(false)
    expect(writingTotalFrom({ written_rubric: {}, writing: 0 })).toBeNull()
  })
  it('a filled rubric is summed from its categories, not the cached scalar', () => {
    expect(writingWasMarked({ written_rubric: { ideas: 3 } })).toBe(true)
    expect(writingTotalFrom({ written_rubric: { ideas: 3, org: 4, extra: 'x' }, writing: 0 })).toBe(7)
  })
  it('rows without a rubric trust the stored total', () => {
    expect(writingWasMarked({ writing: 0 })).toBe(true)
    expect(writingTotalFrom({ writing: 12 })).toBe(12)
    expect(writingTotalFrom({}, { writing_total: 9 })).toBe(9)
    expect(writingTotalFrom({})).toBeNull()
    expect(writingWasMarked({})).toBe(false)
  })
  it('written_complete is read from either raw flag or the calc', () => {
    expect(writtenCompleteFrom({ written_complete: true })).toBe(true)
    expect(writtenCompleteFrom({ w_test_complete: true })).toBe(true)
    expect(writtenCompleteFrom({}, { written_complete: true })).toBe(true)
    expect(writtenCompleteFrom({})).toBe(false)
  })
})

describe('composite weights per grade', () => {
  it('Grades 2, 3 and 5 sum to 1; Grade 4 sums to 0.95 because its short-writing share is deliberately not reassigned', () => {
    const sum = (g: number) => Object.values(compositeWeightsFor(g)).reduce((a, b) => a + (b ?? 0), 0)
    for (const g of [2, 3, 5]) expect(sum(g)).toBeCloseTo(1, 9)
    expect(sum(4)).toBeCloseTo(0.95, 9)
  })
  it('Grade 2 has a decoding term; Grade 4 has no short writing', () => {
    expect(compositeWeightsFor(2).decoding).toBe(0.2)
    expect(compositeWeightsFor(4).shortWriting).toBeUndefined()
    expect(compositeWeightsFor(3).shortWriting).toBe(0.05)
  })
  it('accepts a string grade and falls back for unknown grades', () => {
    expect(compositeWeightsFor('3')).toEqual(compositeWeightsFor(3))
    expect(compositeWeightsFor(9)).toEqual({ oral: 0.45, mc: 0.25, shortWriting: 0.05, writing: 0.25 })
  })
})
