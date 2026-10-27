import { describe, it, expect } from 'vitest'
import { mapFromSections, sectionsFromMap } from '@/lib/sections'
import { parseAnswerKey } from '@/lib/answerKey'
import type { QuestionMapItem } from '@/types'

const norm = (m: QuestionMapItem[]) => m.map(q => ({ num: q.num, type: q.type, max_points: q.max_points, standard: q.standard || undefined, answer_key: q.answer_key || undefined, rubric: q.rubric || null }))

describe('sectionsFromMap', () => {
  it('folds a typed key back into sections and derives the same map', () => {
    const map = parseAnswerKey('ACBDA BDCAB TF 5 5 12r')
    const { sections, overrides } = sectionsFromMap(map)
    expect(sections.map(s => s.type)).toEqual(['mc', 'true_false', 'short_answer', 'rubric'])
    expect(sections[0].key).toBe('ACBDABDCAB')
    expect(sections[2].count).toBe(2)
    expect(norm(mapFromSections(sections, overrides))).toEqual(norm(map))
  })
  it('splits sections where points or standards change and keeps odd questions as overrides', () => {
    const map: QuestionMapItem[] = [
      { num: 1, type: 'mc', max_points: 1, answer_key: 'A', standard: 'RL.3.1' },
      { num: 2, type: 'mc', max_points: 1, answer_key: 'B', standard: 'RL.3.1' },
      { num: 3, type: 'mc', max_points: 2, answer_key: 'C', standard: 'RL.3.1' },
      { num: 4, type: 'short_answer', max_points: 5, standard: 'W.3.2' },
      { num: 5, type: 'matching', max_points: 3 },
      { num: 6, type: 'rubric', max_points: 12, rubric: { name: 'Writing', criteria: [{ key: 'a', label: 'A', levels: ['1', '2', '3', '4'] }, { key: 'b', label: 'B', levels: ['1', '2', '3', '4'] }, { key: 'c', label: 'C', levels: ['1', '2', '3', '4'] }] } },
      { num: 7, type: 'rubric', max_points: 10, rubric: { name: 'Writing', criteria: [{ key: 'a', label: 'A', levels: ['1', '2', '3', '4'] }, { key: 'b', label: 'B', levels: ['1', '2', '3', '4'] }, { key: 'c', label: 'C', levels: ['1', '2', '3', '4'] }] } },
    ]
    const { sections, overrides } = sectionsFromMap(map)
    expect(sections.map(s => [s.type, s.count || s.key.length])).toEqual([['mc', 2], ['mc', 1], ['short_answer', 1], ['short_answer', 1], ['rubric', 2]])
    expect(overrides[5]).toEqual({ type: 'matching' })
    expect(overrides[7]).toEqual({ max_points: 10 })
    expect(norm(mapFromSections(sections, overrides))).toEqual(norm(map))
  })
  it('handles a choice question that lost its key', () => {
    const map: QuestionMapItem[] = [{ num: 1, type: 'mc', max_points: 1, answer_key: 'B' }, { num: 2, type: 'mc', max_points: 1 }]
    const { sections, overrides } = sectionsFromMap(map)
    expect(sections).toHaveLength(1)
    expect(overrides[2]).toEqual({ answer_key: undefined })
    expect(norm(mapFromSections(sections, overrides))).toEqual(norm(map))
  })
})
