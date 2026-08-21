// ============================================================================
// BELOW-GRADE PASSAGES
// ============================================================================
// Some students cannot access even their own grade's easiest passage. Rather
// than record a floor score, teachers may pull a passage from the grade below
// and take a real running record on it. Those passages are keyed `G3-C` --
// grade, then level -- so a below-grade reading can never be mistaken for an
// in-grade one, and every scoring rule can tell the two apart from the key
// alone.
//
// A below-grade reading is DIAGNOSTIC ONLY. It is recorded in full (CWPM,
// accuracy, comprehension, NAEP, notes) so the teacher keeps what they
// observed, but it never produces a weighted CWPM, never feeds placement, and
// marks the student out of contention to level up. The grade's own
// comprehension and fluency standards are dropped for it as well: those
// describe on-grade text, and performance on an easier passage is evidence
// neither way.
//
// Why it is never re-weighted onto this grade's scale: each grade's passage
// ladder is independently normalised from x1.0 to x1.5, so Grade 2's Level A
// (43 words) and Grade 5's Level A (98 words, narrative with dialogue) both
// weigh x1.0 despite being nothing alike. There is no honest conversion
// between the ladders, so none is invented.
// ============================================================================

/** A passage key: an in-grade level ('C') or a below-grade one ('G3-C'). */
export type PassageKey = string

const BELOW_KEY_RE = /^G([1-9])-([A-F])$/

export const belowKey = (grade: number, level: string): PassageKey => `G${grade}-${level}`

export function parseBelowKey(key: unknown): { grade: number; level: string } | null {
  const m = typeof key === 'string' ? BELOW_KEY_RE.exec(key) : null
  return m ? { grade: Number(m[1]), level: m[2] } : null
}

export const isBelowKey = (key: unknown): boolean => parseBelowKey(key) !== null

/** How a passage key reads to a teacher: 'C' in grade, 'G3 C' below grade. */
export function passageKeyLabel(key: unknown): string {
  const below = parseBelowKey(key)
  return below ? `G${below.grade} ${below.level}` : String(key || '')
}

/**
 * Whether this score involved a below-grade passage at any point.
 *
 * Reads the stored flag first, then falls back to inspecting the keys, so a
 * row written before `below_grade_passage` existed still reports correctly --
 * and so does one whose flag was dropped by a partial write.
 */
export function usedBelowGradePassage(calc: any, raw: any): boolean {
  if (calc?.below_grade_passage === true) return true
  if (isBelowKey(raw?.passage_level)) return true
  const attempts = Array.isArray(raw?.passages_attempted) ? raw.passages_attempted
    : Array.isArray(calc?.passages_attempted) ? calc.passages_attempted
    : []
  return attempts.some((a: any) => isBelowKey(a?.level))
}

/**
 * Whether this student is in contention to level up. False once they have read
 * below grade; a row with no below-grade reading is left alone (true), since
 * eligibility otherwise rests on the teacher's recommendation, not on this.
 */
export function isLevelUpEligible(calc: any, raw: any): boolean {
  if (calc?.level_up_eligible === false) return false
  return !usedBelowGradePassage(calc, raw)
}
