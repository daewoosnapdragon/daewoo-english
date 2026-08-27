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

import { G2Content, G2PassageLevel, getG2Content, g2VersionKeyForTest } from './grade2Content'
import { G3Content, getG3Content, g3VersionKeyForTest } from './grade3Content'
import { G4Content, getG4Content, g4VersionKeyForTest } from './grade4Content'
import { G5Content, getG5Content, g5VersionKeyForTest } from './grade5Content'

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
export const FRUSTRATION_ACCURACY = 90

/**
 * Reading accuracy at or above this is independent level: the passage is too
 * easy and the student should be tried one level up. Every grade's guide gives
 * the same 97%, so it lives here rather than in each content file.
 */
export const INDEPENDENT_ACCURACY = 97

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
  /** The guide's own fluency rating, 1-4. */
  naep?: number | null
  /** RAW words correct per minute. Never the passage-weighted figure -- see below. */
  cwpm?: number | null
}

/**
 * Where a raw CWPM sits among the students who sustained the SAME passage.
 *
 * Rate is the one oral measure that is not passage-relative: 90 wpm on level B
 * and 90 on level E are not the same achievement. Every other input here is
 * scale-free by construction, so rate needs a level-specific yardstick before
 * it can be compared -- and the teacher guides give none. None of them mention
 * reading rate at all; every grade's Independent / Instructional / Frustration
 * table is defined on accuracy and comprehension only.
 *
 * So the yardstick is the cohort at that level. `reliable` carries the same
 * sample-size gate the outlier flags use: below it the term is dropped and the
 * remaining inputs renormalize, rather than positioning a student against a
 * median built from two classmates.
 */
export interface LevelCwpmNorm {
  medianCwpm: number | null
  reliable: boolean
}

/**
 * How a student is positioned INSIDE their band.
 *
 * The band floor already carries passage difficulty -- that is the whole point
 * of it -- so nothing here may be passage-weighted a second time. Every input
 * is a measure where "good" means the same thing on level B as on level E:
 * comprehension out of its max, accuracy as a percentage, NAEP on its 1-4
 * scale, and rate against the cohort at that same level.
 *
 * Weights are relative and renormalize over whatever a student actually has,
 * so a grade with no phonics or sentence sections lands on comprehension 45,
 * accuracy 20, NAEP 20, rate 15 without needing its own table.
 *
 * Comprehension leads because the guides say so outright: "when accuracy and
 * comprehension disagree, comprehension decides." Rate trails because the
 * guides exclude it from placement entirely -- it is here to separate two
 * readers who are otherwise tied, not to place either of them.
 */
