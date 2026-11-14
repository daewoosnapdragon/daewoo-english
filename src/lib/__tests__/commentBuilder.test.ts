import { describe, it, expect } from 'vitest'
import { leastUsedFirst, areaOrder, tierForBehaviorGrade, homeSentence, assembleComment } from '@/lib/commentBuilder'

describe('ordering', () => {
  it('offers the least-used sentences first, then bank order', () => {
    const ps = [{ id: 'a', text: 'A', sort_order: 1 }, { id: 'b', text: 'B', sort_order: 2 }, { id: 'c', text: 'C', sort_order: 3 }]
    expect(leastUsedFirst(ps, { a: 3, b: 0, c: 1 }).map(p => p.id)).toEqual(['b', 'c', 'a'])
    expect(leastUsedFirst(ps, {}).map(p => p.id)).toEqual(['a', 'b', 'c'])
  })
  it('puts the strongest area first and ungraded areas last', () => {
    expect(areaOrder({ reading: 86, phonics: null, writing: 74, speaking: 91, language: 85 }, ['reading', 'phonics', 'writing', 'speaking', 'language'])).toEqual(['speaking', 'reading', 'language', 'writing', 'phonics'])
  })
  it('maps a behavior letter to a tier', () => {
    expect(tierForBehaviorGrade('A-')).toBe('strong'); expect(tierForBehaviorGrade('B+')).toBe('on track'); expect(tierForBehaviorGrade('C')).toBe('needs support'); expect(tierForBehaviorGrade(null)).toBe('on track')
  })
})

describe('assembling', () => {
  it('turns a home activity into a sentence to parents', () => {
    expect(homeSentence('Read ten minutes each evening and tell someone one thing that happened.')).toBe('At home, read ten minutes each evening and tell someone one thing that happened.')
    expect(homeSentence('Ask {him} to retell the story in three parts.')).toBe('At home, ask {him} to retell the story in three parts.')
    expect(homeSentence('')).toBe('')
  })
  it('writes the paragraphs in reading order and fills the student in', () => {
    const text = assembleComment({
      opener: '{name} has worked steadily this semester.',
      areas: [{ area: 'speaking', sentences: ['{name} answers in full English sentences.'] }, { area: 'reading', sentences: [] }, { area: 'writing', sentences: ['{name} has good ideas and is learning to put them in order before writing.', '{he} writes an opinion and a reason.'] }],
      behavior: ['{name} helps classmates who are stuck without being asked.'],
      nextSteps: ['{name} is learning to write three sentences that stay on one topic.'],
      home: ['Three sentences about the day: what happened, who was there, how it felt.'],
      closer: 'Keep it up, {name}!',
    }, { name: 'Sophia', pronoun: 'she' })
    expect(text).toBe([
      'Sophia has worked steadily this semester. Sophia answers in full English sentences.',
      'Sophia has good ideas and is learning to put them in order before writing. She writes an opinion and a reason.',
      'Sophia helps classmates who are stuck without being asked.',
      'Sophia is learning to write three sentences that stay on one topic. At home, three sentences about the day: what happened, who was there, how it felt.',
      'Keep it up, Sophia!',
    ].join('\n\n'))
  })
  it('is empty when nothing is ticked', () => {
    expect(assembleComment({ opener: null, areas: [], behavior: [], nextSteps: [], home: [], closer: null }, { name: 'X', pronoun: null })).toBe('')
  })
})
