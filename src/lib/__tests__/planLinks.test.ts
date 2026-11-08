import { describe, it, expect } from 'vitest'
import { booksForLabel, classBooks, copiedRow, escapeHtml, linkedRow, matchUnits, stillNamesUnit, withContent, type ClassBook } from '../planLinks'

const semesters = [
  { academic_year: '2026', type: 'spring_1', start_date: '2026-03-02', end_date: '2026-07-17' },
  { academic_year: '2026', type: 'fall_1', start_date: '2026-08-17', end_date: '2027-01-08' },
]
const series = [
  { id: 'ir', name: 'Into Reading', publisher: '', strand: 'reading', color: 'blue', kind: 'anthology', sort_order: 1, created_at: '' },
  { id: 'hih', name: 'Hand in Hand', publisher: '', strand: 'speaking', color: 'green', kind: 'sequence', sort_order: 2, created_at: '' },
] as any
const books = [
  { id: 'ir2', series_id: 'ir', level_number: '2', title: '' },
  { id: 'hih3', series_id: 'hih', level_number: '3', title: '' },
] as any
const U = (id: string, book_id: string, sort_order: number, title: string) => ({ id, book_id, sort_order, title, summary: '', ccss_codes: [] })
const units = [
  U('wil', 'ir2', 1, 'Wilma Rudolph: Against All Odds'), U('clo', 'ir2', 2, 'Cloudette'), U('goo', 'ir2', 3, 'Good Sports'),
  U('u6', 'hih3', 6, 'Unit 6 · Going Shopping'), U('u7', 'hih3', 7, 'Unit 7 · School Subjects'),
] as any
const L = (id: string, unit_id: string, sort_order: number, title: string) => ({ id, unit_id, sort_order, title, objective: '', ccss_codes: [] })
const lessons = [L('c2', 'clo', 2, 'Point of View'), L('c1', 'clo', 1, 'Make Connections'), L('g1', 'u6', 1, 'Conversation')] as any
const P = (id: string, book_id: string, term: string, extra = {}) => ({ id, book_id, english_class: 'Snapdragon', grade: 2, academic_year: '2026', term, is_master: true, ...extra })
const base = { cls: 'Snapdragon', grade: 2, year: '2026', monthFirst: '2026-11-01', monthLast: '2026-11-30', semesters, series, books, units, lessons, resources: [] as any[] }

describe('classBooks', () => {
  it('lists the school plan books of the class and grade in this month, units in the plan order', () => {
    const placements = [P('p1', 'ir2', 'fall'), P('p2', 'hih3', 'year'), P('p3', 'hih3', 'spring', { id: 'p3' }), P('px', 'ir2', 'fall', { english_class: 'Daisy' }), P('pt', 'ir2', 'fall', { is_master: false })] as any
    const pacing = [{ placement_id: 'p1', unit_id: 'clo', sort_order: 1, owner: 'master' }, { placement_id: 'p1', unit_id: 'wil', sort_order: 2, owner: 'master' }, { placement_id: 'p1', unit_id: 'goo', sort_order: 1, owner: 'teacher' }] as any
    const out = classBooks({ ...base, placements, pacing })
    expect(out.map(b => b.placement_id)).toEqual(['p1', 'p2'])
    expect(out[0].units.map(u => u.id)).toEqual(['clo', 'wil'])
    expect(out[0].units[0].lessons.map(l => l.id)).toEqual(['c1', 'c2'])
    // No plan rows: every unit of the book, in book order.
    expect(out[1].units.map(u => [u.badge, u.name])).toEqual([['Unit 6', 'Going Shopping'], ['Unit 7', 'School Subjects']])
    expect(out[1].label).toBe('Hand in Hand')
  })
  it('a spring book is not offered in November', () => {
    const out = classBooks({ ...base, placements: [P('p3', 'hih3', 'spring')] as any, pacing: [] })
    expect(out).toEqual([])
  })
})

const shelf: ClassBook[] = classBooks({ ...base, placements: [P('p1', 'ir2', 'fall'), P('p2', 'hih3', 'fall')] as any, pacing: [] })

describe('matchUnits', () => {
  it('names starting with the words first, then a word, then anywhere', () => {
    expect(matchUnits('clo', shelf).map(m => m.unit.id)).toEqual(['clo'])
    expect(matchUnits('sh', shelf).map(m => m.unit.id)).toEqual(['u6'])
    expect(matchUnits('o', shelf)).toEqual([])
    expect(matchUnits('od', shelf).map(m => m.unit.id)).toEqual(['wil', 'goo'])
    expect(matchUnits('unit 7', shelf).map(m => m.unit.id)).toEqual(['u7'])
  })
  it('only the book the subject names, all books with no subject, none for another subject', () => {
    expect(booksForLabel('Hand in Hand', shelf).map(b => b.placement_id)).toEqual(['p2'])
    expect(booksForLabel('', shelf)).toHaveLength(2)
    expect(booksForLabel('Project', shelf)).toEqual([])
  })
})

describe('links follow the words', () => {
  const linked = { label: 'Into Reading', content: 'Cloudette', unit_id: 'clo', placement_id: 'p1', lesson_id: 'c1' }
  it('keeps the link while the words name the unit, drops unit and lesson when they stop', () => {
    expect(withContent(linked, 'Cloudette (reread)', 'Cloudette')).toEqual({ ...linked, content: 'Cloudette (reread)' })
    expect(withContent(linked, 'Cloudett', 'Cloudette')).toEqual({ label: 'Into Reading', content: 'Cloudett' })
    expect(stillNamesUnit('Wilma Rudolph — Characters', 'Wilma Rudolph: Against All Odds')).toBe(false)
    expect(stillNamesUnit('anything', undefined)).toBe(true)
  })
  it('picking a unit puts its name in, unless the words already name it', () => {
    const book = shelf[0], unit = book.units.find(u => u.id === 'clo')!
    expect(linkedRow({ label: '', content: 'clo' }, book, unit)).toEqual({ label: 'Into Reading', content: 'Cloudette', unit_id: 'clo', placement_id: 'p1' })
    expect(linkedRow({ label: '', content: 'Cloudette play' }, book, unit).content).toBe('Cloudette play')
  })
  it('a copied row keeps its unit but not its lesson', () => {
    expect(copiedRow(linked)).toEqual({ label: 'Into Reading', content: 'Cloudette', unit_id: 'clo', placement_id: 'p1' })
  })
})

describe('escapeHtml', () => {
  it('makes typed text safe in the printed page', () => {
    expect(escapeHtml(`<b>"Tom" & Jerry's</b>`)).toBe('&lt;b&gt;&quot;Tom&quot; &amp; Jerry&#39;s&lt;/b&gt;')
  })
})
