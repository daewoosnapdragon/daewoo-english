import { describe, it, expect } from 'vitest'
import { sortRoster, filterRoster, widaLevelFromDomains, sanitizeRosterPrefs, DEFAULT_ROSTER_PREFS, type RosterStudent } from '@/lib/rosterSort'

const st = (id: string, over: Partial<RosterStudent> = {}): RosterStudent => ({
  id, english_name: `Name ${id}`, korean_name: `이름${id}`, grade: 1, korean_class: '대', class_number: 1, english_class: 'Marigold', ...over,
})

const roster = [
  st('a', { english_name: 'Park So Min', korean_name: '박소민', korean_class: '솔', class_number: 8, grade: 2, english_class: 'Lily' }),
  st('b', { english_name: 'Choi Si Ah', korean_name: '최시아', korean_class: '대', class_number: 18, grade: 1, english_class: 'Marigold' }),
  st('c', { english_name: 'Kim A Rin', korean_name: '김아린', korean_class: '매', class_number: 6, grade: 1, english_class: 'Daisy' }),
  st('d', { english_name: 'Jo Ah In', korean_name: '조아인', korean_class: '대', class_number: 16, grade: 3, english_class: 'Marigold' }),
]
const ids = (xs: RosterStudent[]) => xs.map(x => x.id).join('')

describe('widaLevelFromDomains', () => {
  it('rounds the mean of the levelled domains, matching the badge', () => {
    expect(widaLevelFromDomains({ listening: 3, reading: 2, writing: 2, speaking: 3 })).toBe(3) // 2.5 → 3
    expect(widaLevelFromDomains({ listening: 3, reading: 2, writing: 2 })).toBe(2)
  })
  it('ignores unset (0) domains and returns null when none are set', () => {
    expect(widaLevelFromDomains({ listening: 4, reading: 0 })).toBe(4)
    expect(widaLevelFromDomains({ listening: 0 })).toBeNull()
    expect(widaLevelFromDomains(undefined)).toBeNull()
  })
})

describe('sortRoster', () => {
  it('sorts by each column and flips with direction', () => {
    expect(ids(sortRoster(roster, 'english_name', 'asc'))).toBe('bdca')
    expect(ids(sortRoster(roster, 'english_name', 'desc'))).toBe('acdb')
    expect(ids(sortRoster(roster, 'korean_name', 'asc'))).toBe('cadb')
    expect(ids(sortRoster(roster, 'grade', 'desc'))).toBe('dabc')
    expect(ids(sortRoster(roster, 'english_class', 'asc'))).toBe('acdb')
  })
  it('breaks ties by Korean class then number so the printed order is stable', () => {
    // Grade 1: b (대 18) and c (매 6) → 대 before 매 regardless of number.
    expect(ids(sortRoster(roster, 'grade', 'asc'))).toBe('bcad')
    // Same English class: d (대 16) before b (대 18).
    expect(ids(sortRoster(roster, 'english_class', 'asc').filter(s => s.english_class === 'Marigold'))).toBe('db')
  })
  it('korean_class sorts 대 → 솔 → 매 then by number', () => {
    expect(ids(sortRoster(roster, 'korean_class', 'asc'))).toBe('dbac')
    expect(ids(sortRoster(roster, 'class_number', 'asc'))).toBe('cadb')
  })
  it('sorts by WIDA level and keeps unlevelled students last in both directions', () => {
    const wida = { a: { reading: 4 }, b: { reading: 2 }, c: { reading: 3 } } // d has no level
    expect(ids(sortRoster(roster, 'wida', 'asc', wida))).toBe('bcad')
    expect(ids(sortRoster(roster, 'wida', 'desc', wida))).toBe('acbd')
  })
  it('does not mutate the input', () => {
    const copy = [...roster]
    sortRoster(roster, 'english_name', 'desc')
    expect(roster).toEqual(copy)
  })
})

describe('filterRoster', () => {
  const wida = { a: { reading: 4 }, b: { reading: 2 }, c: { reading: 2, writing: 3 } }
  it('filters by Korean class', () => {
    expect(ids(filterRoster(roster, { koreanClass: '대', wida: null }))).toBe('bd')
    expect(ids(filterRoster(roster, { koreanClass: null, wida: null }))).toBe('abcd')
  })
  it('filters by rounded WIDA level, including "none"', () => {
    expect(ids(filterRoster(roster, { koreanClass: null, wida: 2 }, wida))).toBe('b')
    expect(ids(filterRoster(roster, { koreanClass: null, wida: 3 }, wida))).toBe('c')
    expect(ids(filterRoster(roster, { koreanClass: null, wida: 'none' }, wida))).toBe('d')
  })
  it('combines both filters', () => {
    expect(ids(filterRoster(roster, { koreanClass: '대', wida: 'none' }, wida))).toBe('d')
    expect(ids(filterRoster(roster, { koreanClass: '솔', wida: 2 }, wida))).toBe('')
  })
})

describe('sanitizeRosterPrefs', () => {
  it('falls back to defaults for garbage', () => {
    expect(sanitizeRosterPrefs(null)).toEqual(DEFAULT_ROSTER_PREFS)
    expect(sanitizeRosterPrefs('nope')).toEqual(DEFAULT_ROSTER_PREFS)
    expect(sanitizeRosterPrefs({ sortKey: 'cwpm', sortDir: 'sideways', filterGrade: 9, filterClass: 'Rose', filterKoreanClass: '별', filterWida: 'all' })).toEqual(DEFAULT_ROSTER_PREFS)
  })
  it('keeps valid values', () => {
    expect(sanitizeRosterPrefs({ sortKey: 'wida', sortDir: 'desc', filterGrade: 3, filterClass: 'Lily', filterKoreanClass: '솔', filterWida: 'none' }))
      .toEqual({ sortKey: 'wida', sortDir: 'desc', filterGrade: 3, filterClass: 'Lily', filterKoreanClass: '솔', filterWida: 'none' })
    expect(sanitizeRosterPrefs({ filterWida: 2 }).filterWida).toBe(2)
  })
})
