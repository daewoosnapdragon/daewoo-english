import { describe, it, expect } from 'vitest'
import { leastUsedFirst, areaOrder, tierForBehaviorGrade, homeSentence, assembleComment, varyNames } from '@/lib/commentBuilder'
import { fillBlanks, fillKnownBlanks } from '@/lib/phraseFacts'

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
    expect(tierForBehaviorGrade('A-')).toBe('strong'); expect(tierForBehaviorGrade('B+')).toBe('on track'); expect(tierForBehaviorGrade('C')).toBe('needs support'); expect(tierForBehaviorGrade('D+')).toBe('serious concern'); expect(tierForBehaviorGrade('E')).toBe('serious concern'); expect(tierForBehaviorGrade(null)).toBe('on track')
  })
})

describe('assembling', () => {
  it('turns a home activity into a sentence to parents', () => {
    expect(homeSentence('Read ten minutes each evening and tell someone one thing that happened.')).toBe('At home, read ten minutes each evening and tell someone one thing that happened.')
    expect(homeSentence('Ask {him} to retell the story in three parts.')).toBe('At home, ask {him} to retell the story in three parts.')
    expect(homeSentence('')).toBe('')
    expect(homeSentence('Compare two books on the same topic and say one difference.')).toBe('At home, compare two books on the same topic and say one difference.')
    expect(homeSentence('{name} can read to you.')).toBe('At home, {name} can read to you.')
    expect(homeSentence('English only at dinner for ten minutes.')).toBe('At home, English only at dinner for ten minutes.')
  })
  it('turns repeated sentence-opening names into the pronoun, every third one stays', () => {
    expect(varyNames('{name} reads. {name} writes. {name}\'s spelling is neat. {name} listens. {name} is kind.', true)).toBe('{name} reads. {he} writes. {his} spelling is neat. {name} listens. {he} is kind.')
    expect(varyNames('{name} reads. {name} writes.', false)).toBe('{name} reads. {name} writes.')
    expect(varyNames('{name} reads. We praise {name} often.', true)).toBe('{name} reads. We praise {name} often.')
  })
  it('fills the blanks the app knows and leaves the rest', () => {
    expect(fillBlanks('reads ____ words a minute, up from ____.', [71, 48])).toBe('reads 71 words a minute, up from 48.')
    expect(fillBlanks('reads ____ words a minute, up from ____.', [71, null])).toBe('reads ____ words a minute, up from ____.')
    const facts = { cwpmNow: 71.4, cwpmThen: 48, levelNow: 'H', levelThen: 'F', absences: 4, rubric: { Ideas: 4, Organization: 2 } }
    expect(fillKnownBlanks('reading-029', '{name} reads ____ words a minute, up from ____ in September.', facts)).toBe('{name} reads 71 words a minute, up from 48 in September.')
    expect(fillKnownBlanks('reading-030', "{name}'s reading level moved from ____ to ____ this semester.", facts)).toBe("{name}'s reading level moved from F to H this semester.")
    expect(fillKnownBlanks('reading-030', 'from ____ to ____', { ...facts, levelThen: 'H' })).toBe('from ____ to ____')
    expect(fillKnownBlanks('behavior-042', '{name} has missed ____ days this semester.', facts)).toBe('{name} has missed 4 days this semester.')
    expect(fillKnownBlanks('writing-033', 'scored ____ out of 4 for ideas and ____ for organization.', facts)).toBe('scored 4 out of 4 for ideas and 2 for organization.')
    expect(fillKnownBlanks('phonics-023', 'learned ____ patterns', facts)).toBe('learned ____ patterns')
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
      'Sophia has worked steadily this semester. She answers in full English sentences.',
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
