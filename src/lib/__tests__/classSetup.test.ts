import { describe, it, expect } from 'vitest'
import { bothAdjust, setupAdjuster, weeksFromDays, emptySetup, lessonSlots, partDays, partOf, readSetup, seriesParts, setupFor, typicalUnitDays, weeksFor, withJoin, withPart, withSkip } from '../classSetup'

const L = (unit_id: string, sort_order: number, title: string, notes = '') => ({ unit_id, sort_order, title, notes })
// Two Hand in Hand units and a School Link, as the seed has them.
const units = [{ id: 'u6' }, { id: 'sl3' }, { id: 'u7' }]
const lessons = [
  L('u6', 1, 'Conversation', 'I want some ice cream.'), L('u6', 2, 'Words'), L('u6', 3, 'Grammar'), L('u6', 4, 'The World around Us'), L('u6', 5, 'English Sounds', 'bl and br'),
  L('sl3', 1, 'Social Studies', 'Social Studies: Different places in a city'), L('sl3', 2, 'Project'),
  L('u7', 1, 'Conversation'), L('u7', 2, 'Words'), L('u7', 3, 'Grammar'), L('u7', 4, 'The World around Us'), L('u7', 5, 'English Sounds'),
]

describe('class setup', () => {
  it('finds the parts most units share, in teaching order, leaving one-off parts out', () => {
    const parts = seriesParts(units, lessons)
    expect(parts.map(p => p.key)).toEqual(['Conversation', 'Words', 'Grammar', 'The World around Us', 'English Sounds'])
    expect(parts[0].example).toBe('I want some ice cream.')
    expect(partOf('High-frequency words: high, might')).toBe('High-frequency words')
  })
  it('lays a unit out by the recipe: skipped parts gone, two-day parts twice', () => {
    const recipe = withPart(withPart(undefined, 'Grammar', 2), 'English Sounds', 0)
    const slots = lessonSlots(lessons.filter(l => l.unit_id === 'u7'), recipe)
    expect(slots.map(s => `${s.part} ${s.n}/${s.of}`)).toEqual(['Conversation 1/1', 'Words 1/1', 'Grammar 1/2', 'Grammar 2/2', 'The World around Us 1/1'])
    expect(partDays(recipe, 'Project')).toBe(1)
    expect(withPart(recipe, 'Grammar', 1).parts).toEqual({ 'English Sounds': 0 })   // back to the book's way: not named
  })
  it('works out a typical unit and its weeks on the usual days', () => {
    expect(typicalUnitDays(units, lessons, undefined)).toBe(5)
    expect(typicalUnitDays(units, lessons, withPart(undefined, 'Grammar', 2))).toBe(6)
    expect(weeksFor(5, 3)).toBe(1.7)
    expect(weeksFor(5, 0)).toBeNull()
  })
  it('uses a grade’s own setup when it has one, else the class’s', () => {
    const all = { ...emptySetup('Snapdragon'), standing: [{ id: 'a', title: 'Spelling test', weekday: 4 }] }
    const g2 = { ...emptySetup('Snapdragon', 2), days: { s: [1] } }
    expect(setupFor([all, g2], 'Snapdragon', 2)).toBe(g2)
    expect(setupFor([all, g2], 'Snapdragon', 3)).toBe(all)
    expect(setupFor([all], 'Lily', 1).standing).toEqual([])
  })
  it('reads rows defensively', () => {
    const s = readSetup({ english_class: 'Snapdragon', grade: 0, days: { a: [1, 9, 'x'] }, recipes: { a: { parts: { Grammar: 2, bad: 'x' } } }, standing: [{ id: '1', title: 'Spelling test', weekday: 4 }, { nope: true }] })
    expect(s.days).toEqual({ a: [1] })
    expect(s.recipes).toEqual({ a: { parts: { Grammar: 2 } } })
    expect(s.standing).toHaveLength(1)
    expect(readSetup({ english_class: 'X', grade: 0, days: null, recipes: [], standing: 'no' })).toMatchObject({ days: {}, recipes: {}, standing: [] })
  })
  it('joins a lesson with the next one and leaves skipped lessons out, for single lessons only', () => {
    const ls = [{ id: 'c1', sort_order: 1, title: 'Conversation' }, { id: 'c2', sort_order: 2, title: 'Words' }, { id: 'c3', sort_order: 3, title: 'Grammar' }, { id: 'c4', sort_order: 4, title: 'English Sounds' }]
    let r = withSkip(withJoin(withPart(undefined, 'Grammar', 2), 'c2', 'c3'), 'c4', true)
    const slots = lessonSlots(ls, r)
    expect(slots.map(s => [s.lesson.id, s.joined?.id || null, s.n, s.of])).toEqual([['c1', null, 1, 1], ['c2', 'c3', 1, 1]])
    expect(r.parts).toEqual({ Grammar: 2 })
    r = withSkip(withJoin(r, 'c2', null), 'c4', false)
    expect(lessonSlots(ls, r).map(s => `${s.lesson.id}${s.n}`)).toEqual(['c11', 'c21', 'c31', 'c32', 'c41'])
    // With the lesson between them skipped, two lessons are next to each other and can be joined.
    expect(lessonSlots(ls, withSkip(withJoin(undefined, 'c1', 'c3'), 'c2', true)).map(s => s.joined?.id || '-')).toEqual(['c3', '-'])
    // A join to a lesson that is not next does nothing.
    expect(lessonSlots(ls, withJoin(undefined, 'c1', 'c3')).map(s => s.joined?.id || '-')).toEqual(['-', '-', '-', '-'])
    expect(readSetup({ english_class: 'S', grade: 0, recipes: { a: { parts: {}, joins: { c2: 'c3', bad: 1 }, skips: ['c4', 3] } } }).recipes.a).toEqual({ parts: {}, joins: { c2: 'c3' }, skips: ['c4'] })
  })
  it('draws unit lengths from class days, rounded to half weeks along the total', () => {
    const r = (unit_id: string, sort_order: number, fixed = false, weeks = 2) => ({ unit_id, sort_order, weeks, fixed })
    // Hand in Hand on 3 days a week: 5-day units and 2-day School Links.
    const rows = [r('u1', 1), r('u2', 2), r('sl1', 3), r('u3', 4), r('pinned', 5, true, 4)]
    const days = (u: string) => (u.startsWith('sl') ? 2 : u === 'pinned' ? 5 : 5)
    const out = weeksFromDays(rows, days, 3)
    expect(out.map(x => x.weeks)).toEqual([1.5, 2, 0.5, 1.5, 4])
    expect(out.slice(0, 4).reduce((a, x) => a + x.weeks, 0)).toBe(5.5)   // 17 days ÷ 3 = 5.67, not 4 × 2 = 8
    expect((out[0] as { from_setup?: boolean }).from_setup).toBe(true)
    expect((out[4] as { from_setup?: boolean }).from_setup).toBeUndefined()
    expect(weeksFromDays(rows, days, 0)).toBe(rows)
  })
  it('adjusts a placement from its class setup, and only when the series has usual days', () => {
    const setups = [{ ...emptySetup('Snapdragon'), days: { hih: [1, 2, 3] }, recipes: { hih: { parts: { Grammar: 2 } } } }]
    const ls = [{ id: 'a', unit_id: 'u7', sort_order: 1, title: 'Conversation' }, { id: 'b', unit_id: 'u7', sort_order: 2, title: 'Grammar' }]
    const adj = setupAdjuster(setups, [{ id: 'b3', series_id: 'hih' }, { id: 'sor', series_id: 'sor' }], ls)
    const rows = [{ unit_id: 'u7', sort_order: 1, weeks: 2, fixed: false }]
    expect(adj({ english_class: 'Snapdragon', grade: 2, book_id: 'b3' }, rows)[0].weeks).toBe(1)        // 3 days ÷ 3
    expect(adj({ english_class: 'Snapdragon', grade: 2, book_id: 'sor' }, rows)).toBe(rows)              // no usual days for that series
    expect(adj({ english_class: 'Lily', grade: 2, book_id: 'b3' }, rows)).toBe(rows)
    type Pl = { english_class: string; grade: number; book_id: string }; type Row = (typeof rows)[number]
    const double = bothAdjust<Pl, Row>(adj, (_pl, r) => r.map(x => ({ ...x, weeks: x.weeks * 10 })))!
    expect(double({ english_class: 'Snapdragon', grade: 2, book_id: 'b3' }, rows)[0].weeks).toBe(10)
  })
})
