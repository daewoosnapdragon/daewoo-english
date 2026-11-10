import { describe, it, expect } from 'vitest'
import {
  PHONICS_SKILLS, PHONICS_SKILL_IDS, PHONICS_GROUPS, phonicsSkill, orderSkills,
  scoreSkill, scoreCheck, latestBySkill, phonicsBand, summarizeStudent, phonicsOneLiner, notYetSecure, nextMark, longestErrorRun,
  type PhonicsCheckRow, type PhonicsMark,
} from '@/lib/phonics'

const check = (over: Partial<PhonicsCheckRow>): PhonicsCheckRow => ({
  id: 'c1', student_id: 's1', date: '2026-11-10', assessed_by: null, skills: [], results: {}, heard: {}, observations: {}, notes: '', content_version: 'quick-checks-2026-11', created_at: '2026-11-10T01:00:00Z', ...over,
})
/** The first n words of a sheet correct, the rest errors. */
const firstN = (skill: string, n: number): Record<string, PhonicsMark> =>
  Object.fromEntries(phonicsSkill(skill)!.words.map((w, i) => [w, i < n ? 'correct' : 'error']))

describe('the packet as data', () => {
  it('has the twenty sheets, in the packet order, sixteen or twenty words each', () => {
    expect(PHONICS_SKILLS.length).toBe(20)
    expect(PHONICS_SKILL_IDS.slice(0, 3)).toEqual(['cvc', 'digraphs', 'blends'])
    expect(PHONICS_SKILL_IDS[PHONICS_SKILL_IDS.length - 1]).toBe('two_more_teams')
    PHONICS_SKILLS.forEach(s => expect([16, 20], s.id).toContain(s.words.length))
  })
  it('has unique ids, no repeated word on a sheet, and every sheet in a group', () => {
    expect(new Set(PHONICS_SKILL_IDS).size).toBe(PHONICS_SKILLS.length)
    const groups = new Set(PHONICS_GROUPS.map(g => g.id))
    PHONICS_SKILLS.forEach(s => {
      expect(groups.has(s.group), s.id).toBe(true)
      expect(new Set(s.words).size, s.id).toBe(s.words.length)
    })
  })
  it('keeps the printed words', () => {
    expect(phonicsSkill('cvc')!.words.slice(0, 4)).toEqual(['hat', 'big', 'hug', 'pet'])
    expect(phonicsSkill('diphthongs')!.words).toHaveLength(16)
    expect(phonicsSkill('two_more_teams')!.words.slice(-4)).toEqual(['mountain', 'lawyer', 'cashew', 'rowdy'])
  })
  it('orders skills in packet order and drops unknown ids', () => {
    expect(orderSkills(['silent_e', 'nope', 'cvc', 'digraphs'])).toEqual(['cvc', 'digraphs', 'silent_e'])
  })
})

describe('scoring a check', () => {
  it('counts correct, error and unread words out of the sheet', () => {
    const c = check({ skills: ['cvc'], results: { cvc: { hat: 'correct', big: 'correct', hug: 'error', pet: 'correct' } } })
    expect(scoreSkill(c, 'cvc')).toEqual({ skill: 'cvc', correct: 3, errors: 1, unread: 16, total: 20, pct: 15, automatic: false })
  })
  it('returns null for a sheet that was not part of the sitting', () => {
    const c = check({ skills: ['cvc'], results: { digraphs: { shop: 'correct' } } })
    expect(scoreSkill(c, 'digraphs')).toBeNull()
  })
  it('a sheet in the sitting with no marks is all unread, zero percent', () => {
    expect(scoreSkill(check({ skills: ['open'] }), 'open')).toMatchObject({ correct: 0, errors: 0, unread: 16, total: 16, pct: 0 })
  })
  it('still scores a word that has since left the sheet', () => {
    const c = check({ skills: ['cvc'], results: { cvc: { ...firstN('cvc', 20), zog: 'error' } } })
    expect(scoreSkill(c, 'cvc')).toMatchObject({ correct: 20, errors: 1, total: 21, pct: 95 })
  })
  it('carries the automatic tick from the observations', () => {
    const c = check({ skills: ['cvc'], results: { cvc: firstN('cvc', 20) }, observations: { cvc: ['automatic', 'pattern:short a'] } })
    expect(scoreSkill(c, 'cvc')!.automatic).toBe(true)
  })
  it('scoreCheck follows packet order whatever order sheets were saved in', () => {
    const c = check({ skills: ['vowel_teams', 'cvc'] })
    expect(scoreCheck(c).map(s => s.skill)).toEqual(['cvc', 'vowel_teams'])
  })
})

