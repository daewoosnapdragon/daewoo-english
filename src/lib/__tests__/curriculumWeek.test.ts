import { describe, it, expect } from 'vitest'
import { coverage, importIntoDay, readDay, removeFromDay, unitsInWeek, weekDays, type LogRow } from '../curriculumWeek'
import type { CurriculumLesson } from '../curriculumCore'

const lesson = (id: string, title: string, objective: string, codes: string[], notes = ''): CurriculumLesson => ({ id, unit_id: 'u1', sort_order: 1, title, objective, notes, ccss_codes: codes, skill_tags: [], source: 'claude', confirmed_by: null, confirmed_at: null, created_at: '', updated_at: '' })

describe('readDay', () => {
  it('reads a stored JSON string and tolerates junk', () => {
    expect(readDay('{"subjects":[{"label":"Phonics","content":"short a"}],"objective":"x","notes":""}')).toEqual({ subjects: [{ label: 'Phonics', content: 'short a' }], objective: 'x', notes: '' })
    expect(readDay('nope')).toEqual({ subjects: [], objective: '', notes: '' })
    expect(readDay(null)).toEqual({ subjects: [], objective: '', notes: '' })
  })
})

describe('unitsInWeek and weekDays', () => {
  it('finds the bars covering a week, including half weeks', () => {
    const bars = [{ id: 'a', viewStart: 1, viewEnd: 2 }, { id: 'b', viewStart: 3, viewEnd: 4.5 }, { id: 'c', viewStart: 4.5, viewEnd: 6 }]
    expect(unitsInWeek(bars, 2).map(b => b.id)).toEqual(['a'])
    expect(unitsInWeek(bars, 4).map(b => b.id)).toEqual(['b', 'c'])
    expect(unitsInWeek(bars, 7)).toEqual([])
  })
  it('lists Monday to Friday', () => {
    expect(weekDays({ n: 1, monday: '2027-08-30', friday: '2027-09-03' })).toEqual(['2027-08-30', '2027-08-31', '2027-09-01', '2027-09-02', '2027-09-03'])
  })
})

describe('importIntoDay and removeFromDay', () => {
  const l = lesson('l1', 'ea words', 'Students will read and sort ea and ee words.', ['RF.1.3C'], 'word sort first')
  it('adds a subject row, the objective and the notes, replacing an empty placeholder row', () => {
    const day = { subjects: [{ label: '', content: '' }], objective: '', notes: '' }
    const out = importIntoDay(day, l, 'Super Phonics', { title: 'Unit 6 · Long E' })
    expect(out.subjects).toEqual([{ label: 'Super Phonics', content: 'ea words (Unit 6 · Long E)' }])
    expect(out.objective).toBe('Students will read and sort ea and ee words.')
    expect(out.notes).toBe('word sort first')
  })
  it('keeps what is already there and does not add the same lesson twice', () => {
    const day = { subjects: [{ label: 'Into Reading', content: 'Module 4 day 3' }], objective: 'Students will compare two homes.', notes: '' }
    const once = importIntoDay(day, l, 'Super Phonics')
    const twice = importIntoDay(once, l, 'Super Phonics')
    expect(twice.subjects).toEqual([{ label: 'Into Reading', content: 'Module 4 day 3' }, { label: 'Super Phonics', content: 'ea words' }])
    expect(twice.objective).toBe('Students will compare two homes.\nStudents will read and sort ea and ee words.')
  })
  it('takes the lesson out again and leaves the rest', () => {
    const day = { subjects: [{ label: 'Into Reading', content: 'Module 4 day 3' }], objective: 'Students will compare two homes.', notes: 'bring maps' }
    const added = importIntoDay(day, l, 'Super Phonics')
    expect(removeFromDay(added, l, 'Super Phonics')).toEqual(day)
  })
})

describe('coverage', () => {
  it('counts taught and planned per code', () => {
    const lessons = [lesson('l1', 'a', '', ['RF.1.3C', 'L.1.6']), lesson('l2', 'b', '', ['RF.1.3C'])]
    const log = (id: string, lesson_id: string, done: boolean): LogRow => ({ id, lesson_id, unit_id: 'u1', english_class: 'Daisy', grade: 2, date: '2027-10-27', teacher_id: null, done, done_at: null, created_at: '' })
    expect(coverage([log('1', 'l1', true), log('2', 'l2', false), log('3', 'zzz', true)], lessons)).toEqual([{ code: 'L.1.6', taught: 1, planned: 0 }, { code: 'RF.1.3C', taught: 1, planned: 1 }])
  })
})
