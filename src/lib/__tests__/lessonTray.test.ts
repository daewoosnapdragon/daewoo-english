import { describe, it, expect } from 'vitest'
import { fillWeek, slotLine, spreadDates, trayLanes, usedCounts, weekPace } from '../lessonTray'
import type { PlanDay } from '../lessonSync'

const book = { placement_id: 'p1', book_id: 'b3', series_id: 'hih', label: 'Hand in Hand', level: '3', color: '#3E6F25' }
const units = [{ id: 'u6', title: 'Unit 6 · Going Shopping' }, { id: 'sl3', title: 'School Link 3 · Different places in a city' }, { id: 'u7', title: 'Unit 7 · School Subjects' }]
const L = (id: string, unit_id: string, sort_order: number, title: string) => ({ id, unit_id, sort_order, title })
const lessons = [
  L('a1', 'u6', 1, 'Conversation'), L('a5', 'u6', 2, 'English Sounds'),
  L('s1', 'sl3', 1, 'Social Studies'), L('s2', 'sl3', 2, 'Project'),
  L('c1', 'u7', 1, 'Conversation'), L('c2', 'u7', 2, 'Words'), L('c3', 'u7', 3, 'Grammar'),
]
const day = (subjects: PlanDay['subjects']): PlanDay => ({ subjects, objective: '', notes: '' })
const unitWeeks = new Map([['u6', { first: '2026-11-23', last: '2026-11-30' }], ['sl3', { first: '2026-12-07', last: '2026-12-07' }], ['u7', { first: '2026-12-07', last: '2026-12-14' }]])
const base = { books: [book], unitOrder: new Map([['p1', ['u6', 'sl3', 'u7']]]), units, lessons, unitWeeks, focusMonday: '2026-12-07' }