const WITHIN_BAND_WEIGHTS = {
  low:  { phonics: 0.35, syllables: 0.15, sentences: 0.30, comp: 0.20, accuracy: 0.10, naep: 0.10, cwpm: 0.05 },
  high: { phonics: 0.20, syllables: 0.10, sentences: 0.25, comp: 0.45, accuracy: 0.20, naep: 0.20, cwpm: 0.15 },
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
export function calculateG2Band(input: G2BandInput, scales: BandScales, cwpmNorm?: LevelCwpmNorm): G2BandResult | null {
  const attempted = LEVEL_ORDER.find(l => l === input.passageLevel)
  if (!attempted) return null

  // ── Was the passage sustained? ──
  const compMax = scales.compMax
  const compKnown = !input.compNotAdministered && input.compTotal != null

  // Where the guide names a comprehension cut point, use it. Otherwise fall
  // back to the ratio, which approximates the same judgment for the grades
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
  const w = isLow ? WITHIN_BAND_WEIGHTS.low : WITHIN_BAND_WEIGHTS.high
  const parts: { value: number; weight: number }[] = []
  const push = (raw: number | null | undefined, max: number, weight: number) => {
    if (raw == null || max <= 0) return
    parts.push({ value: Math.max(0, Math.min(1, raw / max)), weight })
  }

  push(input.phonicsTotal, scales.phonicsMax, w.phonics)
  push(input.syllableTotal, scales.syllableMax, w.syllables)
  push(input.sentenceTotal, scales.sentenceMax, w.sentences)
  if (!input.compNotAdministered) {
    push(input.compTotal, scales.compMax, w.comp)
  }

  // Accuracy, rescaled across the band the guides actually care about. A raw
  // percentage would waste most of its range: nobody places on a passage they
  // read at 40%, so 0-90% is all one thing ("not sustained", already handled by
  // the downgrade above) and the real signal is 90 -> 97, frustration to
  // independent. Rescaling makes that seven-point stretch the whole 0-1 range.
  if (input.accuracyPct != null) {
    const span = INDEPENDENT_ACCURACY - FRUSTRATION_ACCURACY
    parts.push({ value: Math.max(0, Math.min(1, (input.accuracyPct - FRUSTRATION_ACCURACY) / span)), weight: w.accuracy })
  }
  // NAEP 1-4 -> 0-1. The guides ask for a rating on every student who reads,
  // including one who is cut off, so coverage is close to complete.
  if (input.naep != null && input.naep > 0) {
    parts.push({ value: Math.max(0, Math.min(1, (input.naep - 1) / 3)), weight: w.naep })
  }
  // Rate, against the cohort at this level -- see LevelCwpmNorm. Median maps to
  // the middle of the range and twice the median to the top, so this separates
  // tied readers without ever letting rate override the passage they sustained.
  if (input.cwpm != null && input.cwpm > 0 && cwpmNorm?.reliable && (cwpmNorm.medianCwpm ?? 0) > 0) {
    parts.push({ value: Math.max(0, Math.min(1, 0.5 * (input.cwpm / (cwpmNorm.medianCwpm as number)))), weight: w.cwpm })
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

// ─── Resolving a band straight from a stored score ───────────────────
// Three screens now need "what band was this, on that test" -- the results
// table, the per-student history and the overview. Each had started to grow its
// own copy of the content lookup, and each copy is a place to forget that
// getG*Content returns null for a version key it does not know.

/** The version key a test's content is authored under, or '' for Grade 1. */
export function bandVersionKeyForTest(test: { grade?: number | string; academic_year?: string | null; semester?: string | null }): string {
  const g = Number((test as any).grade)
  if (g === 2) return g2VersionKeyForTest(test as any)
  if (g === 3) return g3VersionKeyForTest(test as any)
  if (g === 4) return g4VersionKeyForTest(test as any)
  if (g === 5) return g5VersionKeyForTest(test as any)
  return ''
}

/**
 * The band for a stored `calculated_metrics`, or null when it cannot be had --
 * no passage on record, a grade without an authored band, or a version key this
 * build does not recognise. Never throws: a band we cannot compute is missing
 * data, not a broken page.
 */
export function bandFromCalc(
  test: { grade?: number | string; academic_year?: string | null; semester?: string | null },
  calc: any,
  cwpmNorm?: LevelCwpmNorm,
): G2BandResult | null {
  try {
    const g = Number((test as any).grade)
    const key = bandVersionKeyForTest(test)
    if (!key) return null
    const content = g === 2 ? getG2Content(key) : g === 3 ? getG3Content(key)
      : g === 4 ? getG4Content(key) : g === 5 ? getG5Content(key) : null
    if (!content) return null
    const scales = g === 2 ? bandScalesFromG2(content as G2Content)
      : g === 3 ? bandScalesFromG3(content as G3Content)
      : g === 4 ? bandScalesFromG4(content as G4Content)
      : g === 5 ? bandScalesFromG5(content as G5Content) : null
    if (!scales) return null
    return calculateG2Band({
      passageLevel: calc?.passage_level ?? null,
      phonicsTotal: calc?.phonics_total ?? null,
      syllableTotal: calc?.syllable_total ?? null,
      sentenceTotal: calc?.sentence_total ?? null,
      compTotal: calc?.comp_total ?? null,
      compNotAdministered: calc?.comp_not_administered ?? null,
      accuracyPct: calc?.accuracy_pct ?? null,
      naep: calc?.naep ?? null,
      cwpm: calc?.cwpm ?? null,
    }, scales, cwpmNorm)
  } catch {
    return null
  }
}

/** The band's floor and ceiling for a level, for reading class overlap. */
export function bandRangeFor(level: string): { floor: number; ceiling: number } | null {
  const b = LEVEL_BANDS[level as G2PassageLevel]
  return b ? { floor: b.floor, ceiling: b.ceiling } : null
}

/** Every class the band scale can suggest, weakest first. */
export { LEVEL_ORDER as BAND_LEVEL_ORDER }
