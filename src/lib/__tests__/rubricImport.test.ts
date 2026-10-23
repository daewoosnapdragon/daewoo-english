import { describe, it, expect } from 'vitest'
import { normalizeExtractedRubric, fitToFour, normalizeStandard, keyFromLabel, draftProblems } from '@/lib/rubricImport'

const four = (p: string) => [`${p} 1`, `${p} 2`, `${p} 3`, `${p} 4`]

describe('fitToFour', () => {
  it('keeps four levels as they are', () => {
    expect(fitToFour(four('a'))).toEqual({ levels: four('a'), note: null })
  })
  it('puts three levels at 2–4 and leaves 1 blank', () => {
    const r = fitToFour(['below', 'meets', 'exceeds'])
    expect(r.levels).toEqual(['', 'below', 'meets', 'exceeds'])
    expect(r.note).toMatch(/3 levels/)
  })
  it('drops the lowest of five and the two lowest of six', () => {
    expect(fitToFour(['none', 'a', 'b', 'c', 'd']).levels).toEqual(['a', 'b', 'c', 'd'])
    expect(fitToFour(['x', 'y', 'a', 'b', 'c', 'd']).levels).toEqual(['a', 'b', 'c', 'd'])
  })
  it('pads one or two levels with blanks', () => {
    expect(fitToFour(['only']).levels).toEqual(['only', '', '', ''])
    expect(fitToFour([]).note).toMatch(/No level descriptors/)
  })
})

describe('normalizeStandard', () => {
  it('accepts the app’s codes in a few spellings', () => {
    expect(normalizeStandard('W.3.1')).toBe('W.3.1')
    expect(normalizeStandard('w 3 1')).toBe('W.3.1')
    expect(normalizeStandard('CCSS.ELA-LITERACY.RL.K.2')).toBe('RL.K.2')
    expect(normalizeStandard('SL.4.1a')).toBe('SL.4.1A')
  })
  it('rejects anything else', () => {
    expect(normalizeStandard('Standard 3')).toBeUndefined()
    expect(normalizeStandard('')).toBeUndefined()
    expect(normalizeStandard(null)).toBeUndefined()
  })
})

describe('keyFromLabel', () => {
  it('slugs and de-duplicates', () => {
    const taken = new Set<string>()
    expect(keyFromLabel('Ideas & details', taken)).toBe('ideas_details')
    expect(keyFromLabel('Ideas & Details!', taken)).toBe('ideas_details_2')
    expect(keyFromLabel('???', taken)).toBe('criterion')
  })
})

describe('normalizeExtractedRubric', () => {
  it('passes a clean four-level rubric through with no issues', () => {
    const r = normalizeExtractedRubric({
      name: 'Opinion writing', band: 'g35',
      criteria: [
        { label: 'Opinion', levels: four('op'), standard: 'W.3.1' },
        { label: 'Reasons', levels: four('re') },
      ],
      notes: [],
    }, 'k2')
    expect(r.issues).toEqual([])
    expect(r.name).toBe('Opinion writing')
    expect(r.band).toBe('g35')
    expect(r.criteria).toEqual([
      { key: 'opinion', label: 'Opinion', levels: four('op'), standard: 'W.3.1' },
      { key: 'reasons', label: 'Reasons', levels: four('re') },
    ])
  })
  it('falls back to the grade’s band when the paper does not say', () => {
    expect(normalizeExtractedRubric({ name: 'x', criteria: [{ label: 'a', levels: four('a') }] }, 'k2').band).toBe('k2')
  })
  it('flags what must be fixed: no name, three levels, empty level, no criteria', () => {
    const r = normalizeExtractedRubric({ name: '', criteria: [{ label: 'Voice', levels: ['low', 'mid', 'high'] }, { label: 'Spelling', levels: ['a', '', 'c', 'd'] }] }, 'g35')
    const fixes = r.issues.filter(i => i.level === 'fix')
    expect(fixes.map(i => i.criterion)).toEqual([null, 0, 1])
    expect(fixes[1].message).toMatch(/3 levels/)
    expect(fixes[2].message).toMatch(/Level 2 is empty/)
    expect(normalizeExtractedRubric({ name: 'Nothing', criteria: [] }, 'g35').issues[0]).toMatchObject({ level: 'fix', criterion: null })
  })
  it('turns a high-to-low scale around and says so', () => {
    const r = normalizeExtractedRubric({ name: 'r', criteria: [{ label: 'Ideas', levels: ['Exceeds the goal with vivid detail', 'Meets the goal', 'Developing', 'Needs guidance to find an idea'] }] }, 'g35')
    expect(r.criteria[0].levels[0]).toMatch(/Needs guidance/)
    expect(r.criteria[0].levels[3]).toMatch(/Exceeds/)
    expect(r.issues[0]).toMatchObject({ level: 'check', criterion: 0 })
  })
  it('drops a standard it does not recognise, keeps the row, and notes a repeated label', () => {
    const r = normalizeExtractedRubric({ name: 'r', criteria: [{ label: 'Ideas', levels: four('a'), standard: 'Standard 7' }, { label: 'ideas', levels: four('b') }] }, 'g35')
    expect(r.criteria[0].standard).toBeUndefined()
    expect(r.criteria[1].key).toBe('ideas_2')
    expect(r.issues.map(i => i.message)).toEqual([expect.stringMatching(/not a standard code/), expect.stringMatching(/more than once/)])
  })
  it('skips empty rows and survives junk input', () => {
    expect(normalizeExtractedRubric({ name: 'r', criteria: [{ label: '', levels: [] }, { label: 'ok', levels: four('x') }] }, 'g35').criteria).toHaveLength(1)
    expect(normalizeExtractedRubric(null, 'g35').criteria).toEqual([])
    expect(normalizeExtractedRubric('nope', 'g35').issues.length).toBeGreaterThan(0)
  })
})

describe('draftProblems', () => {
  it('is empty for a complete draft and lists every gap otherwise', () => {
    expect(draftProblems({ name: 'A', criteria: [{ key: 'a', label: 'A', levels: four('a') as [string, string, string, string] }] })).toEqual([])
    const p = draftProblems({ name: ' ', criteria: [{ key: 'a', label: '', levels: ['x', '', 'z', 'w'] }] })
    expect(p).toEqual(['The rubric has no name.', 'Criterion 1 has no name.', 'Criterion 1: level 2 is empty.'])
  })
})
