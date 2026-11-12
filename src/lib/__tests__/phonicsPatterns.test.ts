import { describe, it, expect } from 'vitest'
import { latestBySkill, type PhonicsCheckRow, type PhonicsMark } from '@/lib/phonics'
import {
  observationCounts, troubleCounts, missedWords, nextToTeach, teachingGroups, patternKey, splitPatternKey,
} from '@/lib/phonicsPatterns'

// A check on one or more sheets. `wrong` are the words marked as errors; every other word on the sheet is correct.
function check(id: string, sid: string, date: string, sheets: Record<string, { words: string[]; wrong?: string[]; heard?: Record<string, string>; obs?: string[] }>): PhonicsCheckRow {
  const results: Record<string, Record<string, PhonicsMark>> = {}
  const heard: Record<string, Record<string, string>> = {}
  const observations: Record<string, string[]> = {}
  Object.entries(sheets).forEach(([sk, v]) => {
    results[sk] = Object.fromEntries(v.words.map(w => [w, (v.wrong || []).includes(w) ? 'error' : 'correct']))
    heard[sk] = v.heard || {}
    observations[sk] = v.obs || []
  })
  return { id, student_id: sid, date, assessed_by: null, skills: Object.keys(sheets), results, heard, observations, notes: '', content_version: 'x', created_at: date }
}

const CVC = ['hat', 'big', 'hug', 'pet', 'ten', 'log', 'cap', 'rot', 'sun', 'pan', 'jet', 'top', 'fox', 'let', 'zip', 'mud', 'van', 'quit', 'nut', 'win']
const DIG = ['shop', 'chop', 'them', 'which', 'chub', 'shed', 'such', 'that', 'thin', 'wish', 'shut', 'chin', 'this', 'then', 'rash', 'hush', 'much', 'with', 'chap', 'when']

const rows = [
  // a: an old check (superseded) then a newer one
  check('a1', 'a', '2026-09-01', { cvc: { words: CVC, wrong: ['hat', 'big', 'hug', 'pet', 'ten', 'log'], obs: ['guessing'] } }),
  check('a2', 'a', '2026-10-01', { cvc: { words: CVC, obs: ['automatic'] }, digraphs: { words: DIG, wrong: ['which', 'when', 'them'], heard: { which: 'wich', when: 'wen' }, obs: ['sound_by_sound', 'pattern:wh'] } }),
  check('b1', 'b', '2026-10-02', { cvc: { words: CVC, wrong: ['quit'], obs: ['automatic'] }, digraphs: { words: DIG, wrong: ['which', 'that'], heard: { which: 'wich' }, obs: ['guessing', 'pattern:wh', 'pattern:th'] } }),
  check('c1', 'c', '2026-10-03', { cvc: { words: CVC, wrong: ['quit', 'hat', 'big', 'hug'], obs: ['sound_by_sound'] } }),
]
const latest = Object.fromEntries(['a', 'b', 'c', 'd'].map(s => [s, latestBySkill(rows.filter(r => r.student_id === s))]))
const checks = Object.fromEntries(rows.map(r => [r.id, r]))

describe('observationCounts', () => {
  it('counts each student once per checkbox, from their latest sheets only', () => {
    const r = observationCounts(['a', 'b', 'c', 'd'], latest, checks)
    expect(r.checked).toBe(3)
    // a's old "guessing" is superseded; b guessed on digraphs
    expect(r.counts).toEqual({ automatic: 2, sound_by_sound: 2, guessing: 1 })
  })
  it('can be limited to some sheets', () => {
    expect(observationCounts(['a', 'b'], latest, checks, ['digraphs']).counts).toEqual({ sound_by_sound: 1, guessing: 1 })
  })
})

describe('troubleCounts', () => {
  it('counts students per sheet and grapheme, with how many were checked on the sheet', () => {
    const r = troubleCounts(['a', 'b', 'c'], latest, checks)
    expect(r.counts).toEqual({ [patternKey('digraphs', 'wh')]: 2, [patternKey('digraphs', 'th')]: 1 })
    expect(r.checkedBySheet).toEqual({ cvc: 3, digraphs: 2 })
  })
  it('splits keys back', () => {
    expect(splitPatternKey('ck_tch_floss|floss (ff ll ss zz)')).toEqual({ sheet: 'ck_tch_floss', pattern: 'floss (ff ll ss zz)' })
  })
})

describe('missedWords', () => {
  const w = missedWords(['a', 'b', 'c'], latest, checks)
  it('lists words missed by two or more, most missed first, with what was heard', () => {
    expect(w.map(x => `${x.sheet}:${x.word}:${x.missed}/${x.read}`)).toEqual(['digraphs:which:2/2', 'cvc:quit:2/3'])
    expect(w[0].heard).toEqual([['wich', 2]])
    expect(w[0].studentIds).toEqual(['a', 'b'])
  })
  it('takes a lower threshold', () => {
    expect(missedWords(['a'], latest, checks, { min: 1 }).map(x => x.word)).toEqual(['them', 'which', 'when'])
  })
})

describe('nextToTeach', () => {
  const sc = (skill: string, pct: number, automatic = false) => ({ score: { skill, correct: pct / 5, errors: 20 - pct / 5, unread: 0, total: 20, pct, automatic }, date: '2026-11-01', checkId: 'c' })
  const L = (...xs: ReturnType<typeof sc>[]) => Object.fromEntries(xs.map(x => [x.score.skill, x]))
  it('is the lowest hole under the position first', () => {
    expect(nextToTeach(L(sc('cvc', 100, true), sc('digraphs', 70), sc('blends', 100, true)), 'mastered')).toEqual({ sheet: 'digraphs', reason: 'gap', checked: true })
  })
  it('else the sheet after the position, saying whether it was checked', () => {
    expect(nextToTeach(L(sc('cvc', 100, true), sc('digraphs', 80)), 'mastered')).toEqual({ sheet: 'digraphs', reason: 'next', checked: true })
    expect(nextToTeach(L(sc('cvc', 100, true)), 'mastered')).toEqual({ sheet: 'digraphs', reason: 'next', checked: false })
  })
  it('starts at CVC when nothing meets the bar, and knows done and unchecked', () => {
    expect(nextToTeach(L(sc('cvc', 50)), 'mastered').sheet).toBe('cvc')
    expect(nextToTeach({}, 'mastered').reason).toBe('unchecked')
    expect(nextToTeach(L(sc('two_more_teams', 100, true)), 'mastered').reason).toBe('done')
  })
})

describe('teachingGroups', () => {
  it('gathers students by next sheet in packet order, done and unchecked last', () => {
    // a: cvc mastered (automatic), digraphs 85 → next digraphs; b: cvc 95 automatic, digraphs 90 no tick → next digraphs (mastered basis);
    // c: cvc 80 → cvc; d: nothing
    const g = teachingGroups(['a', 'b', 'c', 'd'], latest, 'mastered', 'sheet')
    expect(g.map(x => `${x.key}:${x.studentIds.join('')}`)).toEqual(['cvc:c', 'digraphs:ab', 'unchecked:d'])
  })
  it('can gather by family, listing the sheets inside', () => {
    const g = teachingGroups(['a', 'b', 'c'], latest, 'mastered', 'family')
    expect(g).toEqual([{ key: 'short', sheets: ['cvc', 'digraphs'], studentIds: ['a', 'b', 'c'] }])
  })
})
