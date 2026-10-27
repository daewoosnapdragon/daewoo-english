import { describe, it, expect } from 'vitest'
import { remarkResponses } from '@/lib/remark'
import type { QuestionMapItem, ItemResponse } from '@/types'

const map: QuestionMapItem[] = [
  { num: 1, type: 'mc', max_points: 1, answer_key: 'A' },
  { num: 2, type: 'mc', max_points: 1, answer_key: 'C' },
  { num: 3, type: 'short_answer', max_points: 5, standard: 'W.3.2' },
  { num: 4, type: 'true_false', max_points: 2, answer_key: 'T' },
]
const old: ItemResponse[] = [
  { q: 1, type: 'mc', answer: 'A', correct: true, points: 1, max: 1 },
  { q: 2, type: 'mc', answer: 'B', correct: true, points: 1, max: 1 },
  { q: 3, type: 'short_answer', points: 4, max: 3 },
]

describe('remarkResponses', () => {
  it('scores the saved answers against the corrected key', () => {
    const next = remarkResponses(map, old)
    expect(next[0]).toMatchObject({ q: 1, answer: 'A', correct: true, points: 1 })
    expect(next[1]).toMatchObject({ q: 2, answer: 'B', correct: false, points: 0 })
  })
  it('keeps written points, capped at the new maximum, and carries the standard', () => {
    const next = remarkResponses(map, old)
    expect(next[2]).toMatchObject({ q: 3, points: 4, max: 5, standard: 'W.3.2' })
    expect(remarkResponses([{ ...map[2], max_points: 3 }], old)[0].points).toBe(3)
  })
  it('leaves a new question unmarked and drops a removed one', () => {
    const next = remarkResponses(map, old)
    expect(next).toHaveLength(4)
    expect(next[3]).toEqual({ q: 4, type: 'true_false', max: 2 })
    expect(remarkResponses(map.slice(0, 2), old)).toHaveLength(2)
  })
  it('keeps blanks as blanks worth nothing', () => {
    const next = remarkResponses(map, [{ q: 1, type: 'mc', blank: true, points: 0, max: 1 }])
    expect(next[0]).toMatchObject({ q: 1, blank: true, points: 0, correct: false })
  })
})
