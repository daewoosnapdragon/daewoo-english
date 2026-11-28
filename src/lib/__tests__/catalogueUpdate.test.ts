import { describe, expect, it } from 'vitest'
import { matchUnits, planBook, planSplit, unitKey, type CatalogueEntry, type UpdateDb } from '../catalogueUpdate'

const unit = (title: string, extra: Partial<CatalogueEntry['book']['units'][number]> = {}) => ({ title, lessons: [{ title: 'L' }], objectives: [], ...extra })
const entry = (series: string, level: string, titles: string[], extra: Partial<CatalogueEntry['book']> = {}, version = 'v2'): CatalogueEntry =>
  ({ key: `${series}|${level}`, version, book: { series, level, source: 's', units: titles.map(t => unit(t)), ...extra } })

const db = (over: Partial<UpdateDb> = {}): UpdateDb => ({
  series: [{ id: 's1', name: 'Rich Reading' }, { id: 's2', name: 'Hand in Hand' }, { id: 's3', name: 'Science of Reading' }],
  books: [{ id: 'b1', series_id: 's1', level_number: 'Basic 1', catalogue_version: '' }],
  units: [{ id: 'u1', book_id: 'b1', title: 'Unit 1 · Who is the best' }, { id: 'u2', book_id: 'b1', title: 'Unit 2' }, { id: 'u9', book_id: 'b1', title: 'Spare week' }],
  placements: [{ id: 'p1', book_id: 'b1', english_class: 'Daisy', grade: 2, academic_year: '2026-2027', term: 'fall', is_master: true }],
  pacing: [{ placement_id: 'p1', unit_id: 'u1', owner: 'master' }, { placement_id: 'p1', unit_id: 'u9', owner: 'master' }],
  resources: [{ unit_id: 'u9', lesson_id: null }],
  lessons: [],
  ...over,
})

describe('unitKey', () => {
  it('reads unit, school link and review numbers', () => {
    expect(unitKey('Unit 3 · Pack and Go')).toBe('unit 3')
    expect(unitKey('unit 12')).toBe('unit 12')
    expect(unitKey('School Link 2 · Different places')).toBe('school link 2')
    expect(unitKey('M1 W1 · Clark the Shark')).toBeNull()
  })
})

describe('matchUnits', () => {
  it('matchesByTitleThenNumber', () => {
    const r = matchUnits([{ id: 'a', title: 'Unit 1 · Who is the best' }, { id: 'b', title: 'Unit 2 · The Storm' }], [{ title: 'Unit 1 · Who Is Best?' }, { title: 'Unit 2 · The Storm' }])
    expect(r.pairs).toEqual([{ old: 'b', new_index: 1 }, { old: 'a', new_index: 0 }].sort((x, y) => x.new_index - y.new_index))
    expect(r.unmatched).toEqual([])
  })
  it('replacesWins over a title that matches another unit', () => {
    const r = matchUnits([{ id: 'a', title: 'Short a' }], [{ title: 'Short a' }, { title: 'CVC: short a', replaces: ['Short a'] }])
    expect(r.pairs).toEqual([{ old: 'a', new_index: 1 }])
  })
  it('mergesDuplicateTargets: two old units may take one new unit through replaces', () => {
    const r = matchUnits([{ id: 'a', title: 'Set 1' }, { id: 'b', title: 'Set 2' }], [{ title: 'Letters', replaces: ['Set 1', 'Set 2'] }])
    expect(r.pairs.map(p => p.new_index)).toEqual([0, 0])
  })
  it('gives each new unit one old unit when matching by number', () => {
    const r = matchUnits([{ id: 'a', title: 'Unit 1' }, { id: 'b', title: 'Unit 1 · again' }], [{ title: 'Unit 1 · Real' }])
    expect(r.pairs).toEqual([{ old: 'a', new_index: 0 }])
    expect(r.unmatched).toEqual(['b'])
  })
})

