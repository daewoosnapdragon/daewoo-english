import { describe, it, expect } from 'vitest'
import { fillPhrase, tierForScore, suggestBand, gradeBand, phrasePattern, usageCounts, insertAt, goesByFrom } from '@/lib/phrases'

describe('filling a phrase', () => {
  it('fills the name and pronouns, capitalising at a sentence start', () => {
    expect(fillPhrase('{name} reads well. {he} enjoys {his} books and we praise {him}.', { name: 'Minjun', pronoun: 'he' })).toBe('Minjun reads well. He enjoys his books and we praise him.')
    expect(fillPhrase('{name} reads well. {he} enjoys {his} books and we praise {him}.', { name: 'Jisoo', pronoun: 'she' })).toBe('Jisoo reads well. She enjoys her books and we praise her.')
    expect(fillPhrase('{name} reads well. {he} {is} kind.', { name: 'Sam', pronoun: 'they' })).toBe('Sam reads well. They are kind.')
  })
  it('leaves pronoun holes when no pronoun is set, so the gap shows', () => {
    expect(fillPhrase('{name} reads {his} book.', { name: 'Minjun', pronoun: null })).toBe('Minjun reads {his} book.')
  })
})

describe('the name a student goes by', () => {
  it('takes the bracketed English name, else the given name after the family name', () => {
    expect(goesByFrom('Kim Bo Min (Sophia)')).toBe('Sophia')
    expect(goesByFrom('Kim Bo Min')).toBe('Bo Min')
    expect(goesByFrom('Lee Jun')).toBe('Jun')
    expect(goesByFrom('Park  Seo-yeon ( Ellie )')).toBe('Ellie')
    expect(goesByFrom('Minjun')).toBe('Minjun')
    expect(goesByFrom('')).toBe('')
  })
  it('lets a confirmed name win', () => {
    expect(goesByFrom('Kim Bo Min (Sophia)', 'Bomin')).toBe('Bomin')
    expect(goesByFrom('Kim Bo Min (Sophia)', '  ')).toBe('Sophia')
  })
})

describe('tier and band', () => {
  it('maps letters to tiers', () => {
    expect(tierForScore(91)).toBe('strong'); expect(tierForScore(84)).toBe('on track'); expect(tierForScore(74)).toBe('needs support'); expect(tierForScore(null)).toBeNull()
  })
  it('starts from the grade and lets WIDA and a weak letter move it', () => {
    expect(suggestBand(1, null, null)).toBe('Beginning')
    expect(suggestBand(1, 4, null)).toBe('Intermediate')
    expect(suggestBand(3, null, null)).toBe('Intermediate')
    expect(suggestBand(5, null, null)).toBe('Advanced')
    expect(suggestBand(5, 1, null)).toBe('Intermediate')
    expect(suggestBand(4, null, 62)).toBe('Intermediate')
    expect(suggestBand(null, null, null)).toBe('Intermediate')
    expect(gradeBand(2)).toBe('1-2'); expect(gradeBand(3)).toBe('3-5')
  })
})

describe('usage counts', () => {
  const phrase = { id: 'p1', text: '{name} is making ____ progress in writing but would benefit from ____ to continue showing growth.' }
  it('matches the phrase however it was filled in', () => {
    const re = phrasePattern(phrase.text)
    expect(re.test('Minjun is making good progress in writing but would benefit from daily practice to continue showing growth.')).toBe(true)
    expect(re.test('Seo-yeon is making steady progress in  writing but would benefit from reading aloud to continue showing growth. She')).toBe(true)
    expect(re.test('Minjun is making progress in writing.')).toBe(false)
  })
  it('counts comments, pronoun variants included', () => {
    const p2 = { id: 'p2', text: '{name} listens attentively during lessons. {he} waits for the speaker to finish.' }
    const comments = ['Minjun listens attentively during lessons. He waits for the speaker to finish.', 'Jisoo listens attentively during lessons. She waits for the speaker to finish. Jisoo is making good progress in writing but would benefit from cards to continue showing growth.', '']
    expect(usageCounts([phrase, p2], comments)).toEqual({ p1: 1, p2: 2 })
  })
})

describe('inserting at the cursor', () => {
  it('adds the spaces the neighbours lack', () => {
    expect(insertAt('Minjun reads well.', 18, 'He listens.')).toEqual({ text: 'Minjun reads well. He listens.', cursor: 30 })
    expect(insertAt('Minjun reads well. ', 19, 'He listens.')).toEqual({ text: 'Minjun reads well. He listens.', cursor: 30 })
    expect(insertAt('', 0, 'He listens.')).toEqual({ text: 'He listens.', cursor: 11 })
    expect(insertAt('A.B.', 2, 'X.')).toEqual({ text: 'A. X. B.', cursor: 6 })
  })
})
