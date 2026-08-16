// ============================================================================
// GRADE 2 ABSOLUTE BAND
// ============================================================================
// A cohort-independent read of where a student sits, mirroring the band that
// Grade 1 has had since Fall 2026.
//
// This is REFERENCE ONLY. Placement is decided by the weighted composite and
// the student's rank within the grade -- see `suggestClass` in LevelingView.
// The band exists to answer the question ranking cannot: "how strong is this
// student in absolute terms, regardless of who else sat the test?" A grade that
// improves across the board moves its bands up while its ranks stay put, and
// the difference between the two is the interesting signal.
//
// ── How it is built ───────────────────────────────────────────────────
// The passage the student SUSTAINED sets a band on the 0-100 scale. Their
// component scores position them inside it. Nothing here is an externally
// validated norm: the level ordering comes from the test's own passage weights
// (A 1.0x through F 1.5x), and the component scales come from its own point
// totals. Treat it as "which passage could they hold, and how well", not as a
// reading age.
// ============================================================================

import { G2Content, G2PassageLevel } from './grade2Content'
import { G3Content } from './grade3Content'
import { G4Content } from './grade4Content'
import { G5Content } from './grade5Content'

/**
 * The band only needs the component maxes, not a whole test definition, so both
 * grades adapt onto this. Grade 3 has no phonics, syllables or sentence
 * reading, and its band is positioned by comprehension alone.
 */
export interface BandScales {
  phonicsMax: number
  syllableMax: number
  sentenceMax: number
  compMax: number
  /**
   * Comprehension at or below this many points means the passage was not
   * sustained. Grade 4's guide states this outright (0-4 of 10 is Frustration,
   * move down one level); grades 2 and 3 say nothing, so they fall back to the
   * ratio below. Where this is set it wins.
   */
  frustrationCompMax?: number
  /**
   * Whether accuracy under 90% is on its own enough to call the passage
   * unsustained. Grade 4 says no -- "when accuracy and comprehension disagree,
   * comprehension decides", and it gives a worked example of a student at 89%
   * accuracy with 8/10 comprehension who stays at that level.
   */
  accuracyAloneDowngrades?: boolean
}

export function bandScalesFromG2(c: G2Content): BandScales {
  return {
    phonicsMax: c.oral.phonics.max,
    syllableMax: c.oral.syllables.max,
    sentenceMax: c.oral.sentences.max,
    compMax: c.oral.reading.compMax,
  }
}

export function bandScalesFromG3(c: G3Content): BandScales {
  return { phonicsMax: 0, syllableMax: 0, sentenceMax: 0, compMax: c.oral.compMax }
}

export function bandScalesFromG4(c: G4Content): BandScales {
  return {
    phonicsMax: 0, syllableMax: 0, sentenceMax: 0,
    compMax: c.oral.compMax,
    frustrationCompMax: c.oral.frustrationCompMax,
    accuracyAloneDowngrades: false,
  }
}

/** Grade 5 states the same comprehension-decides rule as Grade 4. */
export function bandScalesFromG5(c: G5Content): BandScales {
  return {
    phonicsMax: 0, syllableMax: 0, sentenceMax: 0,
    compMax: c.oral.compMax,
    frustrationCompMax: c.oral.frustrationCompMax,
    accuracyAloneDowngrades: false,
  }
}

export type EnglishClassName = 'Lily' | 'Camellia' | 'Daisy' | 'Sunflower' | 'Marigold' | 'Snapdragon'