describe('lesson tray', () => {
  it('leaves out lessons already on a day, tags by the board, carried over first', () => {
    const used = usedCounts({ '2026-12-01': day([{ label: 'HiH', content: 'x', unit_id: 'u6', lesson_id: 'a1' }]) })
    const [lane] = trayLanes({ ...base, recipes: {}, used })
    expect(lane.units.map(u => u.unit_id)).toEqual(['u6', 'sl3', 'u7'])
    expect(lane.units[0].slots.map(s => [s.key, s.tag])).toEqual([['a5', 'carried over']])
    expect(lane.units[1].slots[0].tag).toBe('this week')
    expect(lane.left).toBe(6)
  })
  it('follows the recipe: a skipped part is gone, a two-day part is two lessons until both are used', () => {
    const recipes = { hih: { parts: { Grammar: 2, Words: 0 } } }
    let [lane] = trayLanes({ ...base, recipes, used: usedCounts({}) })
    const u7 = lane.units.find(u => u.unit_id === 'u7')!
    expect(u7.slots.map(s => s.key)).toEqual(['c1', 'c3', 'c3#2'])
    expect(slotLine(u7.name, u7.slots[1].title, u7.slots[1].n, u7.slots[1].of)).toBe('School Subjects — Grammar (1 of 2)')
    ;[lane] = trayLanes({ ...base, recipes, used: usedCounts({ d: day([{ label: '', content: '', unit_id: 'u7', lesson_id: 'c3' }]) }) })
    expect(lane.units.find(u => u.unit_id === 'u7')!.slots.map(s => s.key)).toEqual(['c1', 'c3#2'])
  })
  it('marks lessons moved off a day off and puts them first', () => {
    const [lane] = trayLanes({ ...base, recipes: {}, used: usedCounts({}), moved: { c2: 'moved off Tue' } })
    expect(lane.units[0].unit_id).toBe('u7')
    expect(lane.units[0].slots.find(s => s.key === 'c2')!.tag).toBe('moved off Tue')
  })
  it('spreads a unit over the usual days, skipping days off and days that already have the book', () => {
    const off = new Set(['2026-12-10'])
    const has = new Set(['2026-12-09'])
    const dates = spreadDates({ from: '2026-12-08', count: 4, usual: [1, 2, 3], isClassDay: d => !off.has(d), hasBook: d => has.has(d), last: '2027-01-08' })
    expect(dates).toEqual(['2026-12-08', '2026-12-15', '2026-12-16', '2026-12-17'])
    expect(spreadDates({ from: '2026-12-11', count: 2, usual: [], isClassDay: () => true, hasBook: () => false, last: '2026-12-31' })).toEqual(['2026-12-11', '2026-12-14'])
    expect(spreadDates({ from: '2026-12-28', count: 5, usual: [0], isClassDay: () => true, hasBook: () => false, last: '2027-01-05' })).toEqual(['2026-12-28', '2027-01-04'])
  })
  it('counts a week’s usual days and how many have the book', () => {
    expect(weekPace({ monday: '2026-12-07', usual: [1, 2, 3], isClassDay: d => d !== '2026-12-10', hasBook: d => d === '2026-12-08' })).toEqual({ planned: 1, days: 2 })
    expect(weekPace({ monday: '2026-12-07', usual: [], isClassDay: () => true, hasBook: () => false })).toBeNull()
  })
  it('shows joined lessons as one and lists skipped ones', () => {
    const recipes = { hih: { parts: {}, joins: { c2: 'c3' }, skips: ['s2'] } }
    const [lane] = trayLanes({ ...base, recipes, used: usedCounts({}) })
    const u7 = lane.units.find(u => u.unit_id === 'u7')!
    expect(u7.slots.map(s => [s.key, s.kind, s.title])).toEqual([['c1', 'plain', 'Conversation'], ['c2+c3', 'join', 'Words + Grammar']])
    expect(lane.skipped).toEqual([{ lesson_id: 's2', unit_id: 'sl3', unitName: 'Different places in a city', title: 'Project' }])
    // Placing the joined lesson names its first lesson, which uses the whole slot.
    const [after] = trayLanes({ ...base, recipes, used: usedCounts({ d: day([{ label: '', content: 'x', unit_id: 'u7', lesson_id: 'c2' }]) }) })
    expect(after.units.find(u => u.unit_id === 'u7')!.slots.map(s => s.key)).toEqual(['c1'])
  })
  it('fills a week from the tray on each book’s days, never repeating a placed lesson', () => {
    const used = usedCounts({ '2026-12-01': day([{ label: 'HiH', content: 'x', unit_id: 'u6', lesson_id: 'a1' }]), '2026-12-07': day([{ label: 'HiH', content: 'x', unit_id: 'u6', lesson_id: 'a5' }]) })
    const [lane] = trayLanes({ ...base, recipes: { hih: { parts: {}, skips: ['s2'] } }, used })
    const week = fillWeek([lane], () => [1, 2, 3], [false, false, true, false, false])
    expect(week[0]).toBeNull()
    expect(week[1]!.subjects[0]).toMatchObject({ label: 'Hand in Hand', unit_id: 'sl3', lesson_id: 's1', placement_id: 'p1', content: 'Different places in a city — Social Studies' })
    expect(week[2]).toBeNull()                                  // a day that will not be written uses no lesson
    expect(week[3]!.subjects[0]).toMatchObject({ lesson_id: 'c1' })   // the skipped Project is not offered
    expect(fillWeek([lane], () => [], [false, false, false, false, false])).toEqual([null, null, null, null, null])
  })
  it('counts only this week’s share of a unit that runs several weeks as due', () => {
    const five = ['c1', 'c2', 'c3', 'c4', 'c5'].map((id, i) => L(id, 'u7', i + 1, `Part ${i + 1}`))
    const two = new Map([['u7', { first: '2026-12-07', last: '2026-12-14' }]])
    const mk = (focusMonday: string, usedDays: Record<string, PlanDay> = {}) => trayLanes({ ...base, unitOrder: new Map([['p1', ['u7']]]), lessons: five, unitWeeks: two, focusMonday, recipes: {}, used: usedCounts(usedDays) })[0]
    expect(mk('2026-12-07').due).toBe(3)                     // 5 lessons over 2 weeks: 3 by the end of the first
    expect(mk('2026-12-07').units[0].slots.map(s => s.tag)).toEqual(['this week', 'this week', 'this week', '', ''])
    expect(mk('2026-12-07', { d: day([{ label: '', content: 'x', unit_id: 'u7', lesson_id: 'c1' }]) }).due).toBe(2)
    expect(mk('2026-12-14').due).toBe(5)
  })
})
