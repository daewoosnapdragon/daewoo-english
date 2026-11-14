// ─── Phonics: error patterns and teaching groups ─────────────────
// Reading → Phonics → Whole grade / All grades → Error patterns and Groups.
// Everything here reads each student's latest result per sheet (and the
// check it came from), so a student counts once however often they sat.
//
// Error patterns: how students decoded (the packet's teacher checkboxes),
// which graphemes gave trouble, and which words were missed most, with what
// students said instead, for any set of students: a class, a grade, a group.
//
// Teaching groups: the sheet to teach each student next, and students
// gathered by it across classes. The next sheet is the lowest hole under
// their position if they have one (a sheet under 90%), otherwise the sheet
// after their position.

import {
  PHONICS_SKILL_IDS, PHONICS_GROUPS, PATTERN_PREFIX, phonicsSkill, isMiss,
  type LatestBySkill, type PhonicsCheckRow,
} from '@/lib/phonics'
import { masteryPosition } from '@/lib/phonicsCompare'

type Latest = Record<string, LatestBySkill>
type Checks = Record<string, PhonicsCheckRow>

/** Checkboxes that point at a decoding problem, and those that point at strength. */
export const CONCERN_OBSERVATIONS = ['guessing', 'omitted', 'vowel_confusion', 'blend_struggle', 'first_syllable']
export const STRENGTH_OBSERVATIONS = ['automatic', 'flexible']

/** The latest result on each sheet with the check it came from, optionally only some sheets. */
function eachLatest(sid: string, latest: Latest, checks: Checks, sheets?: string[], fn?: (sheet: string, check: PhonicsCheckRow | undefined) => void) {
  Object.entries(latest[sid] || {}).forEach(([sheet, l]) => {
    if (sheets && !sheets.includes(sheet)) return
    fn?.(sheet, checks[l.checkId])
  })
}

export interface ShareCount { checked: number; counts: Record<string, number> }

/**
 * How students decoded: for each teacher checkbox, the number of students
 * who had it ticked on at least one of their latest sheets. `checked` is the
 * number of students with any sheet checked.
 */
export function observationCounts(studentIds: string[], latest: Latest, checks: Checks, sheets?: string[]): ShareCount {
  const counts: Record<string, number> = {}
  let checked = 0
  studentIds.forEach(sid => {
    const seen = new Set<string>()
    let any = false
    eachLatest(sid, latest, checks, sheets, (sheet, c) => {
      any = true
      ;(c?.observations?.[sheet] || []).forEach(o => { if (!o.startsWith(PATTERN_PREFIX)) seen.add(o) })
    })
    if (any) checked++
    seen.forEach(o => { counts[o] = (counts[o] || 0) + 1 })
  })
  return { checked, counts }
}

export const patternKey = (sheet: string, pattern: string) => `${sheet}|${pattern}`
export function splitPatternKey(key: string): { sheet: string; pattern: string } {
  const i = key.indexOf('|')
  return { sheet: key.slice(0, i), pattern: key.slice(i + 1) }
}

/**
 * Patterns that gave trouble, keyed sheet|grapheme: the number of students
 * with it ticked on their latest result for that sheet. `checkedBySheet` is
 * how many of the students have a result on each sheet, the denominator.
 */
export function troubleCounts(studentIds: string[], latest: Latest, checks: Checks, sheets?: string[]): { counts: Record<string, number>; checkedBySheet: Record<string, number> } {
  const counts: Record<string, number> = {}
  const checkedBySheet: Record<string, number> = {}
  studentIds.forEach(sid => eachLatest(sid, latest, checks, sheets, (sheet, c) => {
    checkedBySheet[sheet] = (checkedBySheet[sheet] || 0) + 1
    ;(c?.observations?.[sheet] || []).forEach(o => {
      if (o.startsWith(PATTERN_PREFIX)) { const k = patternKey(sheet, o.slice(PATTERN_PREFIX.length)); counts[k] = (counts[k] || 0) + 1 }
    })
  }))
  return { counts, checkedBySheet }
}

export interface MissedWord {
  sheet: string
  word: string
  /** Students who read it wrong on their latest result for the sheet. */
  missed: number
  /** Students who read it at all (right or wrong). */
  read: number
  /** What students said instead, most common first. */
  heard: [string, number][]
  /** The students who missed it. */
  studentIds: string[]
}

