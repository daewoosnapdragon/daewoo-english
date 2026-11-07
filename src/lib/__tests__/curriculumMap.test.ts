import { describe, it, expect } from 'vitest'
import { earlierOnUnit, overlapCounts, overlapsAt, planTogether, weekOfBar, type MapBar, type MapRow } from '../curriculumMap'
import type { CurriculumBook, CurriculumLesson, CurriculumSeries, CurriculumUnit } from '../curriculumCore'

const series = (id: string, name: string): CurriculumSeries => ({ id, name, publisher: '', strand: 'phonics', color: 'plum', kind: 'sequence', sort_order: 1, created_at: '' })
const book = (id: string, series_id: string, level: string): CurriculumBook => ({ id, series_id, level_number: level, title: '', status: 'confirmed', drive_folder_url: '', notes: '', created_at: '', updated_at: '' })
const unit = (id: string, book_id: string, title: string, tags: string[]): CurriculumUnit => ({ id, book_id, sort_order: 1, title, summary: '', skill_tags: tags, ccss_codes: [], default_weeks: 2, source: 'claude', confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' })
const sp = series('sp', 'Super Phonics'), hh = series('hh', 'Hand in Hand')
const sp1 = book('sp1', 'sp', '1'), sp2 = book('sp2', 'sp', '2'), hh3 = book('hh3', 'hh', '3')
const uLongA1 = unit('ua1', 'sp1', 'Silent e · VCe Pattern: a_e', ['long a vce'])
const uLongA2 = unit('ua2', 'sp2', 'Silent e · Long A review', ['long a vce', 'long a ai ay'])
const uShowTell = unit('ust', 'hh3', 'Unit 4 · Show and tell', ['describing objects'])
const uOther = unit('uo', 'sp2', 'Closed Syllables · Short a', ['short a'])

const bar = (u: CurriculumUnit, b: CurriculumBook, s: CurriculumSeries, start: number, end: number): MapBar => ({
  pacing: { id: 'p' + u.id, placement_id: 'pl', unit_id: u.id, sort_order: 1, weeks: end - start + 1, owner: 'master', teacher_id: null, gap_before: 0, fixed: false, done_at: null, created_at: '', updated_at: '' },
  unit: u, start, end, viewStart: start, viewEnd: end, cutLeft: false, cutRight: false,
  placement: { id: 'pl', book_id: b.id, english_class: 'x', grade: 1, academic_year: '', term: 'fall', is_master: true, created_by: null, created_at: '', updated_at: '' },
  book: b, series: s, color: '#000',
})
const row = (key: string, cls: string, grade: number, bars: MapBar[]): MapRow => ({ key, cls, grade, teacherId: null, bars })
const rows = [
  row('Snapdragon|1', 'Snapdragon', 1, [bar(uLongA1, sp1, sp, 5, 8)]),
  row('Sunflower|2', 'Sunflower', 2, [bar(uLongA2, sp2, sp, 6, 9), bar(uShowTell, hh3, hh, 9, 12)]),
  row('Daisy|2', 'Daisy', 2, [bar(uShowTell, hh3, hh, 9, 12), bar(uOther, sp2, sp, 1, 4)]),
  row('Daisy|3', 'Daisy', 3, [bar(uShowTell, hh3, hh, 2, 4)]),
]
const lessons: CurriculumLesson[] = []

describe('overlapsAt', () => {
  it('finds the same unit in the same week, and the same skill across different books', () => {
    const w10 = overlapsAt(rows, 10, lessons)
    expect(w10.map(o => [o.kind, o.label, o.members.map(m => m.row.key)])).toEqual([['unit', 'Hand in Hand 3 · Show and tell', ['Sunflower|2', 'Daisy|2']]])
    const w6 = overlapsAt(rows, 6, lessons)
    expect(w6.map(o => [o.kind, o.label, o.members.map(m => m.row.key)])).toEqual([['skill', 'long a vce', ['Snapdragon|1', 'Sunflower|2']]])
  })
  it('reports nothing when only one row is on something', () => {
    expect(overlapsAt(rows, 2, lessons)).toEqual([])
  })
  it('does not count the same unit as a skill overlap too', () => {
    expect(overlapsAt(rows, 10, lessons).some(o => o.kind === 'skill')).toBe(false)
  })
})

describe('earlierOnUnit', () => {
  it('finds who finished the unit before, nearest first', () => {
    const e = earlierOnUnit(rows, 'ust', 9, 'Sunflower|2')
    expect(e.map(x => [x.row.key, x.weeksAgo])).toEqual([['Daisy|3', 5]])
  })
})

describe('overlapCounts', () => {
  it('marks the weeks with something shared', () => {
    const c = overlapCounts(rows, 12, lessons)
    expect(c[5]).toBe(1); expect(c[9]).toBe(1); expect(c[1]).toBe(0)
  })
})

describe('planTogether', () => {
  it('names the classes on the same unit, letters them, and says who finished it earlier', () => {
    const { books, tagOf } = planTogether(rows, 10)
    const hand = books.find(b => b.bookId === 'hh3')!
    expect(hand.together).toHaveLength(1)
    expect(hand.together[0].text).toBe('Sunflower G2 and Daisy G2 are both on Show and tell this week.')
    expect(tagOf.get('ust')).toBe('A')
    expect(hand.ready.map(r => r.text)).toEqual([
      'Daisy G3 finished Show and tell 6 weeks ago, so their slides and notes are ready for Sunflower G2.',
      'Daisy G3 finished Show and tell 6 weeks ago, so their slides and notes are ready for Daisy G2.',
    ])
    expect(books[0].bookId).toBe('hh3')
  })
  it('says nothing for a week nobody shares', () => {
    expect(planTogether(rows, 1).books.every(b => !b.together.length && !b.ready.length)).toBe(true)
  })
})

describe('weekOfBar', () => {
  it('counts teaching weeks into a bar, skipping holidays', () => {
    expect(weekOfBar({ viewStart: 5, viewEnd: 8 }, 7, new Set([6]))).toEqual({ at: 2, of: 3 })
    expect(weekOfBar({ viewStart: 5, viewEnd: 5 }, 5, new Set())).toEqual({ at: 1, of: 1 })
  })
})
