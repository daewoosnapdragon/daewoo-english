// ─── Phonics across classes and grades ───────────────────────────
// Reading → Phonics → Whole grade / All grades. The arithmetic for comparing
// where students and whole classes sit on the packet's twenty sheets, for
// leveling: a student's mastery position, each class's share of students
// meeting the bar on each sheet, and the first sheet a class has not got yet.
//
// "Meeting the bar" is the basis the teacher picks: Mastered (90%+ with
// "automatic" ticked, the packet's reached automaticity) or Proficient+
// (90%+, ticked or not). The second exists because Mastered depends on a
// tick: a class whose teacher does not tick it would otherwise look empty.

import {
  PHONICS_SKILL_IDS, isSecure, phonicsBand, orderSkills,
  type LatestBySkill, type PhonicsBand, type PhonicsCheckRow,
} from '@/lib/phonics'

export type MasteryBasis = 'mastered' | 'secure'

/** Fewer students tested on a sheet than this, and the class's figure for it is shown greyed. */
export const MIN_TESTED = 3
/** A class's edge is the first sheet where under this share of its tested students meet the bar. */
export const EDGE_PCT = 70

export function meetsBasis(band: PhonicsBand, basis: MasteryBasis): boolean {
  return basis === 'mastered' ? band === 'mastered' : isSecure(band)
}

export interface MasteryPosition {
  /** The furthest sheet, in packet order, that meets the bar; null when none does. */
  through: string | null
  /** 1–20 for `through`, 0 when nothing meets the bar. */
  position: number
  /**
   * Sheets before `through` that were tested and are under 90% (Developing or
   * Beginning): real holes under the position. A sheet short of Mastered only
   * for want of the "automatic" tick is not a gap.
   */
  gaps: string[]
  /** 1–20: the furthest sheet tested at all, 0 when never checked. */
  testedThrough: number
  tested: number
  /** Sheets at 90%+ with "automatic" not ticked: Proficient, short of Mastered only by the tick. */
  unticked: number
}

export function masteryPosition(latest: LatestBySkill, basis: MasteryBasis): MasteryPosition {
  const ids = orderSkills(Object.keys(latest))
  let throughIdx = -1, testedIdx = -1, unticked = 0
  ids.forEach(id => {
    const i = PHONICS_SKILL_IDS.indexOf(id)
    const score = latest[id].score
    if (i > testedIdx) testedIdx = i
    if (meetsBasis(phonicsBand(score), basis) && i > throughIdx) throughIdx = i
    if (score.pct >= 90 && !score.automatic) unticked++
  })
  const through = throughIdx >= 0 ? PHONICS_SKILL_IDS[throughIdx] : null
  const gaps = throughIdx < 0 ? [] : ids.filter(id => PHONICS_SKILL_IDS.indexOf(id) < throughIdx && !isSecure(phonicsBand(latest[id].score)))
  return { through, position: throughIdx + 1, gaps, testedThrough: testedIdx + 1, tested: ids.length, unticked }
}

export interface SheetStat {
  /** Students with a check on this sheet. */
  tested: number
  meeting: number
  /** meeting / tested, 0–100; null when nobody was tested. */
  pct: number | null
  /** Tested by fewer than MIN_TESTED: too few to compare on. */
  thin: boolean
}

export interface GroupStats {
  students: number
  /** Students with at least one sheet checked. */
  tested: number
  bySheet: Record<string, SheetStat>
  /** Median mastery position among tested students; null when none tested. */
  medianPosition: number | null
  /** First sheet, in packet order, with enough students tested and under EDGE_PCT meeting the bar. */
  edge: string | null
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function groupStats(studentIds: string[], latestByStudent: Record<string, LatestBySkill>, basis: MasteryBasis): GroupStats {
  const bySheet: Record<string, SheetStat> = {}
  PHONICS_SKILL_IDS.forEach(id => {
    let tested = 0, meeting = 0
    studentIds.forEach(sid => {
      const l = latestByStudent[sid]?.[id]
      if (!l) return
      tested++
      if (meetsBasis(phonicsBand(l.score), basis)) meeting++
    })
    bySheet[id] = { tested, meeting, pct: tested ? Math.round((meeting / tested) * 100) : null, thin: tested < MIN_TESTED }
  })
  const positions = studentIds
    .filter(sid => Object.keys(latestByStudent[sid] || {}).length > 0)
    .map(sid => masteryPosition(latestByStudent[sid], basis).position)
  const edge = PHONICS_SKILL_IDS.find(id => !bySheet[id].thin && bySheet[id].pct! < EDGE_PCT) || null
  return { students: studentIds.length, tested: positions.length, bySheet, medianPosition: median(positions), edge }
}

/** Checks dated on or after `since` (YYYY-MM-DD); all of them when `since` is empty. */
export function checksSince(checks: PhonicsCheckRow[], since: string): PhonicsCheckRow[] {
  return since ? checks.filter(c => (c.date || '') >= since) : checks
}

/** Highest position first; then more sheets tested; then name. Untested students last. */
export function byPosition<T extends { id: string; english_name: string }>(students: T[], pos: Record<string, MasteryPosition>): T[] {
  return [...students].sort((a, b) => {
    const pa = pos[a.id], pb = pos[b.id]
    const ta = pa?.tested ? 1 : 0, tb = pb?.tested ? 1 : 0
    return tb - ta || (pb?.position || 0) - (pa?.position || 0) || (pb?.tested || 0) - (pa?.tested || 0) || a.english_name.localeCompare(b.english_name)
  })
}
