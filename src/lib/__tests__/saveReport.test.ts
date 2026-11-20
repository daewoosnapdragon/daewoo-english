import { describe, expect, it } from 'vitest'
import { nameList, notSavedMessage } from '@/lib/saveReport'

// A failed batch save names the students it missed, five at most.

describe('nameList', () => {
  it('joins one, two and several names in plain English', () => {
    expect(nameList(['Mia'], false)).toBe('Mia')
    expect(nameList(['Mia', 'Noah'], false)).toBe('Mia and Noah')
    expect(nameList(['Mia', 'Noah', 'Olive'], false)).toBe('Mia, Noah and Olive')
  })
  it('stops at five and counts the rest', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    expect(nameList(names, false)).toBe('A, B, C, D, E and 2 more')
    expect(nameList(names, true)).toBe('A, B, C, D, E 외 2명')
  })
})

describe('notSavedMessage', () => {
  it('says whose scores did not save and that the entries are kept', () => {
    expect(notSavedMessage(['Mia', 'Noah'], false)).toBe('Could not save scores for Mia and Noah. What you entered is still here.')
    expect(notSavedMessage(['Mia'], false, { en: 'comments', ko: '코멘트' })).toBe('Could not save comments for Mia. What you entered is still here.')
    expect(notSavedMessage(['Mia'], true)).toContain('Mia의 점수')
  })
})