describe('planBook', () => {
  it('unmatchedInPlacement: names the class and counts files that will go', () => {
    const p = planBook(entry('Rich Reading', 'Basic 1', ['Unit 1 · Who Is Best?', 'Unit 2 · Ben']), db())
    expect(p.status).toBe('replace')
    expect(p.bookId).toBe('b1')
    expect(p.pairs).toEqual([{ old: 'u1', new_index: 0 }, { old: 'u2', new_index: 1 }])
    expect(p.unmatched).toEqual([{ unitId: 'u9', title: 'Spare week', classes: ['Daisy G2 · 2026-2027 fall'], files: 1 }])
    expect(p.classes).toEqual(['Daisy G2 · 2026-2027 fall'])
  })
  it('upToDate when the version matches', () => {
    const d = db(); d.books[0].catalogue_version = 'v2'
    expect(planBook(entry('Rich Reading', 'Basic 1', ['Unit 1']), d).status).toBe('up-to-date')
  })
  it('new when the book or series is missing', () => {
    expect(planBook(entry('Super Phonics', '2', ['Unit 1']), db()).status).toBe('new')
    expect(planBook(entry('Rich Reading', 'Basic 9', ['Unit 1']), db()).status).toBe('new')
  })
  it('absorbsS: the S book and its classes and units come with Starter', () => {
    const d = db({
      books: [{ id: 'st', series_id: 's2', level_number: 'Starter', catalogue_version: '' }, { id: 'bs', series_id: 's2', level_number: 'S', catalogue_version: '' }],
      units: [{ id: 'x1', book_id: 'st', title: 'Unit 1 · My Things' }, { id: 'y1', book_id: 'bs', title: 'Unit 1 · My Things' }],
      placements: [{ id: 'p9', book_id: 'bs', english_class: 'Lily', grade: 1, academic_year: '2026-2027', term: 'fall', is_master: true }],
      pacing: [{ placement_id: 'p9', unit_id: 'y1', owner: 'master' }], resources: [],
    })
    const p = planBook(entry('Hand in Hand', 'Starter', ['Unit 1 · My Things'], { absorbs: ['S'] }), d)
    expect(p.absorbIds).toEqual(['bs'])
    expect(p.pairs).toEqual([{ old: 'y1', new_index: 0 }])
    expect(p.unmatched.map(u => u.unitId)).toEqual(['x1'])
    expect(p.classes).toEqual(['Lily G1 · 2026-2027 fall'])
  })
  it('a used unit matched by number wins over an unused twin matched by title', () => {
    const d = db({
      books: [{ id: 'st', series_id: 's2', level_number: 'Starter', catalogue_version: '' }, { id: 'bs', series_id: 's2', level_number: 'S', catalogue_version: '' }],
      units: [{ id: 'x5', book_id: 'st', title: 'Unit 5 · My Body' }, { id: 'y5', book_id: 'bs', title: 'Unit 5' }],
      placements: [{ id: 'p9', book_id: 'bs', english_class: 'Lily', grade: 1, academic_year: '2026-2027', term: 'fall', is_master: true }],
      pacing: [{ placement_id: 'p9', unit_id: 'y5', owner: 'master' }], resources: [],
    })
    const p = planBook(entry('Hand in Hand', 'Starter', ['Unit 5 · My Body'], { absorbs: ['S'] }), d)
    expect(p.pairs).toEqual([{ old: 'y5', new_index: 0 }])
    expect(p.unmatched.map(u => u.unitId)).toEqual(['x5'])
  })
  it('an absorbed book still waiting makes an up-to-date book a replace', () => {
    const d = db({ books: [{ id: 'st', series_id: 's2', level_number: 'Starter', catalogue_version: 'v2' }, { id: 'bs', series_id: 's2', level_number: 'S', catalogue_version: '' }], units: [], placements: [], pacing: [], resources: [] })
    expect(planBook(entry('Hand in Hand', 'Starter', ['Unit 1'], { absorbs: ['S'] }), d).status).toBe('replace')
  })
})

describe('planSplit', () => {
  const levels = [entry('Science of Reading', '1', ['Set 1: a, b, t, s, m'], {}, 'v1'), entry('Science of Reading', '2', ['Short a'], {}, 'v1')]
  levels[0].book.units[0].replaces = ['Alphabet · Set 1: a, b, t, s, m']
  levels[1].book.units[0].replaces = ['Closed Syllables · Short a']
  const d = db({
    books: [{ id: 'old', series_id: 's3', level_number: '', catalogue_version: '' }, { id: 'l1', series_id: 's3', level_number: '1', catalogue_version: 'v1' }, { id: 'l2', series_id: 's3', level_number: '2', catalogue_version: 'v1' }],
    units: [{ id: 'o1', book_id: 'old', title: 'Alphabet · Set 1: a, b, t, s, m' }, { id: 'o2', book_id: 'old', title: 'Closed Syllables · Short a' }, { id: 'o3', book_id: 'old', title: 'Gone' },
      { id: 'n1', book_id: 'l1', title: 'Set 1: a, b, t, s, m' }, { id: 'n2', book_id: 'l2', title: 'Short a' }],
    placements: [{ id: 'p1', book_id: 'old', english_class: 'Snapdragon', grade: 1, academic_year: '2026-2027', term: 'fall', is_master: true }],
    pacing: [{ placement_id: 'p1', unit_id: 'o1', owner: 'master' }, { placement_id: 'p1', unit_id: 'o3', owner: 'master' }], resources: [],
  })
  it('maps old units to the level books once those are loaded', () => {
    const s = planSplit('Science of Reading', levels, d)!
    expect(s.ready).toBe(true)
    expect(s.oldBookId).toBe('old')
    expect(s.pairs).toEqual([{ old: 'o1', new: 'n1' }, { old: 'o2', new: 'n2' }])
    expect(s.unmatched.map(u => u.unitId)).toEqual(['o3'])
    expect(s.classes).toEqual(['Snapdragon G1 · 2026-2027 fall'])
  })
  it('is not ready until every level book is up to date', () => {
    const d2 = { ...d, books: d.books.map(b => b.id === 'l2' ? { ...b, catalogue_version: '' } : b) }
    expect(planSplit('Science of Reading', levels, d2)!.ready).toBe(false)
  })
  it('is null when there is no old book left to split', () => {
    const d3 = { ...d, books: d.books.map(b => b.id === 'old' ? { ...b, status: 'retired' } : b), placements: [] }
    expect(planSplit('Science of Reading', levels, d3)).toBeNull()
  })
})
