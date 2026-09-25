import { describe, it, expect } from 'vitest'
import { parseAnswerKey, keyToString, keyTotal, markChoice, parseRange, rangeLabel } from '@/lib/answerKey'

describe('parseAnswerKey', () => {
  it('turns letters, T/F and numbers into items', () => {
    const map = parseAnswerKey('ACBDA BDCAB TF 2 2 3')
    expect(map).toHaveLength(15)
    expect(map[0]).toEqual({ num: 1, type: 'mc', max_points: 1, answer_key: 'A' })
    expect(map[10]).toEqual({ num: 11, type: 'true_false', max_points: 1, answer_key: 'T' })
    expect(map[11]).toEqual({ num: 12, type: 'true_false', max_points: 1, answer_key: 'F' })
    expect(map[12]).toEqual({ num: 13, type: 'short_answer', max_points: 2 })
    expect(map[14]).toEqual({ num: 15, type: 'short_answer', max_points: 3 })
    expect(keyTotal(map)).toBe(19)
  })
  it('ignores case, spacing and stray characters', () => {
    expect(parseAnswerKey('  a b   c\n d ').map(q => q.answer_key)).toEqual(['A', 'B', 'C', 'D'])
    expect(parseAnswerKey('AB?C')).toHaveLength(3)
    expect(parseAnswerKey('')).toEqual([])
  })
  it('marks rubric items with r and keeps decimals', () => {
    const map = parseAnswerKey('4r 2.5')
    expect(map[0]).toEqual({ num: 1, type: 'rubric', max_points: 4 })
    expect(map[1].max_points).toBe(2.5)
  })
  it('keeps standards and MC point overrides when the key is retyped', () => {
    const before = parseAnswerKey('ABC').map(q => ({ ...q, standard: `RL.3.${q.num}`, max_points: 2 }))
    const after = parseAnswerKey('ABD 3', before)
    expect(after[2]).toMatchObject({ answer_key: 'D', standard: 'RL.3.3', max_points: 2 })
    expect(after[3]).toMatchObject({ type: 'short_answer', max_points: 3 })
  })
  it('round-trips through keyToString', () => {
    const text = 'ACBDA BDCAB TF 2 2 3r'
    expect(keyToString(parseAnswerKey(text))).toBe(text)
  })
})

describe('markChoice', () => {
  it('awards the item points for the keyed letter only', () => {
    const q = { num: 1, type: 'mc' as const, max_points: 2, answer_key: 'B' }
    expect(markChoice(q, 'b')).toBe(2)
    expect(markChoice(q, 'A')).toBe(0)
    expect(markChoice(q, undefined)).toBe(0)
  })
})

describe('ranges', () => {
  it('parses and clips ranges', () => {
    expect(parseRange('1-5', 15)).toEqual([1, 2, 3, 4, 5])
    expect(parseRange('6–10, 14', 15)).toEqual([6, 7, 8, 9, 10, 14])
    expect(parseRange('12-20', 15)).toEqual([12, 13, 14, 15])
    expect(parseRange('x', 15)).toEqual([])
  })
  it('labels runs', () => {
    expect(rangeLabel([1, 2, 3, 5, 7, 8])).toBe('1–3, 5, 7–8')
  })
})