describe('the packet rubric', () => {
  it('bands: 18 of 20 is proficient, mastered when automatic; 14 developing; 13 beginning', () => {
    expect(phonicsBand({ pct: 90, automatic: false })).toBe('proficient')
    expect(phonicsBand({ pct: 90, automatic: true })).toBe('mastered')
    expect(phonicsBand({ pct: 70, automatic: true })).toBe('developing')
    expect(phonicsBand({ pct: 65, automatic: false })).toBe('beginning')
  })
})

describe('latest result per sheet', () => {
  it('keeps the later date for a sheet read twice, and the other sheets from the older check', () => {
    const older = check({ id: 'a', date: '2026-09-01', skills: ['cvc', 'digraphs'], results: { cvc: firstN('cvc', 10), digraphs: firstN('digraphs', 16) } })
    const newer = check({ id: 'b', date: '2026-11-01', skills: ['cvc'], results: { cvc: firstN('cvc', 18) } })
    const latest = latestBySkill([older, newer])
    expect(latest.cvc).toMatchObject({ checkId: 'b', date: '2026-11-01', score: { correct: 18 } })
    expect(latest.digraphs).toMatchObject({ checkId: 'a', score: { correct: 16 } })
  })
  it('on the same date, the later save wins', () => {
    const first = check({ id: 'a', created_at: '2026-11-10T01:00:00Z', skills: ['cvc'], results: { cvc: firstN('cvc', 6) } })
    const second = check({ id: 'b', created_at: '2026-11-10T02:00:00Z', skills: ['cvc'], results: { cvc: firstN('cvc', 14) } })
    expect(latestBySkill([first, second]).cvc.checkId).toBe('b')
  })
  it('summarises a student: counts, the sheet to work on, the highest secure one', () => {
    const c = check({
      skills: ['cvc', 'digraphs', 'silent_e', 'vowel_teams'],
      results: { cvc: firstN('cvc', 20), digraphs: firstN('digraphs', 14), silent_e: firstN('silent_e', 20), vowel_teams: firstN('vowel_teams', 4) },
      observations: { cvc: ['automatic'] },
    })
    const latest = latestBySkill([c])
    expect(summarizeStudent(latest)).toEqual({ tested: 4, secure: 2, developing: 1, beginning: 1, frontier: 'digraphs', highestSecure: 'silent_e', lastDate: '2026-11-10' })
    expect(notYetSecure(latest)).toEqual(['digraphs', 'vowel_teams'])
    expect(phonicsOneLiner(latest)).toBe('CVC 20/20 · Digraphs 14/20 · Silent e 20/20 · Teams 4/20')
  })
  it('an untested student has no frontier', () => {
    expect(summarizeStudent({})).toEqual({ tested: 0, secure: 0, developing: 0, beginning: 0, frontier: null, highestSecure: null, lastDate: null })
  })
})

describe('marking tiles', () => {
  it('cycles nothing → correct → error → nothing', () => {
    expect(nextMark(undefined)).toBe('correct')
    expect(nextMark('correct')).toBe('error')
    expect(nextMark('error')).toBeUndefined()
  })
  it('finds the longest run of errors in sheet order', () => {
    const words = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(longestErrorRun(words, { a: 'error', b: 'error', c: 'correct', d: 'error', e: 'error', f: 'error' })).toBe(3)
    expect(longestErrorRun(words, { a: 'correct' })).toBe(0)
  })
})
