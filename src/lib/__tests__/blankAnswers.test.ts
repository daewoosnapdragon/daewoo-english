import { describe, it, expect } from 'vitest'
import { isMarked, isAnswered, blankResponse, skippedItems, finalizeBlanks, blankCount } from '@/lib/blankAnswers'
import type { QuestionMapItem } from '@/types'

const rubric: QuestionMapItem = { num: 4, type: 'rubric', max_points: 8, rubric: { name: 'Paragraph', criteria: [
  { key: 'ideas', label: 'Ideas', levels: ['a', 'b', 'c', 'd'] },
  { key: 'conv', label: 'Conventions', levels: ['a', 'b', 'c', 'd'] },
] } }
const map: QuestionMapItem[] = [
  { num: 1, type: 'mc', max_points: 1, answer_key: 'A' },
  { num: 2, type: 'true_false', max_points: 1, answer_key: 'T' },
  { num: 3, type: 'short_answer', max_points: 3 },
  rubric,
]

describe('isMarked / isAnswered', () => {
  it('treats a blank as marked and answered on every item type', () => {
    map.forEach(it => {
      expect(isMarked(blankResponse(it), it)).toBe(true)
      expect(isAnswered(blankResponse(it), it)).toBe(true)
    })
  })
  it('needs a letter on choice items and points on written ones', () => {
    expect(isMarked({ points: 0 }, map[0])).toBe(false)
    expect(isMarked({ answer: 'B' }, map[0])).toBe(true)
    expect(isMarked({ points: 0 }, map[2])).toBe(true)
    expect(isMarked({}, map[2])).toBe(false)
  })
  it('a rubric is marked at one criterion but answered only when every criterion has a level', () => {
    expect(isMarked({ levels: { ideas: 2 } }, rubric)).toBe(true)
    expect(isAnswered({ levels: { ideas: 2 } }, rubric)).toBe(false)
    expect(isAnswered({ levels: { ideas: 2, conv: 0 } }, rubric)).toBe(true)
  })
})

describe('blankResponse', () => {
  it('earns 0 points, and 0 on every rubric criterion', () => {
    expect(blankResponse(map[0])).toEqual({ blank: true, points: 0 })
    expect(blankResponse(rubric)).toEqual({ blank: true, points: 0, levels: { ideas: 0, conv: 0 } })
  })
})

describe('skippedItems', () => {
  it('is only the unmarked questions before the furthest mark', () => {
    const row = { 1: { answer: 'A', points: 1 }, 3: { points: 2 } }
    expect(skippedItems(row, map).map(q => q.num)).toEqual([2])
  })
  it('is empty on an untouched paper and on one marked in order so far', () => {
    expect(skippedItems(undefined, map)).toEqual([])
    expect(skippedItems({ 1: { answer: 'A', points: 1 } }, map)).toEqual([])
  })
})

describe('finalizeBlanks', () => {
  it('leaves an untouched paper alone, so an unscored student is never all zeros', () => {
    expect(finalizeBlanks(undefined, map)).toBeUndefined()
    const empty = {}
    expect(finalizeBlanks(empty, map)).toBe(empty)
  })
  it('turns every unmarked question on a started paper into a blank worth 0', () => {
    const row = { 2: { answer: 'F', points: 0 } }
    const out = finalizeBlanks(row, map)!
    expect(out[2]).toEqual({ answer: 'F', points: 0 })
    expect(out[1]).toEqual({ blank: true, points: 0 })
    expect(out[3]).toEqual({ blank: true, points: 0 })
    expect(out[4]).toEqual({ blank: true, points: 0, levels: { ideas: 0, conv: 0 } })
    expect(blankCount(out, map)).toBe(3)
  })
  it('keeps a half-scored rubric as it is; only wholly unmarked questions become blanks', () => {
    const row = { 1: { answer: 'A', points: 1 }, 4: { levels: { ideas: 3 }, points: 3 } }
    const out = finalizeBlanks(row, map)!
    expect(out[4]).toEqual({ levels: { ideas: 3 }, points: 3 })
    expect(out[2].blank).toBe(true)
  })
  it('returns the same row when the paper is already complete', () => {
    const row = { 1: { answer: 'A', points: 1 }, 2: { answer: 'T', points: 1 }, 3: { points: 3 }, 4: { levels: { ideas: 4, conv: 4 }, points: 8 } }
    expect(finalizeBlanks(row, map)).toBe(row)
  })
})
