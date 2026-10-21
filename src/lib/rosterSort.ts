// ============================================================================
// ROSTER SORT & FILTER
// Pure helpers behind the student roster toolbar. Kept out of the component
// so the ordering rules (and the tie-breakers that keep a printed list stable)
// can be unit tested without a DOM.
// ============================================================================

import type { KoreanClass } from '@/types'

export type RosterSortKey = 'english_name' | 'korean_name' | 'grade' | 'korean_class' | 'class_number' | 'english_class' | 'wida'
export type RosterSortDir = 'asc' | 'desc'

export interface RosterStudent {
  id: string
  english_name: string
  korean_name: string
  grade: number
  korean_class: string
  class_number: number
  english_class: string
}

/** Per-student WIDA domain levels, as cached by WIDABadge: { [studentId]: { listening: 3, reading: 2, ... } }. */
export type WidaDomainMap = Record<string, Record<string, number>>

/** The level WIDABadge shows: mean of the domains that have a level, rounded. Null when nothing is set. */
export function widaLevelFromDomains(domains: Record<string, number> | undefined): number | null {
  if (!domains) return null
  const vals = Object.values(domains).filter((v): v is number => v != null && v > 0)
  if (vals.length === 0) return null
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  return Math.round(avg)
}

export const ENGLISH_CLASS_ORDER: Record<string, number> = { Lily: 1, Camellia: 2, Daisy: 3, Sunflower: 4, Marigold: 5, Snapdragon: 6 }
export const KOREAN_CLASS_ORDER: Record<string, number> = { '대': 1, '솔': 2, '매': 3 }

const cmpNum = (a: number, b: number) => a - b
const cmpStr = (a: string, b: string) => a.localeCompare(b)

/** Stable tie-breaker used after every primary key: Korean class → number → English name. */
function tieBreak(a: RosterStudent, b: RosterStudent): number {
  return (KOREAN_CLASS_ORDER[a.korean_class] || 99) - (KOREAN_CLASS_ORDER[b.korean_class] || 99)
    || a.class_number - b.class_number
    || cmpStr(a.english_name, b.english_name)
}

function primary(key: RosterSortKey, wida: WidaDomainMap): (a: RosterStudent, b: RosterStudent) => number {
  switch (key) {
    case 'english_name': return (a, b) => cmpStr(a.english_name, b.english_name)
    case 'korean_name': return (a, b) => cmpStr(a.korean_name, b.korean_name)
    case 'grade': return (a, b) => cmpNum(a.grade, b.grade)
    case 'korean_class': return (a, b) => cmpNum(KOREAN_CLASS_ORDER[a.korean_class] || 99, KOREAN_CLASS_ORDER[b.korean_class] || 99)
    case 'class_number': return (a, b) => cmpNum(a.class_number, b.class_number)
    case 'english_class': return (a, b) => cmpNum(ENGLISH_CLASS_ORDER[a.english_class] || 99, ENGLISH_CLASS_ORDER[b.english_class] || 99)
    case 'wida': return (a, b) => {
      // Students with no level sink to the bottom in both directions so the
      // levelled students stay together at the top of the list.
      const la = widaLevelFromDomains(wida[a.id]), lb = widaLevelFromDomains(wida[b.id])
      if (la == null && lb == null) return 0
      if (la == null) return Number.POSITIVE_INFINITY
      if (lb == null) return Number.NEGATIVE_INFINITY
      return cmpNum(la, lb)
    }
  }
}

export function sortRoster<T extends RosterStudent>(students: T[], key: RosterSortKey, dir: RosterSortDir, wida: WidaDomainMap = {}): T[] {
  const cmp = primary(key, wida)
  const sign = dir === 'desc' ? -1 : 1
  return [...students].sort((a, b) => {
    const c = cmp(a, b)
    // Infinity marks "unlevelled goes last" and must not flip with direction.
    if (c === Number.POSITIVE_INFINITY) return 1
    if (c === Number.NEGATIVE_INFINITY) return -1
    return c !== 0 ? sign * c : tieBreak(a, b)
  })
}

/** 'none' matches students with no WIDA level set. */
export type WidaFilter = number | 'none'

export interface RosterFilters {
  koreanClass: KoreanClass | null
  wida: WidaFilter | null
}

export function filterRoster<T extends RosterStudent>(students: T[], filters: RosterFilters, wida: WidaDomainMap = {}): T[] {
  return students.filter(s => {
    if (filters.koreanClass && s.korean_class !== filters.koreanClass) return false
    if (filters.wida != null) {
      const level = widaLevelFromDomains(wida[s.id])
      if (filters.wida === 'none' ? level != null : level !== filters.wida) return false
    }
    return true
  })
}

// ─── Persisted toolbar state ────────────────────────────────────────

export interface RosterPrefs {
  sortKey: RosterSortKey
  sortDir: RosterSortDir
  filterGrade: number | null
  filterClass: string | null
  filterKoreanClass: KoreanClass | null
  filterWida: WidaFilter | null
}

export const DEFAULT_ROSTER_PREFS: RosterPrefs = {
  sortKey: 'english_class', sortDir: 'asc',
  filterGrade: null, filterClass: null, filterKoreanClass: null, filterWida: null,
}

const SORT_KEYS: RosterSortKey[] = ['english_name', 'korean_name', 'grade', 'korean_class', 'class_number', 'english_class', 'wida']

/** Validates a parsed prefs blob so a stale or hand-edited entry can never put the roster in an impossible state. */
export function sanitizeRosterPrefs(raw: unknown): RosterPrefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: RosterPrefs = { ...DEFAULT_ROSTER_PREFS }
  if (SORT_KEYS.includes(p.sortKey as RosterSortKey)) out.sortKey = p.sortKey as RosterSortKey
  if (p.sortDir === 'asc' || p.sortDir === 'desc') out.sortDir = p.sortDir
  if (typeof p.filterGrade === 'number' && p.filterGrade >= 1 && p.filterGrade <= 5) out.filterGrade = p.filterGrade
  if (typeof p.filterClass === 'string' && p.filterClass in ENGLISH_CLASS_ORDER) out.filterClass = p.filterClass
  if (typeof p.filterKoreanClass === 'string' && p.filterKoreanClass in KOREAN_CLASS_ORDER) out.filterKoreanClass = p.filterKoreanClass as KoreanClass
  if (p.filterWida === 'none' || (typeof p.filterWida === 'number' && p.filterWida >= 1 && p.filterWida <= 6)) out.filterWida = p.filterWida
  return out
}

export function rosterPrefsKey(teacherId: string | null | undefined): string {
  return `daewoo_roster_prefs_${teacherId || 'default'}`
}
