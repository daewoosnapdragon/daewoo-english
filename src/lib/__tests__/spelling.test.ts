import { describe, it, expect } from 'vitest'
import { toBritish, toAmerican, spell } from '@/lib/spelling'

describe('spelling', () => {
  it('converts the listed words both ways and keeps the case', () => {
    expect(toBritish('Her favorite color is gray. She organized the center and memorized it.')).toBe('Her favourite colour is grey. She organised the centre and memorised it.')
    expect(toAmerican('Her favourite colour is grey. She organised the centre and memorised it.')).toBe('Her favorite color is gray. She organized the center and memorized it.')
    expect(toBritish('Favorite COLOR')).toBe('Favourite COLOUR')
  })
  it('leaves words it does not know, and practice the noun, alone', () => {
    expect(toBritish('Short daily practice on lined paper would help. She is practicing.')).toBe('Short daily practice on lined paper would help. She is practising.')
    expect(toBritish('Minjun reads well.')).toBe('Minjun reads well.')
  })
  it('spell applies only for uk', () => {
    expect(spell('color', 'us')).toBe('color'); expect(spell('color', 'uk')).toBe('colour')
  })
})
