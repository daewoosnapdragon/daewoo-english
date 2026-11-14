import { describe, it, expect } from 'vitest'
import { wordCount, findBanned, findPlaceholders, findOtherNames, phraseOverlap, nextStepCount, findTemplateTics, averageSentenceLength, commentChecks } from '@/lib/commentChecks'

const MINJUN = `Minjun has settled into Grade 3 English with a steady, careful approach. His reading level rose from F to H this semester and he now reads 71 words a minute, which lets him follow the chapter books we read together. He can find the main idea of a passage and pick out two or three details to support it.

Listening is his strongest area. He follows multi-step directions the first time and often helps the students beside him get started.`

describe('word count', () => {
  it('counts words, not blanks or stray punctuation', () => {
    expect(wordCount('')).toBe(0)
    expect(wordCount('Minjun reads well.')).toBe(3)
    expect(wordCount('Minjun reads ____ words — well.')).toBe(4)
    expect(wordCount('민준 reads well')).toBe(3)
  })
})

describe('banned phrases', () => {
  it('catches talk of moving levels in its usual forms', () => {
    expect(findBanned('He may level up next semester.')).toHaveLength(1)
    expect(findBanned('She is at risk of leveling down.')).toHaveLength(1)
    expect(findBanned('We will discuss a level down with the office.')).toHaveLength(1)
    expect(findBanned('His reading level rose from F to H.')).toHaveLength(0)
    expect(findBanned('She reads at grade level now.')).toHaveLength(0)
  })
  it('catches favoritism and comparison', () => {
    expect(findBanned('Jisoo is my favorite student.')[0]).toContain('favoritism')
    expect(findBanned('She is the best writer in the class.')[0]).toContain('compares')
    expect(findBanned('He works harder than other students.')[0]).toContain('compares')
    expect(findBanned('She did her best on the test.')).toHaveLength(0)
  })
})

describe('placeholders', () => {
  it('finds bank leftovers and unresolved pronouns once each', () => {
    expect(findPlaceholders('STUDENT NAME has worked hard. He/she enjoys reading; his/her writing is neat. He/she is kind.')).toEqual(['STUDENT NAME', 'He/she', 'his/her'])
    expect(findPlaceholders('Please encourage him to ____ each day.')).toEqual(['____'])
    expect(findPlaceholders('He would benefit from XXXXX.')).toEqual(['XXXXX'])
    expect(findPlaceholders('He reads well.')).toEqual([])
  })
})

describe('other names', () => {
  const roster = ['Minjun Kim', 'Seo-yeon Park', 'Jisoo Lee', 'Grace Choi', 'Ian Oh', 'Jo Han']
  it('reports another student but never this one', () => {
    expect(findOtherNames(MINJUN, 'Minjun Kim', roster)).toEqual([])
    expect(findOtherNames('Minjun works well with Jisoo and often helps Seo-yeon.', 'Minjun Kim', roster)).toEqual(['Seo-yeon', 'Jisoo'])
  })
  it('matches whole words only and ignores names shorter than three letters', () => {
    expect(findOtherNames('Minjun has grace under pressure and is a brilliant kid.', 'Minjun Kim', roster)).toEqual([])
    expect(findOtherNames('Grace helped him.', 'Minjun Kim', roster)).toEqual(['Grace'])
    expect(findOtherNames('Ian is kind.', 'Minjun Kim', roster)).toEqual(['Ian'])
    expect(findOtherNames('Jo is kind.', 'Minjun Kim', roster)).toEqual([])
  })
})

describe('phrase overlap', () => {
  const other = { text: MINJUN.replace(/Minjun/g, 'Jisoo').replace(/\bHis\b/g, 'Her').replace(/\bhe\b/g, 'she').replace(/\bhim\b/g, 'her').replace(/\bhis\b/g, 'her'), label: 'Jisoo' }
  it('finds a comment copied with the name and pronouns changed', () => {
    const r = phraseOverlap(MINJUN, [other], ['Minjun', 'Jisoo'])
    expect(r).not.toBeNull()
    expect(r!.label).toBe('Jisoo')
    expect(r!.pct).toBeGreaterThan(50)
  })
  it('is low for unrelated comments and null for very short ones', () => {
    const r = phraseOverlap(MINJUN, [{ text: 'Jisoo writes neat paragraphs and asks good questions in science. Her spelling has improved since October.', label: 'Jisoo' }])
    expect(r!.pct).toBeLessThan(10)
    expect(phraseOverlap('Minjun reads well and listens.', [other])).toBeNull()
  })
})

describe('softer hints', () => {
  it('counts next steps roughly', () => {
    expect(nextStepCount('He needs to read more. He should also write daily. He would benefit from flashcards. He struggles with spelling.')).toBe(4)
    expect(nextStepCount(MINJUN)).toBe(0)
  })
  it('spots the template tics the bank warns about', () => {
    expect(findTemplateTics('Minjun consistently demonstrates good effort. Overall, he excels. With strong grammar skills, he writes well.')).toEqual(['consistently demonstrates', 'Overall,', 'With strong'])
    expect(findTemplateTics(MINJUN)).toEqual([])
  })
  it('measures sentence length', () => {
    expect(averageSentenceLength('One two three. Four five six seven.')).toBe(3.5)
    expect(averageSentenceLength('')).toBe(0)
  })
})

describe('the grey line', () => {
  const base = { studentName: 'Minjun Kim', rosterNames: ['Minjun Kim', 'Jisoo Lee'], otherComments: [] as Array<{ text: string; label: string }> }
  it('is empty for an empty box and starts with the word count otherwise', () => {
    expect(commentChecks({ ...base, text: '' })).toEqual([])
    const h = commentChecks({ ...base, text: MINJUN })
    expect(h[0].kind).toBe('words')
    expect(h[0].text).toMatch(/^\d+ words · aim for about 200$/)
    expect(h).toHaveLength(1)
  })
  it('orders the embarrassing hints before the soft ones', () => {
    const h = commentChecks({ ...base, text: MINJUN + ' He/she may level up. Jisoo agrees. He needs to read more. He should write daily. He would benefit from cards. He struggles with spelling.' })
    expect(h.map(x => x.kind)).toEqual(['words', 'name', 'placeholder', 'banned', 'list'])
  })
})
