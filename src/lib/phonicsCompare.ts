// ─── Phonics across classes and grades ───────────────────────────
// Reading → Phonics → Whole grade / All grades. The arithmetic for comparing
// where students and whole classes sit on the packet's twenty sheets, for
// leveling: a student's mastery position, each class's share of students
// who have mastered each sheet, and the first sheet a class has not got yet.
// Mastered is 90% or more on the latest check of the sheet.

import {
  PHONICS_SKILL_IDS, isSecure, phonicsBand, orderSkills,
  type LatestBySkill, type PhonicsCheckRow,
} from '@/lib/phonics'

/** Fewer students tested on a sheet than this, and the class's figure for it is shown greyed. */
export const MIN_TESTED = 3
/** A class's edge is the first sheet where under this share of its tested students have mastered it. */
export const EDGE_PCT = 70

export interface MasteryPosition {
  /** The furthest sheet, in packet order, that is mastered; null when none is. */
  through: string | null
  /** 1–20 for `through`, 0 when nothing is mastered. */
  position: number
  /** Sheets before `through` that were tested and are under 90%: real holes under the position. */
  gaps: string[]
  /** 1–20: the furthest sheet tested at all, 0 when never checked. */
  testedThrough: number
  tested: number
}

export function masteryPosition(latest: LatestBySkill): MasteryPosition {
  const ids = orderSkills(Object.keys(latest))
  let throughIdx = -1, testedIdx = -1
  ids.forEach(id => {
    const i = PHONICS_SKILL_IDS.indexOf(id)
    if (i > testedIdx) testedIdx = i
    if (isSecure(phonicsBand(latest[id].score)) && i > throughIdx) throughIdx = i
  })
  const through = throughIdx >= 0 ? PHONICS_SKILL_IDS[throughIdx] : null
  const gaps = throughIdx < 0 ? [] : ids.filter(id => PHONICS_SKILL_IDS.indexOf(id) < throughIdx && !isSecure(phonicsBand(latest[id].score)))
  return { through, position: throughIdx + 1, gaps, testedThrough: testedIdx + 1, tested: ids.length }
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
  /** First sheet, in packet order, with enough students tested and under EDGE_PCT of them mastered. */
  edge: string | null
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function groupStats(studentIds: string[], latestByStudent: Record<string, LatestBySkill>): GroupStats {
  const bySheet: Record<string, SheetStat> = {}
  PHONICS_SKILL_IDS.forEach(id => {
    let tested = 0, meeting = 0
    studentIds.forEach(sid => {
      const l = latestByStudent[sid]?.[id]
      if (!l) return
      tested++
      if (isSecure(phonicsBand(l.score))) meeting++
    })
    bySheet[id] = { tested, meeting, pct: tested ? Math.round((meeting / tested) * 100) : null, thin: tested < MIN_TESTED }
  })
  const positions = studentIds
    .filter(sid => Object.keys(latestByStudent[sid] || {}).length > 0)
    .map(sid => masteryPosition(latestByStudent[sid]).position)
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

// ─── Leveling: who reads like another class ──────────────────────
// One lane per class in a grade, lowest class first. A student is flagged
// when their position reaches the median of the next class up ("reads like
// Sunflower"), or sits at or under the median of the next class down. Only
// placed classes take part, and a neighbour counts only when it is actually
// ahead (or behind): if classes are not in order on phonics, nobody is
// flagged against the wrong one.

export interface Quartiles { q1: number; q3: number }

/** Tukey's hinges: the medians of the lower and upper halves. */
export function quartiles(xs: number[]): Quartiles | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const half = Math.floor(s.length / 2)
  const lo = s.length === 1 ? s : s.slice(0, half)
  const hi = s.length === 1 ? s : s.slice(s.length % 2 ? half + 1 : half)
  return { q1: median(lo)!, q3: median(hi)! }
}

/**
 * Everything up to the furthest sheet tested is mastered: the student was
 * never tested past what they have, so their position is a floor and may
 * be higher.
 */
export function openCeiling(p: MasteryPosition): boolean {
  return p.tested > 0 && p.position === p.testedThrough
}

export interface LaneInput { englishClass: string; placed: boolean; studentIds: string[] }
export interface Lane extends LaneInput { tested: number; median: number | null; range: Quartiles | null }
export interface LevelFlag {
  dir: 'up' | 'down'
  likeClass: string
  likeMedian: number
  /** A down flag on a student with an open ceiling: they may simply not have been tested further. */
  unsure: boolean
}

export function levelingLanes(inputs: LaneInput[], pos: Record<string, MasteryPosition>): { lanes: Lane[]; flags: Record<string, LevelFlag> } {
  const lanes: Lane[] = inputs.map(l => {
    const ps = l.studentIds.filter(id => pos[id]?.tested).map(id => pos[id].position)
    return { ...l, tested: ps.length, median: median(ps), range: quartiles(ps) }
  })
  const flags: Record<string, LevelFlag> = {}
  lanes.forEach((lane, i) => {
    if (!lane.placed || lane.median == null) return
    const up = lanes.slice(i + 1).find(l => l.placed && l.median != null)
    const down = [...lanes.slice(0, i)].reverse().find(l => l.placed && l.median != null)
    lane.studentIds.forEach(id => {
      const p = pos[id]
      if (!p?.tested) return
      if (up && up.median! > lane.median! && p.position >= up.median!) {
        flags[id] = { dir: 'up', likeClass: up.englishClass, likeMedian: up.median!, unsure: false }
      } else if (down && down.median! < lane.median! && p.position <= down.median!) {
        flags[id] = { dir: 'down', likeClass: down.englishClass, likeMedian: down.median!, unsure: openCeiling(p) }
      }
    })
  })
  return { lanes, flags }
}
