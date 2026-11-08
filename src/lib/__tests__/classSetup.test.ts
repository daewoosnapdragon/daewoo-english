import { describe, it, expect } from 'vitest'
import { emptySetup, lessonSlots, partDays, partOf, readSetup, seriesParts, setupFor, typicalUnitDays, weeksFor, withPart } from '../classSetup'

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
})
