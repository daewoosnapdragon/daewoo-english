import { describe, it, expect } from 'vitest'
import { standardInfo, standardTitle } from '../standardText'

describe('standardInfo', () => {
  it('finds a code whatever the case of its sub-letter', () => {
    const a = standardInfo('RF.1.3C'), b = standardInfo('RF.1.3c')
    expect(a.code).toBe('RF.1.3c')
    expect(a.text).toBeTruthy()
    expect(a.text).toBe(b.text)
  })
  it('gives the plain name and text in one hover line, and the code alone when unknown', () => {
    expect(standardTitle('RL.1.1').startsWith('RL.1.1: ')).toBe(true)
    expect(standardTitle('ZZ.9.9')).toBe('ZZ.9.9')
  })
})
