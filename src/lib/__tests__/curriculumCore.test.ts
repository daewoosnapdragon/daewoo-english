import { describe, it, expect } from 'vitest'
import { bookName, countLine, driveId, kindFromUrl, levelShort, parseCatalogueLines, parseCodes, parseTags, unknownTags } from '../curriculumCore'

describe('parseCodes', () => {
  it('reads codes in any separator and case, once each', () => {
    expect(parseCodes('rf.1.3c, L.1.2d; RF.1.3C / RL.K.2')).toEqual(['RF.1.3C', 'L.1.2D', 'RL.K.2'])
  })
  it('ignores words that are not codes', () => {
    expect(parseCodes('long a, RF.1.3c and more')).toEqual(['RF.1.3C'])
  })
})

describe('parseTags', () => {
  it('lower-cases, trims and dedupes', () => {
    expect(parseTags('Short A, long a VCe; short a')).toEqual(['short a', 'long a vce'])
  })
})

describe('parseCatalogueLines', () => {
  const text = `
Super Phonics 2 contents
Unit 1 · Short vowels review | weeks: 3 | skills: short a, cvc | ccss: RF.1.2c, RF.1.3b
- Lesson 1 · Short a words | Students will blend and read CVC words with short a. | ccss: RF.1.3b | skills: short a
- Lesson 2 · Short e words | Students will read and spell short e words. | notes: word sort first | ccss: rf.1.3b
Unit 2: Long A | skills: long a vce, long a ai ay | A first look at the magic e.
- L1 ai words | students will: read ai words
* Review day | Students will sort long a words by pattern.
`
  const units = parseCatalogueLines(text)

  it('finds the units and their lessons, ignoring other lines', () => {
    expect(units.map(u => u.title)).toEqual(['Unit 1 · Short vowels review', 'Unit 2 · Long A'])
    expect(units[0].lessons.map(l => l.title)).toEqual(['Lesson 1 · Short a words', 'Lesson 2 · Short e words'])
    expect(units[1].lessons.map(l => l.title)).toEqual(['L1 ai words', 'Review day'])
  })
  it('reads the keyed fields on a unit', () => {
    expect(units[0].default_weeks).toBe(3)
    expect(units[0].skill_tags).toEqual(['short a', 'cvc'])
    expect(units[0].ccss_codes).toEqual(['RF.1.2C', 'RF.1.3B'])
    expect(units[1].default_weeks).toBe(2)
    expect(units[1].summary).toBe('A first look at the magic e.')
  })
  it('reads objective, notes, codes and tags on a lesson', () => {
    const l = units[0].lessons[1]
    expect(l.objective).toBe('Students will read and spell short e words.')
    expect(l.notes).toBe('word sort first')
    expect(l.ccss_codes).toEqual(['RF.1.3B'])
    expect(units[0].lessons[0].skill_tags).toEqual(['short a'])
  })
  it('completes a bare "students will:" field', () => {
    expect(units[1].lessons[0].objective).toBe('Students will read ai words')
  })
  it('returns nothing for text with no unit lines', () => {
    expect(parseCatalogueLines('- Lesson 1 · orphan\nhello')).toEqual([])
  })
})

describe('unknownTags', () => {
  it('lists tags the vocabulary lacks, once each', () => {
    const units = parseCatalogueLines('Unit 1 · A | skills: short a, magic e\n- L1 · x | y | skills: magic e, blends')
    expect(unknownTags(units, new Set(['short a']))).toEqual(['magic e', 'blends'])
  })
})

describe('names and counts', () => {
  it('builds a book name from series and level, with the title only when it adds something', () => {
    expect(bookName({ level_number: '2', title: '' }, { name: 'Super Phonics' })).toBe('Super Phonics 2')
    expect(bookName({ level_number: '2', title: 'Super Phonics 2' }, { name: 'Super Phonics' })).toBe('Super Phonics 2')
    expect(bookName({ level_number: '', title: 'Module 3' }, { name: 'Into Reading' })).toBe('Into Reading · Module 3')
  })
  it('writes the count line', () => {
    expect(countLine({ units: 0, lessons: 0, confirmedUnits: 0, confirmedLessons: 0 }, false)).toBe('Not indexed yet')
    expect(countLine({ units: 4, lessons: 12, confirmedUnits: 4, confirmedLessons: 5 }, false)).toBe('4 units · 12 lessons · 9 of 16 confirmed')
    expect(countLine({ units: 1, lessons: 2, confirmedUnits: 1, confirmedLessons: 2 }, false)).toBe('1 unit · 2 lessons · all confirmed')
  })
})

describe('drive links', () => {
  it('finds the id in file and folder links', () => {
    expect(driveId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing')).toBe('1AbCdEfGhIjKlMnOp')
    expect(driveId('https://drive.google.com/drive/folders/1ZyXwVuTsRqPoNm')).toBe('1ZyXwVuTsRqPoNm')
    expect(driveId('https://example.com')).toBeNull()
  })
  it('guesses the kind', () => {
    expect(kindFromUrl('https://docs.google.com/presentation/d/1AbCdEfGhIjKlMnOp/edit')).toBe('slides')
    expect(kindFromUrl('https://drive.google.com/drive/folders/1ZyXwVuTsRqPoNm')).toBe('folder')
    expect(kindFromUrl('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view')).toBe('other')
  })
})

describe('levelShort', () => {
  it('keeps short levels and shortens long ones', () => {
    expect(levelShort('3')).toBe('3')
    expect(levelShort('S')).toBe('S')
    expect(levelShort('Intermediate 1 Plus')).toBe('I1+')
    expect(levelShort('Basic 2')).toBe('B2')
    expect(levelShort('Purple')).toBe('P')
    expect(levelShort('')).toBe('')
  })
})
