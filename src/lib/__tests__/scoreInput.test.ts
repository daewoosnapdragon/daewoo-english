import { describe, it, expect } from 'vitest'
import { parseScoreInput } from '@/lib/scoreInput'

describe('parseScoreInput', () => {
  it('reads plain numbers and decimals', () => {
    expect(parseScoreInput('7', 10)).toBe(7)
    expect(parseScoreInput(' 7.5 ', 10)).toBe(7.5)
    expect(parseScoreInput('7.333', 10)).toBe(7.33)
  })
  it('reads a fraction of the total, with or without the = sign', () => {
    expect(parseScoreInput('7/10', 20)).toBe(14)
    expect(parseScoreInput('=3/4', 28)).toBe(21)
    expect(parseScoreInput('1/3', 10)).toBe(3.33)
  })
  it('clears on empty and rejects anything that is not a score', () => {
    expect(parseScoreInput('', 10)).toBeNull()
    expect(parseScoreInput('   ', 10)).toBeNull()
    expect(parseScoreInput('abc', 10)).toBeUndefined()
    expect(parseScoreInput('7/0', 10)).toBeUndefined()
    expect(parseScoreInput('7a', 10)).toBeUndefined()
  })
})