/** Words missed by at least `min` students, most missed first, then by miss rate, then packet order. */
export function missedWords(studentIds: string[], latest: Latest, checks: Checks, opts: { sheets?: string[]; min?: number } = {}): MissedWord[] {
  const by: Record<string, MissedWord & { said: Record<string, number> }> = {}
  studentIds.forEach(sid => eachLatest(sid, latest, checks, opts.sheets, (sheet, c) => {
    const marks = c?.results?.[sheet] || {}
    Object.entries(marks).forEach(([word, m]) => {
      const k = `${sheet}|${word}`
      const e = by[k] ||= { sheet, word, missed: 0, read: 0, heard: [], studentIds: [], said: {} }
      e.read++
      if (isMiss(m)) {
        e.missed++
        e.studentIds.push(sid)
        const said = c?.heard?.[sheet]?.[word]?.trim().toLowerCase()
        if (said) e.said[said] = (e.said[said] || 0) + 1
      }
    })
  }))
  const min = opts.min ?? 2
  return Object.values(by)
    .filter(e => e.missed >= min)
    .map(({ said, ...e }) => ({ ...e, heard: Object.entries(said).sort((a, b) => b[1] - a[1]) }))
    .sort((a, b) => b.missed - a.missed || b.missed / b.read - a.missed / a.read || PHONICS_SKILL_IDS.indexOf(a.sheet) - PHONICS_SKILL_IDS.indexOf(b.sheet))
}

// ─── Teaching groups ─────────────────────────────────────────────

export type NextReason = 'gap' | 'next' | 'done' | 'unchecked'
export interface NextSheet {
  /** The sheet to teach next; null when done or never checked. */
  sheet: string | null
  reason: NextReason
  /** The student has a result on that sheet; false means it is the next one up and never checked. */
  checked: boolean
}

export function nextToTeach(latest: LatestBySkill): NextSheet {
  const p = masteryPosition(latest)
  if (!p.tested) return { sheet: null, reason: 'unchecked', checked: false }
  if (p.gaps.length) return { sheet: p.gaps[0], reason: 'gap', checked: true }
  if (p.position >= PHONICS_SKILL_IDS.length) return { sheet: null, reason: 'done', checked: true }
  const sheet = PHONICS_SKILL_IDS[p.position]
  return { sheet, reason: 'next', checked: !!latest[sheet] }
}

export type GroupBy = 'sheet' | 'family'
export interface TeachGroup {
  /** A sheet id, a family (PHONICS_GROUPS) id, 'done' or 'unchecked'. */
  key: string
  /** The sheets this group works on, in packet order; empty for done and unchecked. */
  sheets: string[]
  studentIds: string[]
}

/** Students gathered by the sheet (or family of sheets) to teach next, in packet order; done, then never checked, last. */
export function teachingGroups(studentIds: string[], latest: Latest, by: GroupBy): TeachGroup[] {
  const groups: Record<string, TeachGroup> = {}
  studentIds.forEach(sid => {
    const n = nextToTeach(latest[sid] || {})
    let key: string, sheets: string[]
    if (!n.sheet) { key = n.reason; sheets = [] }
    else if (by === 'sheet') { key = n.sheet; sheets = [n.sheet] }
    else { key = phonicsSkill(n.sheet)!.group; sheets = [] }
    const g = groups[key] ||= { key, sheets, studentIds: [] }
    g.studentIds.push(sid)
    if (by === 'family' && n.sheet && !g.sheets.includes(n.sheet)) g.sheets.push(n.sheet)
  })
  const order = (k: string) => k === 'done' ? 1000 : k === 'unchecked' ? 1001
    : by === 'sheet' ? PHONICS_SKILL_IDS.indexOf(k) : PHONICS_GROUPS.findIndex(g => g.id === k)
  return Object.values(groups)
    .map(g => ({ ...g, sheets: [...g.sheets].sort((a, b) => PHONICS_SKILL_IDS.indexOf(a) - PHONICS_SKILL_IDS.indexOf(b)) }))
    .sort((a, b) => order(a.key) - order(b.key))
}
