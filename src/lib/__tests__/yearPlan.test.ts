import { describe, it, expect } from 'vitest'
import { changedWeeks, columnOfTeaching, moveBoundary, nextBook, spreadEvenly, teachingAtColumn } from '../yearPlan'
import type { CurriculumBook } from '../curriculumCore'

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

describe('stretching a book', () => {
  it('shares the new length evenly in half weeks and keeps the total', () => {
    expect(spreadEvenly(36, 12)).toEqual(Array(12).fill(3))
    const w = spreadEvenly(30, 12)
    expect(sum(w)).toBe(30)
    expect(w.every(x => x === 2.5)).toBe(true)
    const odd = spreadEvenly(31, 12)
    expect(sum(odd)).toBe(31)
    expect(odd.every(x => x === 2.5 || x === 3)).toBe(true)
  })
  it('never gives a unit less than half a week', () => {
    expect(spreadEvenly(2, 12)).toEqual(Array(12).fill(0.5))
    expect(spreadEvenly(-4, 3)).toEqual([0.5, 0.5, 0.5])
  })
  it('rounds the length to the half week', () => {
    expect(sum(spreadEvenly(10.3, 4))).toBe(10.5)
  })
  it('has nothing to share among no units', () => {
    expect(spreadEvenly(10, 0)).toEqual([])
  })
})

describe('moving the line between two units', () => {
  it('gives one unit what the other loses', () => {
    expect(moveBoundary([2, 2, 2], 0, 1)).toEqual([3, 1, 2])
    expect(moveBoundary([2, 2, 2], 1, -0.5)).toEqual([2, 1.5, 2.5])
  })
  it('stops at half a week either side', () => {
    expect(moveBoundary([2, 2, 2], 0, 5)).toEqual([3.5, 0.5, 2])
    expect(moveBoundary([2, 2, 2], 0, -5)).toEqual([0.5, 3.5, 2])
  })
  it('moves in half weeks', () => {
    expect(moveBoundary([2, 2], 0, 0.3)).toEqual([2.5, 1.5])
  })
  it('ignores a line that is not there', () => {
    expect(moveBoundary([2, 2], 1, 1)).toEqual([2, 2])
  })
})

describe('pointer to teaching weeks', () => {
  const none = new Set<number>()
  it('counts columns as weeks when there are no holidays', () => {
    expect(teachingAtColumn(0, none, 10)).toBe(0)
    expect(teachingAtColumn(3.5, none, 10)).toBe(3.5)
    expect(teachingAtColumn(12, none, 10)).toBe(10)
    expect(teachingAtColumn(-2, none, 10)).toBe(0)
  })
  it('skips holiday columns', () => {
    const hol = new Set([2])
    expect(teachingAtColumn(1, hol, 10)).toBe(1)
    expect(teachingAtColumn(1.5, hol, 10)).toBe(1)   // inside the holiday column
    expect(teachingAtColumn(3, hol, 10)).toBe(2)
    expect(teachingAtColumn(3.5, hol, 10)).toBe(2.5)
  })
  it('finds the column a teaching week ends in', () => {
    const hol = new Set([2])
    expect(columnOfTeaching(1, hol, 10)).toBe(1)
    expect(columnOfTeaching(2, hol, 10)).toBe(3)
    expect(columnOfTeaching(2.5, hol, 10)).toBe(4)
    expect(columnOfTeaching(0.5, none, 10)).toBe(1)
    expect(columnOfTeaching(12, none, 10)).toBe(12)  // past the view: counted on
  })
})

describe('what a drag changes', () => {
  it('lists only the rows whose weeks moved', () => {
    const rows = [{ id: 'a', sort_order: 1, weeks: 2 }, { id: 'b', sort_order: 2, weeks: 2 }, { id: 'c', sort_order: 3, weeks: 2 }]
    expect(changedWeeks(rows, [2, 3, 1])).toEqual([{ id: 'b', weeks: 3 }, { id: 'c', weeks: 1 }])
    expect(changedWeeks(rows, [2, 2, 2])).toEqual([])
  })
  it('goes by sort order, not array order', () => {
    const rows = [{ id: 'b', sort_order: 2, weeks: 2 }, { id: 'a', sort_order: 1, weeks: 2 }]
    expect(changedWeeks(rows, [3, 2])).toEqual([{ id: 'a', weeks: 3 }])
  })
})

describe('the next book', () => {
  const b = (id: string, series_id: string, level_number: string, status: 'confirmed' | 'retired' = 'confirmed'): CurriculumBook =>
    ({ id, series_id, level_number, title: '', status, drive_folder_url: '', notes: '', created_at: '', updated_at: '' })
  const books = [b('sp3', 'sp', '3'), b('sp10', 'sp', '10'), b('sp2', 'sp', '2'), b('sp4', 'sp', '4', 'retired'), b('hih1', 'hih', '1')]
  it('is the next level in the same series, in number order', () => {
    expect(nextBook(books[2], books)?.id).toBe('sp3')
    expect(nextBook(books[0], books)?.id).toBe('sp10')   // 4 is retired
  })
  it('is nothing after the last level', () => {
    expect(nextBook(books[1], books)).toBeUndefined()
    expect(nextBook(books[4], books)).toBeUndefined()
  })
})