const LEVEL_ORDER: G2PassageLevel[] = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * One band per passage level, and they OVERLAP by design.
 *
 * Teachers do not hand every strong reader the hardest passage -- a Snapdragon
 * student is often given E rather than F, either to be safe or because F was
 * not obviously right for them. With hard-walled bands that choice alone
 * decided the class: a student on E had to score essentially 100% on the
 * components to read Snapdragon, and at 80% read Marigold. The passage the
 * teacher happened to pick was outranking the performance.
 *
 * Overlapping the ceilings fixes that. Acing a passage now carries you into the
 * class above, so reading E well and reading F adequately land in the same
 * place -- which is the honest reading of the evidence. The floors are
 * unchanged, so a weak showing still sits where the passage puts it.
 *
 * `ceiling` is the overlapping one and applies to a student who held their
 * passage. `unsustainedCeiling` is the old tight ceiling, used when the passage
 * was NOT held: the overlap is an inference from sustaining a passage ("if you
 * aced this, you are likely ready for the next"), and a student who was cut
 * off, read at frustration level, or followed none of the story has not earned
 * that inference. Without the distinction the downgrade is toothless -- a
 * student who understood nothing on F drops to E and lands right back in the
 * top class on the overlap.
 */
const LEVEL_BANDS: Record<G2PassageLevel, { floor: number; ceiling: number; unsustainedCeiling: number }> = {
  A: { floor: 0, ceiling: 24, unsustainedCeiling: 16 },
  B: { floor: 17, ceiling: 41, unsustainedCeiling: 32 },
  C: { floor: 33, ceiling: 58, unsustainedCeiling: 49 },
  D: { floor: 50, ceiling: 75, unsustainedCeiling: 66 },
  E: { floor: 67, ceiling: 92, unsustainedCeiling: 83 },
  F: { floor: 84, ceiling: 100, unsustainedCeiling: 100 },
}

/**
 * Reading accuracy below this is frustration level: the words on the page are
 * too hard whatever the rate, so the passage was not actually sustained.
 */
const FRUSTRATION_ACCURACY = 90

/**
 * Comprehension this far below the ceiling means the student got through the
 * words without following the story, which is the same conclusion as being cut
 * off: the passage was above them.
 *
 * NOTE: this extends the guide rather than quoting it. The guide says only that
 * a student who is cut off is usually placed too high. Without something like
 * it, a student handed Passage F who read it accurately but answered every
 * comprehension question wrong still collects F's floor of 84 and reads as
 * Snapdragon. Set deliberately low so it catches near-total non-comprehension
 * and not merely weak comprehension.
 */
const NON_COMPREHENSION_RATIO = 0.25

// A separate low-level cap used to live here, holding A/B/C down to 38/48/60.
// The overlapping ceilings above are now stricter than it was at every level
// (A tops out at 24, B at 41, C at 58), so it could never bind. Removed rather
// than left as a rule that looks live but never fires.

export interface G2BandInput {
  passageLevel?: string | null
  phonicsTotal?: number | null
  syllableTotal?: number | null
  sentenceTotal?: number | null
  compTotal?: number | null
  /** Comprehension was never asked, so it cannot count either way. */
  compNotAdministered?: boolean | null
  /** Percentage, e.g. 94.5. */
  accuracyPct?: number | null
}

export interface G2BandResult {
  /** 0-100, absolute. */
  composite: number
  /** The level the student actually held, after any cut-off downgrade. */
  effectiveLevel: G2PassageLevel
  /** The level the teacher handed them. */
  attemptedLevel: G2PassageLevel
  /** True when the attempted level was not sustained. */
  downgraded: boolean
  suggestedClass: EnglishClassName
}

/**
 * Null when the student has no passage recorded: without a level there is no
 * band, and inventing one from the components alone would rank a student on
 * the easy half of the test.
 */
export function calculateG2Band(input: G2BandInput, scales: BandScales): G2BandResult | null {
  const attempted = LEVEL_ORDER.find(l => l === input.passageLevel)
  if (!attempted) return null

  // ── Was the passage sustained? ──
  const compMax = scales.compMax
  const compKnown = !input.compNotAdministered && input.compTotal != null

  // Where the guide names a comprehension cut point, use it. Otherwise fall
  // back to the ratio, which approximates the same judgement for the grades
  // whose guides are silent.
  const nonComprehension = compKnown && (
    scales.frustrationCompMax != null
      ? (input.compTotal as number) <= scales.frustrationCompMax
      : compMax > 0 && (input.compTotal as number) / compMax < NON_COMPREHENSION_RATIO
  )

  // Accuracy below 90% is frustration level on its own, EXCEPT where the guide
  // says comprehension decides -- there, a student who read inaccurately but
  // understood the passage keeps their level.
  const accuracyCounts = scales.accuracyAloneDowngrades !== false
  const belowFrustration = accuracyCounts
    && input.accuracyPct != null
    && input.accuracyPct < FRUSTRATION_ACCURACY

  const notSustained = !!input.compNotAdministered || belowFrustration || nonComprehension
  const effectiveLevel = notSustained
    ? LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(attempted) - 1)]
    : attempted

  const band = LEVEL_BANDS[effectiveLevel]

  // ── Position within the band ──
  // Phonics and sentence reading separate students at the bottom, where nobody
  // has much comprehension to measure. Comprehension carries the weight higher
  // up, where decoding is no longer the constraint.
  const isLow = effectiveLevel === 'A' || effectiveLevel === 'B'
  const parts: { value: number; weight: number }[] = []
  const push = (raw: number | null | undefined, max: number, weight: number) => {
    if (raw == null || max <= 0) return
    parts.push({ value: Math.max(0, Math.min(1, raw / max)), weight })
  }

  push(input.phonicsTotal, scales.phonicsMax, isLow ? 0.35 : 0.20)
  push(input.syllableTotal, scales.syllableMax, isLow ? 0.15 : 0.10)
  push(input.sentenceTotal, scales.sentenceMax, isLow ? 0.30 : 0.25)
  if (!input.compNotAdministered) {
    push(input.compTotal, scales.compMax, isLow ? 0.20 : 0.45)
  }

  const withinBand = parts.length > 0
    ? parts.reduce((s, p) => s + p.value * p.weight, 0) / parts.reduce((s, p) => s + p.weight, 0)
    : 0.5 // nothing to go on: sit mid-band rather than at its floor

  const ceiling = notSustained ? band.unsustainedCeiling : band.ceiling
  const composite = band.floor + withinBand * (ceiling - band.floor)

  return {
    composite,
    effectiveLevel,
    attemptedLevel: attempted,
    downgraded: notSustained,
    suggestedClass: g2ClassFromBand(composite),
  }
}

/**
 * The band-to-class mapping. Because the bands are evenly spaced by passage
 * level, this comes out as roughly one class per passage -- which is the point:
 * the passage a Grade 2 student can hold is the strongest single signal the
 * test produces.
 */
export function g2ClassFromBand(composite: number): EnglishClassName {
  if (composite < 20) return 'Lily'
  if (composite < 35) return 'Camellia'
  if (composite < 50) return 'Daisy'
  if (composite < 65) return 'Sunflower'
  if (composite < 80) return 'Marigold'
  return 'Snapdragon'
}
