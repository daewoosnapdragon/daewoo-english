'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Circle, BookOpen, Mic, PenTool, Eye, FileText, Users, BarChart3, Info, X, RotateCcw, Check, Star, Ban } from 'lucide-react'
import {
  g1ContentForTest, g1VersionKeyForTest, getG1Content, g1WrittenScoredMax, g1WrittenTotalMax,
  G1_LEGACY_VERSION,
} from './grade1Content'
import type { G1Content, G1QuestionDef, G1WritingCategory, PassageLevel } from './grade1Content'
import TestNotesPanel from './TestNotesPanel'
import { G1_ORAL_NOTES, STOPPING_NOTES } from './testNotes'

// ============================================================================
// GRADE 1 TEST CONFIGURATION
// ============================================================================
// All test content -- questions, passages, word lists, rubrics, standards --
// lives in grade1Content.ts, versioned by academic year and semester so that
// editing a test never re-points historical scores. Everything in this file
// reads the resolved `content` for the level test being scored.

const NAEP_LABELS: Record<number, string> = {
  1: 'Word-by-word, no expression',
  2: 'Two-word phrases, some expression',
  3: 'Mostly smooth, appropriate expression',
  4: 'Fluent with consistent expression',
}
const NAEP_MULTIPLIERS: Record<number, number> = { 1: 0.85, 2: 0.95, 3: 1.0, 4: 1.1 }


// ============================================================================
// PLACEMENT ALGORITHM - GRADE 1 SPECIFIC
// ============================================================================

/**
 * Which half of the Grade 1 record a key belongs to.
 *
 * The oral half is everything captured in the one-to-one session, including
 * the teacher's notes and impression. Everything else -- the `w_` subtotals,
 * the multiple choice, the writing rubric -- is the written half. The two
 * halves are entered by different teachers at the same time, so a save carries
 * only the half it changed.
 */
function isG1OralKey(k: string): boolean {
  return k.startsWith('o_') || k === 'passages_attempted'
    || k === 'wave1_class_impression' || k === 'teacher_notes'
}

/** Written keys holding an object that two markers may fill in between them. */
const G1_WRITTEN_NESTED = ['written_answers', 'written_rubric']

interface G1Scores {
  // Written -- backward-compatible section subtotals, derived at save time.
  w_letter_names?: number | null
  w_letter_sounds?: number | null
  w_word_picture?: number | null    // legacy sections only
  w_passage_comp?: number | null    // legacy sections only
  w_picture_match?: number | null   // Fall 2026 onward
  w_story_comp?: number | null      // Fall 2026 onward
  w_short_writing?: number | null   // Fall 2026 onward
  w_writing?: number | null
  // Oral
  o_alpha_names?: number | null
  o_alpha_sounds?: number | null
  o_alpha_words?: number | null
  o_alpha_words_note?: string | null
  o_phoneme?: number | null
  o_passage_level?: string | null
  o_orf_raw?: number | null
  o_orf_words_read?: number | null
  o_orf_errors?: number | null
  o_orf_time_seconds?: number | null
  /** Which word got which mark, so a reopened passage is not a clean page. */
  o_orf_word_marks?: Record<number, 'error' | 'self_correct' | null> | null
  o_naep?: number | null
  o_comp_q1?: number | null
  o_comp_q2?: number | null
  o_comp_q3?: number | null
  o_comp_q4?: number | null
  o_comp_q5?: number | null
  /**
   * The student was stopped during the passage, so the comprehension questions
   * were never asked. Distinct from scoring them 0: comprehension is excluded
   * from the composite and rendered as "not administered" rather than a zero.
   */
  o_comp_not_administered?: boolean | null
  o_open_response?: number | null
  // Level A per-question scores
  o_a_q1?: number | null
  o_a_q2?: number | null
  o_a_q3?: number | null
  o_a_q4?: number | null
  o_a_q5?: number | null
  // Phoneme per-word scores
  o_ph_seg_sun?: boolean | null
  o_ph_seg_map?: boolean | null
  o_ph_seg_leg?: boolean | null
  o_ph_seg_fish?: boolean | null
  o_ph_count_sun?: boolean | null
  o_ph_count_map?: boolean | null
  o_ph_count_leg?: boolean | null
  o_ph_count_fish?: boolean | null
  o_ph_bme_sun_b?: boolean | null
  o_ph_bme_sun_m?: boolean | null
  o_ph_bme_sun_e?: boolean | null
  o_ph_bme_map_b?: boolean | null
  o_ph_bme_map_m?: boolean | null
  o_ph_bme_map_e?: boolean | null
  o_ph_bme_leg_b?: boolean | null
  o_ph_bme_leg_m?: boolean | null
  o_ph_bme_leg_e?: boolean | null
  o_ph_bme_fish_b?: boolean | null
  o_ph_bme_fish_m?: boolean | null
  o_ph_bme_fish_e?: boolean | null
  // Per-question written test data (bubble-sheet format)
  written_answers?: Record<number, string>   // qNum -> 'a'|'b'|'c'|'d'
  written_rubric?: Record<string, number>    // category key -> 0..max
  /** Checklist categories: category key -> checked box keys. */
  written_checklist?: Record<string, string[]>
  written_mc?: number                        // total MC correct
  writing_bonus?: number                     // extended writing rubric total (0-20)
  /** Short constructed-response item (Fall 2026 onward), 0-3. */
  writing_short?: number | null
  // Phoneme per-word scores are stored under version-specific keys
  // (o_ph_* legacy, o_ph26_* Fall 2026), read through the content registry.
  // Teacher
  teacher_impression?: number | null
  teacher_notes?: string
  // Wave 1 class impression (teacher's gut feeling after oral test)
  wave1_class_impression?: string | null
  // Wave 2 class impression (after written + oral data)
  wave2_class_impression?: string | null
  // Retention rating: how student performs within their current class
  wave2_retention_rating?: 'weak' | 'core' | 'strong' | null
}

/**
 * The four Teacher Ratings dimensions, each 1-4, as every other grade records
 * them. Passed in rather than read off `scores` because they live in their own
 * table and their own phase, not on the test score.
 */
export interface G1AnecdotalRating {
  receptive_language?: number | null
  productive_language?: number | null
  engagement_pace?: number | null
  placement_recommendation?: number | null
}

/** 0-1, or null when the teacher has rated nothing. Mirrors grades 2-5. */
function anecdotalScore(anec: G1AnecdotalRating | null | undefined): number | null {
  if (!anec) return null
  const vals = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation]
    .filter(v => v != null) as number[]
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / (vals.length * 4)
}

function calculateG1Composite(scores: G1Scores, content: G1Content, currentClass?: EnglishClass | null, anecdotal?: G1AnecdotalRating | null): {
  writtenPct: number
  writtenMC: number
  writingBonus: number
  writingShort: number | null
  oralScore: number  // 0-100 normalized
  teacherPct: number
  composite: number
  wave: 1 | 2
  passageLevel: string
  cwpm: number | null
  weightedCwpm: number | null
  accuracy: number | null
  effectiveLevel: string
  compTotal: number | null
  compMax: number | null
  compAnswered: number
  compNotAdministered: boolean
  standardsBaseline: { code: string; met: boolean; score: number; threshold: number }[]
  suggestedClass: EnglishClass
} {
  // -- Written score --
  // Where writing counts in the total (Fall 2026 on) the percentage spans the
  // whole paper: multiple choice + short writing + extended writing. Where it
  // is a bonus (original test) extended writing is left out here and added
  // afterward, so the tuned bonus thresholds keep their meaning.
  const writingInTotal = content.extendedWriting.scoring === 'in_total'
  let writtenPct = 0
  let writtenMC = 0
  let writingBonus = 0
  let writingShort: number | null = null

  if (scores.written_answers && Object.keys(scores.written_answers).length > 0) {
    // Per-question format
    writtenMC = content.written.questions.reduce((sum, q) =>
      sum + (scores.written_answers![q.qNum] === q.correct ? 1 : 0), 0)
    writingShort = content.shortWriting ? (scores.writing_short ?? 0) : null
    writingBonus = scores.writing_bonus ?? 0
    const scoredMax = g1WrittenScoredMax(content)
    const scored = writtenMC + (writingShort ?? 0) + (writingInTotal ? writingBonus : 0)
    writtenPct = scoredMax > 0 ? (scored / scoredMax) * 100 : 0
  } else {
    // Old section-subtotal format (backward compat)
    const wScores = [
      scores.w_letter_names, scores.w_letter_sounds,
      scores.w_word_picture, scores.w_passage_comp, scores.w_writing
    ].filter(v => v != null) as number[]
    const writtenRaw = wScores.reduce((a, b) => a + b, 0)
    const legacySectionTotal = content.written.sections.reduce((a, s) => a + s.max, 0)
    writtenMC = writtenRaw
    writtenPct = legacySectionTotal > 0 ? (writtenRaw / legacySectionTotal) * 100 : 0
  }

  // -- Oral score (normalized 0-100) --
  const passageLevel = (scores.o_passage_level || 'A') as PassageLevel
  const config = content.passageConfigs[passageLevel]

  // Alphabet subscore (raw -> normalize)
  const alphaRaw = ((scores.o_alpha_names ?? 0) + (scores.o_alpha_sounds ?? 0) + (scores.o_alpha_words ?? 0))
  const alphaPct = content.alphabet.total > 0 ? (alphaRaw / content.alphabet.total) * 100 : 0

  // Phoneme subscore
  const phonemePct = content.phoneme.max > 0 ? ((scores.o_phoneme ?? 0) / content.phoneme.max) * 100 : 0

  // ORF subscore - this varies dramatically by level
  let orfPct = 0
  let cwpm: number | null = null
  let weightedCwpm: number | null = null
  let accuracy: number | null = null

  if (passageLevel === 'A') {
    const aMax = content.levelA.max || 1
    let rawScore: number
    if (content.levelA.mode === 'holistic') {
      // One rating for the whole interview, stored in o_orf_raw.
      rawScore = scores.o_orf_raw ?? 0
    } else {
      const aTotal = (scores.o_a_q1 ?? 0) + (scores.o_a_q2 ?? 0) + (scores.o_a_q3 ?? 0) + (scores.o_a_q4 ?? 0) + (scores.o_a_q5 ?? 0)
      rawScore = aTotal > 0 ? aTotal : (scores.o_orf_raw ?? 0)
    }
    orfPct = (rawScore / aMax) * 100
  } else if (passageLevel === 'B') {
    orfPct = ((scores.o_orf_raw ?? 0) / (content.levelB.max || 1)) * 100
  } else if (passageLevel === 'C') {
    orfPct = ((scores.o_orf_raw ?? 0) / (content.levelC.max || 1)) * 100
  } else {
    // Levels D-F: Calculate CWPM
    const wordsRead = scores.o_orf_words_read ?? 0
    const errors = scores.o_orf_errors ?? 0
    const timeSeconds = scores.o_orf_time_seconds ?? 60
    const wordsCorrect = Math.max(0, wordsRead - errors)

    if (wordsRead > 0) {
      accuracy = Math.round((wordsCorrect / wordsRead) * 1000) / 10
    }
    if (timeSeconds > 0) {
      cwpm = Math.round((wordsCorrect / timeSeconds) * 60)
    }

    weightedCwpm = cwpm

    if (cwpm != null) {
      orfPct = Math.min(100, (cwpm / 90) * 100)
    }
  }

  // ── Comprehension subscore ──
  // A student who was stopped mid-passage never heard the questions. That is
  // not a score of 0 -- it carries no information about comprehension -- so the
  // subtest is dropped and the remaining weights renormalize around it.
  const compNotAdministered = !!scores.o_comp_not_administered && config.compQuestions > 0
  let compTotal: number | null = null
  let compMax: number | null = null
  let compAnswered = 0
  if (config.compQuestions > 0 && !compNotAdministered) {
    const compScores = [scores.o_comp_q1, scores.o_comp_q2, scores.o_comp_q3, scores.o_comp_q4]
    if (config.compQuestions >= 5) compScores.push(scores.o_comp_q5)
    const validComp = compScores.filter(v => v != null) as number[]
    compAnswered = validComp.length
    // Null when nothing has been scored yet -- distinct from a scored 0.
    if (compAnswered > 0) {
      compTotal = validComp.reduce((a, b) => a + b, 0)
      compMax = config.compMax
    }
  }
  const compPct = compMax && compMax > 0 && compTotal != null ? (compTotal / compMax) * 100 : 0

  // Open response
  const openPct = content.openResponse.max > 0
    ? ((scores.o_open_response ?? 0) / content.openResponse.max) * 100
    : 0

  // ── Oral score: passage-level-gated scoring ──
  // The passage level is the strongest signal of where a Grade 1 student belongs.
  // A student reading passage E should ALWAYS outscore a student on passage A.
  // We use the passage level to set a floor, then subtests determine position within the band.
  //
  // Passage floors (aligned to 6 classes across 0-100):
  //   A = 0-16  (pre-readers, Lily territory)
  //   B = 17-32 (early decoding, Lily-Camellia)
  //   C = 33-49 (beginning fluency, Camellia-Daisy)
  //   D = 50-66 (developing fluency, Daisy-Sunflower)
  //   E = 67-83 (fluent readers, Marigold territory)
  //   F = 84-100 (advanced, Snapdragon territory)

  // The bands OVERLAP by design. Teachers do not hand every strong reader the
  // hardest passage -- a Snapdragon student is often given E rather than F.
  // With hard-walled bands that choice alone decided the class: a student on E
  // had to score essentially 100% on the subtests to reach Snapdragon, and at
  // 80% landed in Marigold. The passage the teacher picked was outranking the
  // performance. Overlapping the ceilings means acing a passage carries you
  // into the class above, so reading E well and reading F adequately land in
  // the same place. Floors are unchanged, so a weak showing still sits where
  // the passage puts it.
  //
  // `ceiling` applies to a student who held their passage. `unsustainedCeiling`
  // is the old tight ceiling, used when the passage was NOT held: the overlap
  // is an inference from sustaining a passage, and a student who was cut off,
  // read at frustration level, or followed none of the story has not earned it.
  // Without the distinction the downgrade below is toothless -- it moves the
  // band down and the overlap hands the class straight back.
  const LEVEL_BANDS: Record<string, { floor: number; ceiling: number; unsustainedCeiling: number }> = {
    A: { floor: 0, ceiling: 24, unsustainedCeiling: 16 },
    B: { floor: 17, ceiling: 41, unsustainedCeiling: 32 },
    C: { floor: 33, ceiling: 58, unsustainedCeiling: 49 },
    D: { floor: 50, ceiling: 75, unsustainedCeiling: 66 },
    E: { floor: 67, ceiling: 92, unsustainedCeiling: 83 },
    F: { floor: 84, ceiling: 100, unsustainedCeiling: 100 },
  }
  const band = LEVEL_BANDS[passageLevel] || LEVEL_BANDS['A']
  const bandWidth = band.ceiling - band.floor

  // Within-band performance: weighted subtests (all normalized 0-1)
  // At low levels, alphabet is the strongest discriminator between Lily/Camellia.
  // At higher levels, ORF and comprehension matter more.
  type SubtestEntry = { value: number; weight: number }
  const withinBandParts: SubtestEntry[] = []

  // Level-dependent weights: alphabet is weighted more at A/B where it's the key differentiator
  const isLowLevel = passageLevel === 'A' || passageLevel === 'B'
  const alphaWeight   = isLowLevel ? 0.35 : 0.20
  const phonemeWeight = isLowLevel ? 0.25 : 0.20
  const orfWeight     = isLowLevel ? 0.20 : 0.30
  const compWeight    = isLowLevel ? 0.10 : 0.20
  const openWeight    = isLowLevel ? 0.10 : 0.10

  // Alphabet (all levels)
  if (alphaRaw > 0) withinBandParts.push({ value: alphaPct / 100, weight: alphaWeight })
  // Phoneme (all levels)
  if ((scores.o_phoneme ?? 0) > 0) withinBandParts.push({ value: phonemePct / 100, weight: phonemeWeight })
  // ORF (passage-level-specific performance)
  if (orfPct > 0) withinBandParts.push({ value: Math.min(orfPct / 100, 1), weight: orfWeight })
  // Comprehension (levels with comp questions). Gated on whether it was
  // actually scored, not on the value: a scored 0 is real evidence of weak
  // comprehension and counts, while "not asked" and "not scored yet" do not.
  if (compTotal != null) withinBandParts.push({ value: Math.min(compPct / 100, 1), weight: compWeight })
  // Open response
  if ((scores.o_open_response ?? 0) > 0) withinBandParts.push({ value: openPct / 100, weight: openWeight })

  let withinBandAvg: number
  if (withinBandParts.length > 0) {
    const totalWeight = withinBandParts.reduce((sum, p) => sum + p.weight, 0)
    withinBandAvg = withinBandParts.reduce((sum, p) => sum + p.value * p.weight, 0) / totalWeight
  } else {
    withinBandAvg = 0.5 // default to mid-band if no subtest data
  }

  let oralScore = band.floor + (withinBandAvg * bandWidth)

  // ── Cut off mid-passage ──
  // The band floor assumes the student handled the passage they were given. A
  // student stopped partway through demonstrably did not: the teacher's guide
  // says outright that "a student who is cut off is usually placed too high."
  // Pull them down toward the level below rather than leaving them sitting on
  // a floor they never earned. Their subtest position within the band is kept,
  // so a strong-alphabet student still lands above a weak one.
  //
  // Reading accuracy below ~90% is frustration level: the words on the page are
  // too hard, whatever the rate. Without this a student who ground through
  // passage F at 64% accuracy still collected F's floor and landed in the top
  // class. Both signals mean the same thing -- this passage was above them.
  //
  // Comprehension far below the ceiling is the same conclusion reached a
  // different way: the student got through the words without following the
  // story. Without it, a student who read passage F accurately but answered
  // every comprehension question wrong still collected F's floor and read as
  // Snapdragon. This extends the guide rather than quoting it -- the guide
  // speaks only about being cut off -- so it is set low enough to catch
  // near-total non-comprehension and not merely weak comprehension.
  const FRUSTRATION_ACCURACY = 90
  const NON_COMPREHENSION_RATIO = 0.25
  const belowFrustration = accuracy != null && accuracy < FRUSTRATION_ACCURACY
  const nonComprehension = !compNotAdministered
    && compTotal != null
    && compMax != null
    && compMax > 0
    && compTotal / compMax < NON_COMPREHENSION_RATIO
  const passageNotSustained = compNotAdministered || belowFrustration || nonComprehension
  const LEVEL_ORDER: PassageLevel[] = ['A', 'B', 'C', 'D', 'E', 'F']
  // The level the student actually held. Everything downstream -- the band and
  // the suggested class -- keys off this rather than the level the teacher
  // happened to hand them, so the two cannot disagree.
  const effectiveLevel: PassageLevel = passageNotSustained
    ? LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(passageLevel) - 1)]
    : passageLevel
  if (passageNotSustained) {
    const belowBand = LEVEL_BANDS[effectiveLevel] || band
    oralScore = belowBand.floor + (withinBandAvg * (belowBand.unsustainedCeiling - belowBand.floor))
  }

  // ── Teacher judgment ──
  // The original test asked the teacher to guess a placement class outright.
  // From Fall 2026 the signal is the retention rating instead: where the
  // student sits inside the class they have actually been taught in all term.
  // That is anchored to something the teacher has watched for months rather
  // than a guess about a class they have not seen the student in.
  //
  // A rating is read as a position within the current class's composite band:
  // weak sits at its floor, core in the middle, strong at its ceiling -- so
  // "strong in Daisy" lands just below "weak in Sunflower", which is the
  // ordering teachers mean by it.
  const CLASS_IMPRESSION_MAP: Record<string, number> = {
    Lily: 8, Camellia: 25, Daisy: 42, Sunflower: 58, Marigold: 75, Snapdragon: 92
  }
  const usesImpression = content.teacherSignal === 'class_impression'
  const usesRetention = content.teacherSignal === 'retention_rating'
  const usesAnecdotal = content.teacherSignal === 'anecdotal_ratings'
  const anecPct = usesAnecdotal ? anecdotalScore(anecdotal) : null

  const hasW2Impression = usesImpression && scores.wave2_class_impression && scores.wave2_class_impression !== 'Unsure'
  const hasW1Impression = usesImpression && scores.wave1_class_impression && scores.wave1_class_impression !== 'Unsure'
  const activeImpression = hasW2Impression ? scores.wave2_class_impression : scores.wave1_class_impression

  const hasClassImpression = !!(hasW2Impression || hasW1Impression)
  const hasNumericImpression = usesImpression && scores.teacher_impression != null

  const teacherPct = anecPct != null
    ? anecPct * 100
    : hasClassImpression
      ? (CLASS_IMPRESSION_MAP[activeImpression as string] ?? 50)
      : hasNumericImpression
        ? ((scores.teacher_impression! - 1) / 4) * 100
        : 50

  // The retention rating is applied further down as a bounded nudge, NOT as a
  // position inside the current class's band. Anchoring it to the band made the
  // current class outrank the test: a Lily student now reading passage E scored
  // below a Daisy student reading the same passage just as well, which is
  // exactly the student leveling exists to catch. A nudge lets the teacher
  // adjust at the margin without the old placement overriding new evidence.
  const RETENTION_NUDGE: Record<string, number> = { weak: -6, core: 0, strong: 6 }
  const retentionRating = usesRetention ? scores.wave2_retention_rating : null

  // Presence of answers, not their value: a student who got everything wrong
  // has still sat the written test, and scoring them as "oral only" would hide
  // that. Matters more now that writing counts, since a blank paper is 0 too.
  const hasWrittenData = (!!scores.written_answers && Object.keys(scores.written_answers).length > 0)
    || writtenMC > 0 || writtenPct > 0
  const hasOralData = scores.o_passage_level != null

  let composite: number
  let wave: 1 | 2

  if (!hasWrittenData) {
    // Oral only -- the written test has not been entered yet
    if (hasClassImpression) {
      composite = oralScore * 0.65 + teacherPct * 0.35
    } else {
      composite = oralScore
    }
    wave = 1
  } else {
    // Oral + written
    if (hasOralData && hasClassImpression) {
      composite = oralScore * 0.40 + writtenPct * 0.35 + teacherPct * 0.25
    } else if (hasOralData) {
      composite = oralScore * 0.55 + writtenPct * 0.45
    } else {
      // Written-only: no oral assessment was done. Cap composite so a strong
      // written score alone can't outrank students who demonstrated actual
      // reading ability on higher passage levels. Max ~35 = top of Camellia.
      composite = Math.min(writtenPct * 0.55, 35)
      if (hasClassImpression) {
        composite = composite * 0.65 + teacherPct * 0.35
      }
    }
    wave = 2
  }

  // Retention nudge: about a third of a class band, so it can tip a borderline
  // student either way but never move them a full class on its own.
  if (retentionRating && RETENTION_NUDGE[retentionRating] != null) {
    composite = Math.max(0, Math.min(100, composite + RETENTION_NUDGE[retentionRating]))
  }

  // ── Passage-level composite cap ──
  // A strong written MC score shouldn't let a Level A/B student outrank kids who
  // demonstrated actual reading on higher passages. Cap the composite so the
  // passage level remains the dominant signal.
  const LEVEL_COMPOSITE_CAP: Record<string, number> = {
    A: 38,   // can reach mid-Camellia at most
    B: 48,   // can reach low-Daisy at most
    C: 60,   // can reach low-Sunflower at most
  }
  const cap = LEVEL_COMPOSITE_CAP[effectiveLevel]
  if (cap != null && composite > cap) {
    composite = cap
  }

  // Writing bonus: sliding scale based on bonus score itself
  // 0-4 = no effect, 5-9 = small nudge, 10-14 = meaningful, 15-20 = major
  // Skipped where writing already counts inside writtenPct, which would
  // otherwise credit the same 20 points twice.
  if (!writingInTotal) {
    if (writingBonus >= 15) {
      composite += writingBonus * 0.50  // max +10
    } else if (writingBonus >= 10) {
      composite += writingBonus * 0.35  // max +4.9
    } else if (writingBonus >= 5) {
      composite += writingBonus * 0.20  // max +1.8
    }
  }

  // -- Standards baseline --
  const standardsBaseline = content.standards.map(std => {
    let score = (scores as any)[std.testSection] ?? 0
    if (std.alsoChecks) {
      const altScore = (scores as any)[std.alsoChecks] ?? 0
      const primaryMax = content.written.sections.find(s => s.key === std.testSection)?.max ?? 1
      const altMax = std.alsoChecks === 'o_alpha_names'
        ? content.alphabet.nameMax
        : std.alsoChecks === 'o_alpha_sounds' ? content.alphabet.soundMax : 1
      const primaryPct = score / primaryMax
      const altPct = altMax > 0 ? altScore / altMax : 0
      if (altPct > primaryPct) {
        score = Math.round(altPct * primaryMax)
      }
    }
    return {
      code: std.code,
      met: score >= std.masteryThreshold,
      score,
      threshold: std.masteryThreshold,
    }
  })

  const suggestedClass = suggestG1Class(effectiveLevel, composite, writtenMC, scores, cwpm, writingBonus, content)

  return {
    writtenPct, writtenMC, writingBonus, writingShort, oralScore, teacherPct, composite, wave,
    passageLevel, cwpm, weightedCwpm, accuracy, effectiveLevel,
    compTotal, compMax, compAnswered, compNotAdministered, standardsBaseline, suggestedClass,
  }
}

// ── Cohort-relative placement ────────────────────────────────────────
// The composite above is absolute: a student's band is set by the passage they
// sustained, so a whole grade can land in the same class and nothing forces
// them apart. Placement itself is decided the way grades 2-5 have always
// decided it -- a weighted blend of the test parts, ranked across the grade and
// cut into six equal groups. The absolute band and passage level stay visible
// beside it as the reference for why a student sits where they do.
//
// Weights mirror the grades 2-5 Results tab. A part with no data drops out and
// its weight is shared among the rest, so an oral-only student is ranked on
// what they actually sat rather than being punished for the missing paper.
const G1_PLACEMENT_WEIGHTS = { oral: 0.40, mc: 0.15, writing: 0.35, teacher: 0.10 }

const G1_PLACEMENT_CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

function g1WeightedComposite(
  metrics: { oralScore: number; writtenMC: number; writingBonus: number; teacherPct: number },
  scores: G1Scores,
  content: G1Content,
  anecdotal?: G1AnecdotalRating | null,
): number | null {
  const hasOral = scores.o_passage_level != null
  const hasWritten = (!!scores.written_answers && Object.keys(scores.written_answers).length > 0)
    || metrics.writtenMC > 0
  const hasWriting = scores.writing_bonus != null
  const hasTeacher = content.teacherSignal === 'anecdotal_ratings'
    ? anecdotalScore(anecdotal) != null
    : content.teacherSignal === 'retention_rating'
      ? scores.wave2_retention_rating != null
      : !!(scores.wave2_class_impression || scores.wave1_class_impression || scores.teacher_impression != null)

  const parts: { score: number; weight: number }[] = []
  if (hasOral) parts.push({ score: metrics.oralScore / 100, weight: G1_PLACEMENT_WEIGHTS.oral })
  if (hasWritten && content.written.mcMax > 0) {
    parts.push({ score: metrics.writtenMC / content.written.mcMax, weight: G1_PLACEMENT_WEIGHTS.mc })
  }
  if (hasWriting && content.extendedWriting.max > 0) {
    parts.push({ score: metrics.writingBonus / content.extendedWriting.max, weight: G1_PLACEMENT_WEIGHTS.writing })
  }
  if (hasTeacher) parts.push({ score: metrics.teacherPct / 100, weight: G1_PLACEMENT_WEIGHTS.teacher })

  if (parts.length === 0) return null
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  return parts.reduce((s, p) => s + p.score * (p.weight / totalWeight), 0)
}

/**
 * Forced even split: rank ascending, cut into six equal groups. Identical in
 * shape to `suggestClass` on the grades 2-5 Results tab, so the two grades
 * place students by the same rule.
 */
function g1ClassFromRank(idx: number, total: number): EnglishClass {
  const p = total > 1 ? idx / (total - 1) : 0.5
  const bi = Math.min(Math.floor(p / (1 / G1_PLACEMENT_CLASSES.length)), G1_PLACEMENT_CLASSES.length - 1)
  return G1_PLACEMENT_CLASSES[bi]
}

/**
 * `passageLevel` here is the EFFECTIVE level -- the one the student sustained.
 * A student stopped mid-passage, or reading below 90% accuracy, is judged
 * against the level below the one they were handed.
 */
function suggestG1Class(
  passageLevel: string,
  composite: number,
  writtenMC: number,
  scores: G1Scores,
  cwpm: number | null,
  writingBonus: number = 0,
  content: G1Content,
): EnglishClass {
  // A strong writing score lowers the Snapdragon threshold for upper-band
  // discrimination. Only where writing is a bonus: when it counts in the
  // written total it has already lifted the composite, and applying this too
  // would reward the same 20 points twice.
  const snapBoost = content.extendedWriting.scoring === 'bonus' && writingBonus >= 12 ? 5 : 0

  // ── Low-end placement: composite-driven ──
  // At Levels A-C, the composite (which includes alphabet, phoneme, teacher
  // impression, and written scores) is more informative than a single ORF
  // cutoff. ORF still influences via the within-band average, but we let the
  // full composite decide placement so strong alphabet/phoneme students aren't
  // locked into Lily by one weak subtest.

  if (passageLevel === 'A') {
    // Level A students: pre-readers. Composite range is ~0-16 oral + written/teacher blend.
    if (composite < 15) return 'Lily'
    return composite > 35 ? 'Camellia' : 'Lily'
  }

  if (passageLevel === 'B') {
    // Level B: early decoders. Composite range ~17-32 oral + written/teacher blend.
    if (composite < 22) return 'Lily'
    if (composite < 40) return 'Camellia'
    return 'Daisy'
  }

  if (passageLevel === 'C') {
    // Level C: beginning fluency. Still use composite, but reading under about
    // a quarter of the words is a strong signal the student isn't reading at
    // sentence level yet. Expressed as a fraction so it survives a word-count
    // change between test versions (11 words legacy, 30 words Fall 2026).
    const sentenceFloor = Math.max(1, Math.round(content.levelC.max * 0.27))
    if ((scores.o_orf_raw ?? 0) < sentenceFloor && composite < 40) return 'Camellia'
    if (composite < 45) return 'Daisy'
    return 'Sunflower'
  }

  if (passageLevel === 'D') {
    if (cwpm != null && cwpm < 15) return 'Daisy'
    if (cwpm != null && cwpm < 25) return 'Sunflower'
    return composite > 65 ? 'Marigold' : 'Sunflower'
  }

  if (passageLevel === 'E') {
    if (cwpm != null && cwpm < 20) return 'Sunflower'
    if (cwpm != null && cwpm >= 35) return composite > (75 - snapBoost) ? 'Snapdragon' : 'Marigold'
    return 'Marigold'
  }

  if (passageLevel === 'F') {
    if (cwpm != null && cwpm < 25) return 'Marigold'
    if (cwpm != null && cwpm >= 40 && composite > (80 - snapBoost)) return 'Snapdragon'
    return composite > (70 - snapBoost) ? 'Snapdragon' : 'Marigold'
  }

  if (composite < 20) return 'Lily'
  if (composite < 35) return 'Camellia'
  if (composite < 50) return 'Daisy'
  if (composite < 65) return 'Sunflower'
  if (composite < 80) return 'Marigold'
  return 'Snapdragon'
}

// ============================================================================
// MAIN COMPONENT: Grade1ScoreEntry
// ============================================================================

function Grade1ScoreEntry({ levelTest, isAdmin, teacherClass }: {
  levelTest: LevelTest
  isAdmin: boolean
  teacherClass?: EnglishClass | null
}) {
  const { showToast, currentTeacher, confirmDialog } = useApp()
  // Resolve the content this test was (or will be) scored against, so historical
  // tests keep their original questions, passages and word lists.
  const versionKey = g1VersionKeyForTest(levelTest as any)
  const content = getG1Content(versionKey)
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, G1Scores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'written' | 'oral' | 'results'>('oral')
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'complete'>('all')
  const [activeClass, setActiveClass] = useState<EnglishClass>(teacherClass || 'Lily')

  // Load students and existing scores
  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*')
          .eq('grade', levelTest.grade).eq('is_active', true)
          
          .order('english_name'),
        supabase.from('level_test_scores').select('*')
          .eq('level_test_id', levelTest.id),
      ])

      if (studs) setStudents(studs)

      const scoreMap: Record<string, G1Scores> = {}
      if (existing) {
        existing.forEach((row: any) => {
          scoreMap[row.student_id] = row.raw_scores || {}
        })
      }
      setScores(scoreMap)
      setSavedSnapshot(JSON.parse(JSON.stringify(scoreMap)))
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  // Auto-save infrastructure
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, G1Scores>>({})
  const savingRef = useRef(false)
  // Bumped on every write, so the refresh can tell a save landed mid-fetch.
  const saveSeqRef = useRef(0)
  const scoresRef = useRef(scores)
  const savedSnapshotRef = useRef(savedSnapshot)
  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { savedSnapshotRef.current = savedSnapshot }, [savedSnapshot])

  const isStudentDirty = useCallback((sid: string) => {
    return JSON.stringify(scoresRef.current[sid] || {}) !== JSON.stringify(savedSnapshotRef.current[sid] || {})
  }, [])

  // Fields that belong to the current passage level and must be cleared on switch.
  // The teacher may re-test at another level if they misjudged; the previous
  // attempt is archived into passages_attempted rather than discarded.
  const G1_PASSAGE_FIELDS = [
    'o_orf_raw', 'o_orf_words_read', 'o_orf_errors', 'o_orf_time_seconds', 'o_orf_word_marks',
    'o_naep', 'o_comp_q1', 'o_comp_q2', 'o_comp_q3', 'o_comp_q4', 'o_comp_q5',
    'o_comp_not_administered',
    'o_a_q1', 'o_a_q2', 'o_a_q3', 'o_a_q4', 'o_a_q5',
  ]

  const updateScore = useCallback((studentId: string, key: string, value: number | string | boolean | null | Record<string, unknown>) => {
    setScores(prev => {
      const current = prev[studentId] || {}
      // If changing passage level, archive current passage data and clear fields
      if (key === 'o_passage_level' && current.o_passage_level && value !== current.o_passage_level) {
        const archive: Record<string, any> = { level: current.o_passage_level }
        G1_PASSAGE_FIELDS.forEach(f => { if ((current as any)[f] != null) archive[f] = (current as any)[f] })
        const hasData = G1_PASSAGE_FIELDS.some(f => (current as any)[f] != null)
        const attempts = Array.isArray((current as any).passages_attempted) ? [...(current as any).passages_attempted] : []
        if (hasData) attempts.push(archive)
        const cleared: Record<string, any> = { ...current, o_passage_level: value, passages_attempted: attempts }
        G1_PASSAGE_FIELDS.forEach(f => { delete cleared[f] })
        return { ...prev, [studentId]: cleared }
      }
      return { ...prev, [studentId]: { ...current, [key]: value } }
    })
  }, [])

  const updateWrittenAnswer = useCallback((studentId: string, qNum: number, choice: string) => {
    setScores(prev => {
      const current = prev[studentId] || {}
      const answers = { ...(current.written_answers || {}), [qNum]: choice }
      // If toggling same answer off, delete it
      if (current.written_answers?.[qNum] === choice) {
        delete answers[qNum]
      }
      return { ...prev, [studentId]: { ...current, written_answers: answers } }
    })
  }, [])

  const updateWrittenRubric = useCallback((studentId: string, category: string, score: number) => {
    setScores(prev => {
      const current = prev[studentId] || {}
      const rubric = { ...(current.written_rubric || {}), [category]: score }
      return { ...prev, [studentId]: { ...current, written_rubric: rubric } }
    })
  }, [])

  // Checklist categories score by count of checked boxes, not by a ladder row.
  // The boxes are independent: checking a later one does not imply the earlier.
  const toggleWrittenChecklist = useCallback((studentId: string, category: string, boxKey: string) => {
    setScores(prev => {
      const current = prev[studentId] || {}
      const all = { ...(current.written_checklist || {}) }
      const checked = new Set(all[category] || [])
      if (checked.has(boxKey)) checked.delete(boxKey)
      else checked.add(boxKey)
      all[category] = Array.from(checked)
      const rubric = { ...(current.written_rubric || {}), [category]: checked.size }
      return { ...prev, [studentId]: { ...current, written_checklist: all, written_rubric: rubric } }
    })
  }, [])

  const saveScores = useCallback(async (studentIds: string[], silent = false) => {
    if (savingRef.current) return
    savingRef.current = true
    saveSeqRef.current++
    setSaving(true)
    let errors = 0
    // The local record as it stood when each student's payload was built. The
    // snapshot advances to this, per student, rather than to the whole live
    // roster: a save of one student must never mark another student's unsaved
    // work as saved, and a click made during the save round-trip must stay
    // dirty so the next pass writes it.
    const written: Record<string, G1Scores> = {}
    try {
      for (const sid of studentIds) {
        const raw = scoresRef.current[sid] || {}

        // Compute o_phoneme from this version's probe checkboxes.
        // Only fall back to a stored total when the record has no probe keys at
        // all -- i.e. it predates the checkbox UI. Taking the max unconditionally
        // (as this once did) meant unchecking a box could never lower the score.
        let phonemeTotal = 0
        let hasProbeData = false
        for (const pw of content.phoneme.words) {
          for (const probe of pw.probes) {
            if (probe.key in (raw as any)) hasProbeData = true
            if ((raw as any)[probe.key]) phonemeTotal++
          }
        }
        const finalRaw: any = {
          ...raw,
          o_phoneme: hasProbeData ? phonemeTotal : (raw.o_phoneme ?? 0),
        }

        // Compute backward-compat section subtotals from per-question answers
        if (finalRaw.written_answers && Object.keys(finalRaw.written_answers).length > 0) {
          const answers = finalRaw.written_answers as Record<number, string>
          const bySection: Record<string, number> = {}
          content.written.sectionKeys.forEach(k => { bySection[k] = 0 })
          content.written.questions.forEach(q => {
            if (answers[q.qNum] === q.correct) bySection[q.section] = (bySection[q.section] ?? 0) + 1
          })
          // Section subtotals are stored under the `w_` key matching each section.
          content.written.sectionKeys.forEach(k => { finalRaw[`w_${k}`] = bySection[k] ?? 0 })
          finalRaw.written_mc = Object.values(bySection).reduce((a, b) => a + b, 0)
        }
        // Short constructed-response item, where the version has one
        if (content.shortWriting) {
          finalRaw.w_short_writing = finalRaw.writing_short ?? null
        }
        // Compute extended writing bonus from rubric categories
        if (finalRaw.written_rubric && Object.keys(finalRaw.written_rubric).length > 0) {
          const rubric = finalRaw.written_rubric as Record<string, number>
          const rubricTotal = content.extendedWriting.categories
            .reduce((sum, cat) => sum + (rubric[cat.key] || 0), 0)
          finalRaw.writing_bonus = rubricTotal
          finalRaw.writing = rubricTotal  // Dashboard reads raw_scores.writing
          // Backward compat: w_writing is a 0-5 field that predates the 20-point
          // rubric and is still read by the standards baseline and the dashboard.
          finalRaw.w_writing = Math.round(rubricTotal / (content.extendedWriting.max / 5))
        }

        // For Level A, derive o_orf_raw. Holistic versions store the single
        // rating directly; per-question versions sum the five items.
        if (finalRaw.o_passage_level === 'A' && content.levelA.mode === 'per_question') {
          const aTotal = (finalRaw.o_a_q1 ?? 0) + (finalRaw.o_a_q2 ?? 0) + (finalRaw.o_a_q3 ?? 0) + (finalRaw.o_a_q4 ?? 0) + (finalRaw.o_a_q5 ?? 0)
          if (aTotal > 0) finalRaw.o_orf_raw = aTotal
        }

        const currentClass = (students.find(s => s.id === sid)?.english_class ?? null) as EnglishClass | null
        const metrics = calculateG1Composite(finalRaw, content, currentClass)

        // Grade 1 keeps the oral and written halves in one record, and the two
        // are often entered by different teachers at the same time. Send only
        // the half that actually changed, so an oral save cannot write the
        // written keys back from a snapshot taken before the other teacher
        // started -- and vice versa.
        const savedRaw: any = savedSnapshotRef.current[sid] || {}
        // Which half is dirty is judged on what the teacher actually edited --
        // `raw`, not `finalRaw`. finalRaw carries derived keys (o_phoneme, the
        // w_ subtotals, writing_bonus) that are recomputed on every save and
        // compare as changed the first time they appear, which would mark BOTH
        // halves dirty for every student and put the clobbering straight back.
        // Each derived key belongs to the same half as the keys it is derived
        // from, so the payload below can still be split off finalRaw.
        let oralChanged = false, writtenChanged = false
        const editedKeys = new Set([...Object.keys(raw), ...Object.keys(savedRaw)])
        editedKeys.forEach(k => {
          if (JSON.stringify((raw as any)[k]) === JSON.stringify(savedRaw[k])) return
          if (isG1OralKey(k)) oralChanged = true; else writtenChanged = true
        })

        const oralRaw: any = {}, writtenRaw: any = {}
        for (const k of Object.keys(finalRaw)) {
          if (isG1OralKey(k)) oralRaw[k] = finalRaw[k]; else writtenRaw[k] = finalRaw[k]
        }

        const oralMetrics = {
          oral_score: metrics.oralScore,
          teacher_pct: metrics.teacherPct,
          passage_level: metrics.passageLevel,
          cwpm: metrics.cwpm,
          weighted_cwpm: metrics.weightedCwpm,
          accuracy_pct: metrics.accuracy,
          effective_passage_level: metrics.effectiveLevel,
          comp_total: metrics.compTotal,
          comp_max: metrics.compMax,
          comp_answered: metrics.compAnswered,
          comp_not_administered: metrics.compNotAdministered,
          standards_baseline: metrics.standardsBaseline,
        }
        const writtenMetrics = {
          content_version: content.version,
          written_pct: metrics.writtenPct,
          written_mc: metrics.writtenMC,
          written_mc_max: content.written.mcMax,
          writing_bonus: metrics.writingBonus,
          writing_short: metrics.writingShort,
        }

        const groups: { raw: any; metrics: any; nested: string[] }[] = []
        if (oralChanged) groups.push({ raw: oralRaw, metrics: oralMetrics, nested: [] })
        if (writtenChanged) groups.push({ raw: writtenRaw, metrics: writtenMetrics, nested: G1_WRITTEN_NESTED })
        // An explicit save with nothing dirty still writes, so the teacher's
        // Save button does something they can see.
        if (groups.length === 0 && !silent) {
          groups.push({ raw: oralRaw, metrics: oralMetrics, nested: [] })
          groups.push({ raw: writtenRaw, metrics: writtenMetrics, nested: G1_WRITTEN_NESTED })
        }

        let studentOk = true
        for (const g of groups) {
          const { error } = await supabase.rpc('upsert_score_group', {
            p_level_test_id: levelTest.id,
            p_student_id: sid,
            p_raw: g.raw,
            p_metrics: g.metrics,
            p_nested_keys: g.nested,
            p_previous_class: students.find(s => s.id === sid)?.english_class || null,
            p_entered_by: currentTeacher?.id || null,
            // Derived from this screen's view of the record. Every reader that
            // decides a placement recomputes it from raw_scores, so a value
            // written from half a record is a stale cache, not a wrong result.
            p_composite_index: metrics.composite,
            p_composite_band: metrics.suggestedClass,
          })
          if (error) { console.error('G1 save error:', error); errors++; studentOk = false }
        }
        if (studentOk) written[sid] = JSON.parse(JSON.stringify(raw))
      }
      if (Object.keys(written).length > 0) setSavedSnapshot(prev => ({ ...prev, ...written }))
      if (errors === 0) {
        if (!silent) showToast(`Saved ${studentIds.length} student${studentIds.length > 1 ? 's' : ''}`)
      } else {
        showToast(`Saved with ${errors} error(s)`)
      }
    } catch (err: any) {
      showToast(`Error saving: ${err.message}`)
    }
    setSaving(false)
    savingRef.current = false
  }, [levelTest.id, currentTeacher?.id, students, showToast])

  const autoSave = useCallback(async () => {
    if (savingRef.current) return
    const current = scoresRef.current
    const snapshot = savedSnapshotRef.current
    const dirty = students.filter(s => {
      const cur = current[s.id]
      if (!cur || Object.keys(cur).length === 0) return false
      return JSON.stringify(cur) !== JSON.stringify(snapshot[s.id] || {})
    })
    if (dirty.length === 0) return
    await saveScores(dirty.map(s => s.id), true)
    showToast(`Auto-saved ${dirty.length} student${dirty.length === 1 ? '' : 's'}`)
  }, [students, saveScores, showToast])

  const autoSaveRef = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => { autoSaveRef.current = autoSave }, [autoSave])

  /**
   * Pull in the other teacher's half.
   *
   * Grade 1's oral and written halves are one record, entered by two people at
   * once. Saves already carry only the half they changed, so nothing is
   * overwritten in the database — but a screen that never re-reads shows the
   * other half as blank all morning, which is how a teacher ends up entering
   * scores that already exist. Every fifteen seconds, take the server's value
   * for each key the local record has NOT edited since its last save.
   */
  useEffect(() => {
    const timer = setInterval(async () => {
      if (savingRef.current) return
      const seqBefore = saveSeqRef.current
      const { data, error } = await supabase.from('level_test_scores')
        .select('student_id, raw_scores').eq('level_test_id', levelTest.id)
      if (error || !data || saveSeqRef.current !== seqBefore || savingRef.current) return

      const cur = scoresRef.current
      const snap = savedSnapshotRef.current
      const nextScores: Record<string, G1Scores> = { ...cur }
      const nextSnap: Record<string, G1Scores> = { ...snap }
      let changed = false

      data.forEach((row: any) => {
        const sid = row.student_id
        const server = row.raw_scores || {}
        const local: any = cur[sid] || {}
        const saved: any = snap[sid] || {}
        const merged: any = { ...local }
        // The snapshot moves only for the keys actually taken from the server.
        // Building it from `merged` instead swept the teacher's unsaved keys in
        // with them, marking work as saved that had never been written -- the
        // next auto-save skipped it and the next refresh replaced it with the
        // server's value.
        const mergedSnap: any = { ...saved }
        let touched = false
        for (const k of Object.keys(server)) {
          // Edited locally and not yet saved: leave it alone.
          if (JSON.stringify(local[k]) !== JSON.stringify(saved[k])) continue
          if (JSON.stringify(local[k]) === JSON.stringify(server[k])) continue
          merged[k] = server[k]
          mergedSnap[k] = server[k]
          touched = true
        }
        if (touched) {
          nextScores[sid] = merged
          nextSnap[sid] = mergedSnap
          changed = true
        }
      })

      if (changed) { setScores(nextScores); setSavedSnapshot(nextSnap) }
    }, 15000)
    return () => clearInterval(timer)
  }, [levelTest.id])

  useEffect(() => {
    const timer = setInterval(() => { autoSaveRef.current?.() }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = () => { if (document.hidden) autoSaveRef.current?.() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  useEffect(() => {
    return () => { autoSaveRef.current?.() }
  }, [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const cur = scoresRef.current; const snap = savedSnapshotRef.current
      const dirty = students.some(s => JSON.stringify(cur[s.id] || {}) !== JSON.stringify(snap[s.id] || {}))
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [students])

  const availableClasses = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classStudents = useMemo(() => students.filter(s => s.english_class === activeClass), [students, activeClass])

  // Clear all oral data for a student (keep written + teacher fields)
  const clearOralData = useCallback(async (sid: string, name: string) => {
    if (!await confirmDialog({ title: `Clear all oral test scores for ${name}?`, message: 'This includes passage data, every previous attempt, and anything recorded during the oral session. It cannot be undone.', danger: true, confirmLabel: 'Clear scores' })) return
    // Everything captured during the oral session, including the teacher's
    // notes and impression -- otherwise the sidebar keeps showing a chip for a
    // student whose scores have been wiped.
    const isOralKey = isG1OralKey
    // Clear local state: keep only non-oral keys
    setScores(prev => {
      const current = prev[sid] || {}
      const kept: Record<string, any> = {}
      Object.entries(current).forEach(([k, v]) => {
        if (!isOralKey(k)) kept[k] = v
      })
      return { ...prev, [sid]: kept as G1Scores }
    })
    setSavedSnapshot(prev => {
      const current = prev[sid] || {}
      const kept: Record<string, any> = {}
      Object.entries(current).forEach(([k, v]) => {
        if (!isOralKey(k)) kept[k] = v
      })
      return { ...prev, [sid]: kept as G1Scores }
    })
    // Drop the oral keys server-side, in one transaction. Doing it from here
    // as a delete followed by an insert meant the row did not exist for a
    // moment -- and that the written half came back as whatever THIS screen
    // was holding, which is wrong the instant a second teacher is marking it.
    const { error } = await supabase.rpc('clear_score_keys', {
      p_level_test_id: levelTest.id,
      p_student_id: sid,
      p_raw_keys: ['passages_attempted', 'wave1_class_impression', 'teacher_notes'],
      p_calc_keys: [
        'oral_score', 'passage_level', 'effective_passage_level', 'cwpm', 'weighted_cwpm',
        'accuracy_pct', 'comp_total', 'comp_max', 'comp_answered',
        'comp_not_administered', 'standards_baseline', 'teacher_pct',
      ],
      p_raw_prefixes: ['o_'],
    })
    if (error) { console.error('Clear oral DB error:', error); showToast('Error clearing scores'); return }
    saveSeqRef.current++
    showToast(`Cleared all oral scores for ${name}`)
  }, [levelTest.id, currentTeacher?.id, showToast])

  // Restore a previous passage attempt (swap it with current)
  const restoreAttempt = useCallback((sid: string, attemptIdx: number) => {
    setScores(prev => {
      const current = { ...(prev[sid] || {}) }
      const attempts = Array.isArray((current as any).passages_attempted) ? [...(current as any).passages_attempted] : []
      if (attemptIdx < 0 || attemptIdx >= attempts.length) return prev
      const toRestore = { ...attempts[attemptIdx] }
      const restoredLevel = toRestore.level
      delete toRestore.level

      // Archive current passage data if it has any
      const hasCurrentData = G1_PASSAGE_FIELDS.some(f => (current as any)[f] != null)
      if (hasCurrentData && current.o_passage_level) {
        const archive: Record<string, any> = { level: current.o_passage_level }
        G1_PASSAGE_FIELDS.forEach(f => { if ((current as any)[f] != null) archive[f] = (current as any)[f] })
        attempts[attemptIdx] = archive
      } else {
        // No current data to archive, just remove the restored attempt
        attempts.splice(attemptIdx, 1)
      }

      // Clear current passage fields, then apply restored data
      const updated: Record<string, any> = { ...current }
      G1_PASSAGE_FIELDS.forEach(f => { delete updated[f] })
      updated.o_passage_level = restoredLevel
      updated.passages_attempted = attempts
      // Restore the passage fields from the attempt
      Object.entries(toRestore).forEach(([k, v]) => { updated[k] = v })

      return { ...prev, [sid]: updated as G1Scores }
    })
  }, [])

  const completionStats = useMemo(() => {
    let writtenDone = 0, oralDone = 0
    classStudents.forEach(s => {
      const sc = scores[s.id] || {}
      // Any written evidence counts: per-question answers, the short writing
      // item, the rubric, or a legacy section subtotal.
      if (sc.w_letter_names != null || sc.w_letter_sounds != null || sc.w_word_picture != null
        || sc.writing_short != null
        || (sc.written_rubric && Object.keys(sc.written_rubric).length > 0)
        || (sc.written_answers && Object.keys(sc.written_answers).length > 0)) writtenDone++
      if (sc.o_passage_level) oralDone++
    })
    return { writtenDone, oralDone, total: classStudents.length }
  }, [classStudents, scores])

  const classCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const s = students.filter(st => st.english_class === cls)
      const done = s.filter(st => {
        const sc = scores[st.id] || {}
        return sc.o_passage_level != null
      })
      counts[cls] = { total: s.length, done: done.length }
    })
    return counts
  }, [students, scores])

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 size={24} className="animate-spin text-navy mx-auto" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Class Tabs */}
      <div className="px-10 pt-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {ENGLISH_CLASSES.map(cls => {
            const ct = classCounts[cls] || { total: 0, done: 0 }
            const isAvail = availableClasses.includes(cls)
            if (ct.total === 0 && !isAvail) return null
            return (
              <button key={cls} onClick={() => { if (isAvail) { setActiveClass(cls); setSelectedStudentIdx(0) } }} disabled={!isAvail}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  activeClass === cls ? 'text-white shadow-sm' : isAvail ? 'text-text-secondary hover:bg-surface-alt' : 'text-text-tertiary/40 cursor-not-allowed'
                }`} style={activeClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
                {cls}
                {ct.total > 0 && (
                  <span className={`text-[9px] px-1 rounded ${activeClass === cls ? 'bg-white/20' : 'bg-surface-alt'}`}>
                    {ct.done}/{ct.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Flat Tab Bar -- Teacher Ratings REMOVED for Grade 1 */}
      <div className="px-10 bg-surface border-b border-border">
        <div className="flex items-center gap-2 pb-3">
          {[
            { key: 'oral' as const, icon: Mic, label: 'Oral Test', sub: `${completionStats.oralDone}/${completionStats.total}` },
            { key: 'written' as const, icon: PenTool, label: 'Written Test', sub: `${completionStats.writtenDone}/${completionStats.total}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab.key ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'
              }`}>
              <tab.icon size={15} />
              {tab.label}
              {tab.sub && <span className={`text-[10px] ml-1 ${activeTab === tab.key ? 'opacity-70' : 'text-text-tertiary'}`}>{tab.sub}</span>}
            </button>
          ))}
          {/* Which question set this test is scored against. Never silent: a
              test whose version has not been authored falls back to legacy. */}
          <span
            title={versionKey === G1_LEGACY_VERSION
              ? `This test is scored against the ORIGINAL Grade 1 question set, not the Fall 2026 one. Content is chosen by the test's academic year and semester, and this test is recorded as ${levelTest.academic_year || 'no academic year'} / ${levelTest.semester || 'no semester'}. The Fall 2026 test is 2026-2027 / fall.`
              : `Scored against the ${content.label} question set (${levelTest.academic_year} / ${levelTest.semester}).`}
            className={`ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full ${
              versionKey === G1_LEGACY_VERSION
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-surface-alt text-text-secondary border border-border'
            }`}>
            <FileText size={10} /> {content.label}
            {versionKey === G1_LEGACY_VERSION && (
              <span className="opacity-70">({levelTest.academic_year || '?'} / {levelTest.semester || '?'})</span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      {classStudents.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-[13px]">No students in {activeClass}</div>
      ) : (
        <>
          {activeTab === 'oral' && (
            <OralTestEntry
              content={content}
              students={classStudents}
              scores={scores}
              updateScore={updateScore}
              onSave={saveScores}
              saving={saving}
              selectedIdx={selectedStudentIdx}
              onSelectIdx={setSelectedStudentIdx}
              activeWave={1}
              onClearOral={clearOralData}
              onRestoreAttempt={restoreAttempt}
            />
          )}
          {activeTab === 'written' && (
            <WrittenTestEntry
              content={content}
              students={students}
              scores={scores}
              updateWrittenAnswer={updateWrittenAnswer}
              updateWrittenRubric={updateWrittenRubric}
              toggleWrittenChecklist={toggleWrittenChecklist}
              updateScore={updateScore}
              onSave={saveScores}
              saving={saving}
              teacherClass={activeClass}
              isStudentDirty={isStudentDirty}
            />
          )}
        </>
      )}
    </div>
  )
}

// ============================================================================
// GRADE 1 WRITTEN TEST ANALYTICS
// ============================================================================

function computeG1Analytics(scores: Record<string, G1Scores>, students: Student[], content: G1Content) {
  const GRADE_1_QUESTIONS = content.written.questions
  const G1_QUESTION_SECTIONS = content.written.sectionKeys
  const studentIds = students.map(s => s.id).filter(sid => {
    const sc = scores[sid]
    return sc?.written_answers && Object.keys(sc.written_answers).length > 0
  })
  const n = studentIds.length
  if (n === 0) return null

  const itemDifficulty: Record<number, { correct: number; total: number; distractors: Record<string, number> }> = {}
  GRADE_1_QUESTIONS.forEach(q => {
    const distrs: Record<string, number> = {}
    q.choices.forEach((_, i) => { distrs[String.fromCharCode(97 + i)] = 0 })
    itemDifficulty[q.qNum] = { correct: 0, total: n, distractors: distrs }
  })

  const studentTotals: Record<string, number> = {}
  studentIds.forEach(sid => {
    const answers = scores[sid]?.written_answers || {}
    let total = 0
    GRADE_1_QUESTIONS.forEach(q => {
      const chosen = answers[q.qNum]
      if (chosen) {
        if (itemDifficulty[q.qNum].distractors[chosen] !== undefined) {
          itemDifficulty[q.qNum].distractors[chosen]++
        }
        if (chosen === q.correct) { itemDifficulty[q.qNum].correct++; total++ }
      }
    })
    studentTotals[sid] = total
  })

  const domains: Record<string, { correct: number; total: number }> = {}
  G1_QUESTION_SECTIONS.forEach(sec => { domains[sec] = { correct: 0, total: 0 } })
  GRADE_1_QUESTIONS.forEach(q => {
    domains[q.section].total += n
    domains[q.section].correct += itemDifficulty[q.qNum].correct
  })

  const allTotals = studentIds.map(sid => studentTotals[sid])
  const meanTotal = allTotals.reduce((a, b) => a + b, 0) / n
  const sdTotal = Math.sqrt(allTotals.reduce((s, t) => s + (t - meanTotal) ** 2, 0) / n)

  const discrimination: Record<number, { rpb: number; flag: string; flagColor: string }> = {}
  GRADE_1_QUESTIONS.forEach(q => {
    const diff = itemDifficulty[q.qNum]
    const p = diff.correct / n
    if (sdTotal === 0 || p === 0 || p === 1) {
      discrimination[q.qNum] = { rpb: 0, flag: p === 1 ? 'TOO EASY' : p === 0 ? 'TOO HARD' : 'OK', flagColor: p === 1 ? 'text-blue-600' : p === 0 ? 'text-amber-600' : 'text-gray-500' }
      return
    }
    const gotRight = studentIds.filter(sid => (scores[sid]?.written_answers || {})[q.qNum] === q.correct)
    const gotWrong = studentIds.filter(sid => !gotRight.includes(sid))
    const m1 = gotRight.length > 0 ? gotRight.reduce((s, sid) => s + studentTotals[sid], 0) / gotRight.length : 0
    const m0 = gotWrong.length > 0 ? gotWrong.reduce((s, sid) => s + studentTotals[sid], 0) / gotWrong.length : 0
    const rpb = ((m1 - m0) / sdTotal) * Math.sqrt(p * (1 - p))

    let flag = 'OK', flagColor = 'text-gray-500'
    if (rpb < 0) { flag = 'CHECK KEY'; flagColor = 'text-red-600' }
    else if (p > 0.9) { flag = 'TOO EASY'; flagColor = 'text-blue-600' }
    else if (p < 0.2) { flag = 'TOO HARD'; flagColor = 'text-amber-600' }
    else if (rpb <= 0.1) { flag = 'WEAK'; flagColor = 'text-red-500' }
    else if (rpb > 0.2 && p >= 0.3 && p <= 0.9) { flag = 'KEEP'; flagColor = 'text-green-600' }
    discrimination[q.qNum] = { rpb, flag, flagColor }
  })

  return { itemDifficulty, domains, discrimination, studentCount: n, studentTotals }
}

function G1AnalyticsView({ scores, students, content }: { scores: Record<string, G1Scores>; students: Student[]; content: G1Content }) {
  const GRADE_1_QUESTIONS = content.written.questions
  const G1_QUESTION_SECTIONS = content.written.sectionKeys
  // Section label comes from the first question in that section.
  const G1_SECTION_LABELS: Record<string, string> = {}
  GRADE_1_QUESTIONS.forEach(q => { if (!G1_SECTION_LABELS[q.section]) G1_SECTION_LABELS[q.section] = q.domain })

  const G1_WRITING_CATEGORIES = content.extendedWriting.categories
  const G1_WRITING_MAX = content.extendedWriting.max

  const analytics = useMemo(() => computeG1Analytics(scores, students, content), [scores, students, content])
  if (!analytics) return <div className="p-12 text-center text-text-tertiary">No written test data entered yet.</div>

  const missed = GRADE_1_QUESTIONS
    .map(q => ({ ...q, pct: (analytics.itemDifficulty[q.qNum].correct / analytics.studentCount) * 100 }))
    .filter(q => q.pct < 60).sort((a, b) => a.pct - b.pct).slice(0, 8)

  const writingStudents = students.filter(s => scores[s.id]?.written_rubric && Object.keys(scores[s.id].written_rubric!).length > 0)

  return (
    <div className="p-6 max-w-4xl overflow-y-auto">
      <h3 className="text-[16px] font-display font-semibold text-navy mb-4">Written Test Analytics</h3>
      <p className="text-[11px] text-text-tertiary mb-4">{analytics.studentCount} students scored</p>

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `repeat(${G1_QUESTION_SECTIONS.length}, minmax(0, 1fr))` }}>
        {G1_QUESTION_SECTIONS.map(sec => {
          const d = analytics.domains[sec]
          const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
          return (
            <div key={sec} className="bg-surface border border-border rounded-lg p-3 text-center">
              <div className={`text-[20px] font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</div>
              <div className="text-[10px] text-text-tertiary font-medium">{G1_SECTION_LABELS[sec]}</div>
            </div>
          )
        })}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3 bg-surface-alt border-b border-border">
          <h4 className="text-[12px] font-semibold text-navy">Item Analysis</h4>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-surface-alt/50">
              <th className="text-left px-3 py-2 text-[9px] uppercase text-text-tertiary">#</th>
              <th className="text-left px-3 py-2 text-[9px] uppercase text-text-tertiary">Section</th>
              <th className="text-center px-3 py-2 text-[9px] uppercase text-text-tertiary">Answer</th>
              <th className="text-center px-3 py-2 text-[9px] uppercase text-text-tertiary">Difficulty</th>
              <th className="text-center px-3 py-2 text-[9px] uppercase text-text-tertiary">rpb</th>
              <th className="text-center px-3 py-2 text-[9px] uppercase text-text-tertiary">Flag</th>
            </tr>
          </thead>
          <tbody>
            {GRADE_1_QUESTIONS.map((q, qi) => {
              const diff = analytics.itemDifficulty[q.qNum]
              const disc = analytics.discrimination[q.qNum]
              const pct = Math.round((diff.correct / diff.total) * 100)
              return (
                <tr key={q.qNum} className={qi % 2 === 0 ? '' : 'bg-surface-alt/30'}>
                  <td className="px-3 py-1.5 font-mono">{q.qNum}</td>
                  <td className="px-3 py-1.5 text-text-secondary">{G1_SECTION_LABELS[q.section]}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-navy">{q.choices[q.correct.charCodeAt(0) - 97]}</td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono text-[10px]">{disc.rpb.toFixed(2)}</td>
                  <td className={`px-3 py-1.5 text-center text-[9px] font-bold ${disc.flagColor}`}>{disc.flag}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {missed.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-6">
          <h4 className="text-[12px] font-semibold text-navy mb-2">Instructional Priorities (below 60%)</h4>
          <div className="grid grid-cols-2 gap-2">
            {missed.map(q => (
              <div key={q.qNum} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono text-text-tertiary w-5">Q{q.qNum}</span>
                <span className="text-text-secondary flex-1">{G1_SECTION_LABELS[q.section]}: {q.choices[q.correct.charCodeAt(0) - 97]}</span>
                <span className="font-bold text-red-600">{Math.round(q.pct)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {writingStudents.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-surface-alt border-b border-border">
            <h4 className="text-[12px] font-semibold text-navy flex items-center gap-2">
              <Star size={12} /> {content.extendedWriting.scoring === 'in_total' ? 'Extended Writing Scores' : 'Writing Bonus Scores'} ({writingStudents.length} students)
            </h4>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-alt/50">
                <th className="text-left px-3 py-2 text-[9px] uppercase text-text-tertiary">Student</th>
                {G1_WRITING_CATEGORIES.map(cat => (
                  <th key={cat.key} className="text-center px-2 py-2 text-[9px] uppercase text-text-tertiary">{cat.label.split(' ')[0]}</th>
                ))}
                <th className="text-center px-3 py-2 text-[9px] uppercase text-navy font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {writingStudents.map((s, i) => {
                const rub = scores[s.id]?.written_rubric || {}
                const total = G1_WRITING_CATEGORIES.reduce((sum, cat) => sum + (rub[cat.key] || 0), 0)
                return (
                  <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-surface-alt/30'}>
                    <td className="px-3 py-1.5"><span className="font-medium text-navy">{s.english_name}</span></td>
                    {G1_WRITING_CATEGORIES.map(cat => (
                      <td key={cat.key} className="text-center px-2 py-1.5 font-mono">{rub[cat.key] ?? '--'}</td>
                    ))}
                    <td className="text-center px-3 py-1.5 font-bold text-navy">{total}/{G1_WRITING_MAX}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// G1 STANDARD BADGE
// ============================================================================

function G1StandardBadge({ code, description }: { code: string; description: string }) {
  const [hover, setHover] = useState(false)
  return (
    <span className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span className="text-[9px] text-text-tertiary/60 font-mono cursor-help underline decoration-dotted decoration-text-tertiary/30">{code}</span>
      {hover && (
        <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-border rounded-lg shadow-lg p-2 z-50 text-left text-[10px] text-text-secondary">
          <span className="font-bold text-navy">{code}:</span> {description}
        </div>
      )}
    </span>
  )
}

// ============================================================================
// WRITTEN TEST ENTRY - Bubble-Sheet UI (matching Grade 2-5)
// ============================================================================

function WrittenTestEntry({ content, students, scores, updateWrittenAnswer, updateWrittenRubric, toggleWrittenChecklist, updateScore, onSave, saving, teacherClass, isStudentDirty }: {
  content: G1Content
  students: Student[]
  scores: Record<string, G1Scores>
  updateWrittenAnswer: (sid: string, qNum: number, choice: string) => void
  updateWrittenRubric: (sid: string, category: string, score: number) => void
  toggleWrittenChecklist: (sid: string, category: string, boxKey: string) => void
  updateScore: (sid: string, key: string, val: string | number | boolean | null) => void
  onSave: (sids: string[]) => Promise<void>
  saving: boolean
  teacherClass: EnglishClass
  isStudentDirty: (sid: string) => boolean
}) {
  const GRADE_1_QUESTIONS = content.written.questions
  const G1_QUESTION_SECTIONS = content.written.sectionKeys
  const G1_WRITING_CATEGORIES = content.extendedWriting.categories
  const G1_WRITING_RUBRIC = content.extendedWriting.rubric
  const G1_WRITING_MAX = content.extendedWriting.max
  const G1_MC_MAX = content.written.mcMax
  const shortWriting = content.shortWriting
  const writingInTotal = content.extendedWriting.scoring === 'in_total'
  const writtenTotalMax = g1WrittenTotalMax(content)
  // Items differ in how many choices they offer, so the hint follows the paper.
  const maxChoices = GRADE_1_QUESTIONS.reduce((m, q) => Math.max(m, q.choices.length), 0)

  const [view, setView] = useState<'entry' | 'analytics'>('entry')
  const [filterClass, setFilterClass] = useState<EnglishClass | 'all'>(teacherClass || 'all')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [focusedQ, setFocusedQ] = useState<number | null>(null)
  const [showRubricGuide, setShowRubricGuide] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const classStudents = useMemo(() => {
    return students
      .filter(s => filterClass === 'all' || s.english_class === filterClass)
      .sort((a, b) => a.english_name.localeCompare(b.english_name))
  }, [students, filterClass])

  const student = classStudents[selectedIdx] || null
  const sc = student ? (scores[student.id] || {}) : ({} as G1Scores)
  const answers = sc.written_answers || {}
  const rubric = sc.written_rubric || {}

  const mcCorrect = useMemo(() => GRADE_1_QUESTIONS.reduce((sum, q) => sum + (answers[q.qNum] === q.correct ? 1 : 0), 0), [answers, GRADE_1_QUESTIONS])
  const writingTotal = useMemo(() => G1_WRITING_CATEGORIES.reduce((sum, cat) => sum + (rubric[cat.key] || 0), 0), [rubric, G1_WRITING_CATEGORIES])
  const shortScore = sc.writing_short ?? null
  const studentHasData = Object.keys(answers).length > 0 || Object.keys(rubric).length > 0 || shortScore != null

  const sections = useMemo(() => {
    const groups: Record<string, G1QuestionDef[]> = {}
    GRADE_1_QUESTIONS.forEach(q => { if (!groups[q.section]) groups[q.section] = []; groups[q.section].push(q) })
    return groups
  }, [GRADE_1_QUESTIONS])
  const allQNums = GRADE_1_QUESTIONS.map(q => q.qNum)

  // Keyboard shortcuts
  useEffect(() => {
    if (!student || view !== 'entry') return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      if (focusedQ != null && ['a', 'b', 'c', 'd'].includes(key)) {
        const q = GRADE_1_QUESTIONS.find(q => q.qNum === focusedQ)
        if (!q) return
        const choiceIdx = key.charCodeAt(0) - 97
        if (choiceIdx >= q.choices.length) return
        e.preventDefault()
        updateWrittenAnswer(student.id, focusedQ, key)
        const idx = allQNums.indexOf(focusedQ)
        if (idx < allQNums.length - 1) setTimeout(() => setFocusedQ(allQNums[idx + 1]), 100)
        return
      }
      if ((key === 'arrowdown' || key === 'arrowup') && focusedQ != null) {
        e.preventDefault()
        const idx = allQNums.indexOf(focusedQ)
        if (key === 'arrowdown' && idx < allQNums.length - 1) setFocusedQ(allQNums[idx + 1])
        else if (key === 'arrowup' && idx > 0) setFocusedQ(allQNums[idx - 1])
        return
      }
      if (key === 'escape') { setFocusedQ(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [student, focusedQ, answers, allQNums, updateWrittenAnswer, view])

  useEffect(() => {
    if (focusedQ == null) return
    document.getElementById(`g1-q-row-${focusedQ}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focusedQ])

  const availableClasses = useMemo(() => {
    const cs = new Set(students.map(s => s.english_class as EnglishClass))
    return ENGLISH_CLASSES.filter(c => cs.has(c))
  }, [students])

  const clearStudent = () => {
    if (!student) return
    // Clear every written-test field, including the derived section subtotals
    // for whichever version this test uses.
    updateScore(student.id, 'written_answers', null as any)
    updateScore(student.id, 'written_rubric', null as any)
    updateScore(student.id, 'written_checklist', null as any)
    updateScore(student.id, 'written_mc', null as any)
    updateScore(student.id, 'writing_bonus', null as any)
    updateScore(student.id, 'writing', null as any)
    updateScore(student.id, 'writing_short', null)
    content.written.sectionKeys.forEach(k => updateScore(student.id, `w_${k}`, null as any))
    updateScore(student.id, 'w_word_picture', null as any)
    updateScore(student.id, 'w_passage_comp', null as any)
    updateScore(student.id, 'w_short_writing', null as any)
    updateScore(student.id, 'w_writing', null as any)
    updateScore(student.id, 'wave2_class_impression', null)
    updateScore(student.id, 'wave2_retention_rating', null)
    // Persist immediately. Otherwise the cleared values sit in local state until
    // the next save or the 30s autosave, and anything reading the database in
    // the meantime -- Results, Analytics -- still shows the old scores.
    setTimeout(() => { onSave([student.id]) }, 0)
  }

  return (
    <div className="flex h-[calc(100vh-280px)]">
      {/* Sidebar */}
      <div className="w-[220px] border-r border-border bg-surface flex flex-col">
        <div className="flex border-b border-border">
          <button onClick={() => setView('entry')} className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${view === 'entry' ? 'bg-navy text-white' : 'text-text-tertiary hover:bg-surface-alt'}`}>
            <BookOpen size={12} /> Entry
          </button>
          <button onClick={() => setView('analytics')} className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${view === 'analytics' ? 'bg-navy text-white' : 'text-text-tertiary hover:bg-surface-alt'}`}>
            <BarChart3 size={12} /> Analytics
          </button>
        </div>
        <div className="flex flex-wrap gap-1 px-2 py-2 border-b border-border">
          <button onClick={() => { setFilterClass('all'); setSelectedIdx(0) }}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-tertiary hover:bg-border'}`}>All</button>
          {availableClasses.map(cls => (
            <button key={cls} onClick={() => { setFilterClass(cls); setSelectedIdx(0) }}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${filterClass === cls ? 'ring-2 ring-navy ring-offset-1' : ''}`}
              style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls.slice(0, 3)}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {classStudents.map((s, idx) => {
            const sAnswers = scores[s.id]?.written_answers || {}
            const answered = Object.keys(sAnswers).length
            const hasData = answered > 0
            const dirty = isStudentDirty(s.id)
            return (
              <div key={s.id} onClick={() => setSelectedIdx(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[11px] transition-colors ${idx === selectedIdx ? 'bg-blue-50' : 'hover:bg-surface-alt'}`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: classToColor(s.english_class as EnglishClass) }} />
                <span className="flex-1 truncate">{s.english_name || s.korean_name}</span>
                {hasData && <span className="text-[9px] text-text-tertiary">{answered}/{G1_MC_MAX}</span>}
                {dirty ? <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" /> : hasData && <CheckCircle2 size={10} className="text-green-500 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
        <div className="p-2 border-t border-border">
          {(() => {
            const dirtyIds = students.filter(s => isStudentDirty(s.id)).map(s => s.id)
            const dirtyCount = dirtyIds.length
            return (
              <>
                {dirtyCount > 0 && (
                  <div className="text-[10px] text-amber-600 font-medium mb-1 text-center">{dirtyCount} unsaved</div>
                )}
                <button onClick={() => onSave(dirtyIds)} disabled={saving || dirtyCount === 0}
                  className={`w-full py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${dirtyCount > 0 ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-navy text-white hover:bg-navy/90'} disabled:opacity-50 disabled:animate-none`}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {dirtyCount > 0 ? `Save ${dirtyCount} Changed` : 'All Saved'}
                </button>
              </>
            )
          })()}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'analytics' ? (
          <G1AnalyticsView scores={scores} students={classStudents} content={content} />
        ) : !student ? (
          <div className="p-12 text-center text-text-tertiary">Select a student from the sidebar</div>
        ) : (
          <div className="p-6 max-w-4xl" ref={containerRef}>
            {/* Student header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-display font-semibold text-navy">{student.english_name || student.korean_name}</h3>
                <div className="text-[12px] text-text-tertiary mt-0.5">{student.english_class} -- Grade 1 Written Test</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-3">
                  <div className="text-[20px] font-bold text-navy">{mcCorrect}<span className="text-[14px] text-text-tertiary">/{G1_MC_MAX}</span></div>
                  <div className="text-[10px] text-text-tertiary">MC ({Math.round(mcCorrect / G1_MC_MAX * 100)}%)</div>
                </div>
                {shortWriting && (
                  <div className="text-right mr-3">
                    <div className="text-[20px] font-bold text-navy">{shortScore ?? '--'}<span className="text-[14px] text-text-tertiary">/{shortWriting.max}</span></div>
                    <div className="text-[10px] text-text-tertiary">Short</div>
                  </div>
                )}
                <div className="text-right mr-3">
                  <div className="text-[20px] font-bold text-amber-600">{writingTotal}<span className="text-[14px] text-text-tertiary">/{G1_WRITING_MAX}</span></div>
                  <div className="text-[10px] text-amber-600 flex items-center gap-0.5 justify-end"><Star size={9} /> {writingInTotal ? 'Writing' : 'Bonus'}</div>
                </div>
                {writingInTotal && (
                  <div className="text-right mr-3 pl-3 border-l border-border">
                    <div className="text-[20px] font-bold text-navy">
                      {mcCorrect + (shortScore ?? 0) + writingTotal}<span className="text-[14px] text-text-tertiary">/{writtenTotalMax}</span>
                    </div>
                    <div className="text-[10px] text-text-tertiary">Total</div>
                  </div>
                )}
                {studentHasData && (
                  <button onClick={clearStudent} className="text-[11px] text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded flex items-center gap-1">
                    <RotateCcw size={12} /> Clear
                  </button>
                )}
                <button onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0}
                  className="p-1.5 rounded hover:bg-surface-alt disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="text-[11px] text-text-tertiary">{selectedIdx + 1}/{classStudents.length}</span>
                <button onClick={() => setSelectedIdx(Math.min(classStudents.length - 1, selectedIdx + 1))} disabled={selectedIdx >= classStudents.length - 1}
                  className="p-1.5 rounded hover:bg-surface-alt disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="mb-3 flex items-center gap-3 text-[10px] text-text-tertiary bg-surface-alt/60 rounded-lg px-3 py-1.5">
              <span className="font-semibold">Keyboard:</span>
              <span>
                Click row, then
                {Array.from({ length: maxChoices }, (_, i) => (
                  <kbd key={i} className="ml-1 px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">
                    {String.fromCharCode(65 + i)}
                  </kbd>
                ))}
                <span className="ml-1">to answer</span>
                {maxChoices > 3 && <span className="ml-1 text-text-tertiary/80">(D only where there are four choices)</span>}
              </span>
              <span><kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">↑↓</kbd> nav</span>
            </div>

            {/* MC Bubble Sheet */}
            {G1_QUESTION_SECTIONS.map(sKey => {
              const qs = sections[sKey]
              if (!qs) return null
              const sCorrect = qs.reduce((sum, q) => sum + (answers[q.qNum] === q.correct ? 1 : 0), 0)
              return (
                <div key={sKey} className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[13px] font-semibold text-navy">{qs[0].sectionLabel}</h4>
                    <span className="text-[11px] text-text-tertiary">{sCorrect}/{qs.length}</span>
                  </div>
                  <div className="border border-border rounded-lg">
                    {qs.map((q, qi) => {
                      const chosen = answers[q.qNum]
                      const isCorrect = chosen === q.correct
                      const isFocused = focusedQ === q.qNum
                      // Picture items have no letters printed on the student page,
                      // so the teacher records which position was circled.
                      const isPositional = q.choiceStyle === 'position'
                      const positionLabels = q.choices.length === 3
                        ? ['L', 'M', 'R']
                        : q.choices.map((_, i) => String(i + 1))
                      // Wide buttons whenever the labels are words rather than
                      // single characters, whatever the section is called.
                      const isWordQ = !isPositional && q.choices.some(c => c.length > 2)
                      return (
                        <div key={q.qNum} id={`g1-q-row-${q.qNum}`} onClick={() => setFocusedQ(q.qNum)}
                          className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer transition-all ${qi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${chosen && !isCorrect ? 'bg-red-50/40' : ''} ${isFocused ? 'ring-2 ring-navy/40 ring-inset bg-blue-50/30' : ''}`}>
                          <span className={`w-5 text-[11px] text-right font-mono ${isFocused ? 'text-navy font-bold' : 'text-text-tertiary'}`}>{q.qNum}</span>
                          <div className="flex gap-1">
                            {q.choices.map((choice, ci) => {
                              const letter = String.fromCharCode(97 + ci)
                              const isChosen = chosen === letter
                              const isCorrectAnswer = q.correct === letter
                              let bg = 'bg-white border-gray-200 hover:border-navy/40'
                              if (isChosen && isCorrect) bg = 'bg-green-500 border-green-500 text-white'
                              else if (isChosen && !isCorrect) bg = 'bg-red-400 border-red-400 text-white'
                              else if (chosen && isCorrectAnswer) bg = 'bg-green-100 border-green-300 text-green-700'
                              return (
                                <button key={letter} onClick={(e) => { e.stopPropagation(); updateWrittenAnswer(student.id, q.qNum, letter); setFocusedQ(q.qNum) }}
                                  title={isPositional ? choice : undefined}
                                  className={`${isWordQ ? 'min-w-[60px] px-2' : 'w-9'} h-8 rounded text-[11px] font-bold border-2 transition-all ${bg}`}>
                                  {isPositional ? positionLabels[ci] : choice}
                                </button>
                              )
                            })}
                          </div>
                          <span className="flex-1 text-[10px] text-text-tertiary truncate"
                            title={isPositional ? `${q.text} — correct: ${q.choices[q.correct.charCodeAt(0) - 97]}` : q.text}>
                            {q.text}
                          </span>
                          <G1StandardBadge code={q.standard} description={q.standardDesc} />
                          {chosen && (isCorrect ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-red-400" />)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Short constructed-response item, where the version has one */}
            {shortWriting && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13px] font-semibold text-navy flex items-center gap-1.5">
                      <PenTool size={13} className="text-navy" /> Short Writing
                    </h4>
                    <span className="text-[9px] text-text-tertiary">{shortWriting.prompt}</span>
                  </div>
                  <span className="text-[11px] text-text-tertiary">{shortScore ?? '--'}/{shortWriting.max}</span>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  {shortWriting.rubric.map((row, ri) => (
                    <button key={row.score}
                      onClick={() => updateScore(student.id, 'writing_short', shortScore === row.score ? null : row.score)}
                      className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-all ${
                        shortScore === row.score
                          ? 'bg-navy/10 ring-1 ring-inset ring-navy/30'
                          : ri % 2 === 0 ? 'bg-white hover:bg-surface-alt' : 'bg-gray-50/50 hover:bg-surface-alt'
                      }`}>
                      <span className={`w-7 h-7 rounded text-[12px] font-bold border-2 flex items-center justify-center shrink-0 ${
                        shortScore === row.score ? 'bg-navy border-navy text-white' : 'bg-white border-gray-200'
                      }`}>{row.score}</span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-medium text-text-primary">{row.label}</span>
                        <span className="block text-[10px] text-text-tertiary leading-snug">{row.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {shortWriting.notes.length > 0 && (
                  <details className="mt-1.5">
                    <summary className="text-[10px] text-purple-600 cursor-pointer hover:underline font-medium">Scoring notes</summary>
                    <ul className="mt-1.5 space-y-1 pl-4 list-disc">
                      {shortWriting.notes.map((n, i) => (
                        <li key={i} className="text-[10px] text-text-tertiary leading-snug">{n}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {/* Extended writing rubric */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-[13px] font-semibold text-navy flex items-center gap-1.5">
                    <Star size={13} className="text-amber-500" />
                    {writingInTotal ? 'Extended Writing' : 'Writing Bonus'}
                  </h4>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                    writingInTotal ? 'bg-navy/10 text-navy' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {writingInTotal
                      ? `Part of the written test -- ${G1_WRITING_MAX} of ${writtenTotalMax} points`
                      : 'Does not penalize -- discriminates advanced students'}
                  </span>
                  <button onClick={() => setShowRubricGuide(!showRubricGuide)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${showRubricGuide ? 'bg-navy text-white' : 'bg-surface-alt text-text-tertiary hover:bg-border'}`}>
                    <Eye size={10} /> {showRubricGuide ? 'Hide Guide' : 'Show Guide'}
                  </button>
                </div>
                <span className="text-[11px] text-text-tertiary">{writingTotal}/{G1_WRITING_MAX}</span>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                {G1_WRITING_CATEGORIES.map((cat, ci) => {
                  const val = rubric[cat.key] || 0
                  const descriptors = G1_WRITING_RUBRIC[cat.key]

                  // Checklist categories are NOT a ladder: the features are
                  // independent and the score is simply how many are present.
                  // Rendering them as 0-5 buttons would invite scoring them as
                  // a ladder, which is the one thing the rubric warns against.
                  if (cat.kind === 'checklist' && cat.checklist) {
                    const checked = new Set(sc.written_checklist?.[cat.key] || [])
                    return (
                      <div key={cat.key} className={`${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <div className="flex items-start gap-3 px-3 py-2">
                          <div className="w-44 shrink-0">
                            <div className="text-[12px] font-medium">{cat.label}</div>
                            <div className="text-[9px] text-text-tertiary">{cat.standard} -- {cat.standardDesc}</div>
                            <div className="text-[9px] text-amber-700 font-semibold mt-1">
                              Checklist -- check every feature present, in any order
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            {cat.checklist.map(box => {
                              const on = checked.has(box.key)
                              return (
                                <label key={box.key}
                                  className="flex items-start gap-2 px-2 py-1 rounded hover:bg-surface-alt cursor-pointer">
                                  <input type="checkbox" checked={on}
                                    onChange={() => toggleWrittenChecklist(student.id, cat.key, box.key)}
                                    className="w-4 h-4 mt-0.5 rounded border-2 border-navy/30 text-green-600 focus:ring-green-500 shrink-0" />
                                  <span className="min-w-0">
                                    <span className="text-[11px] font-medium text-text-primary">{box.label}</span>
                                    {showRubricGuide && (
                                      <span className="block text-[9px] text-text-tertiary leading-snug">{box.desc}</span>
                                    )}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                          <span className="text-[12px] font-bold text-navy ml-2 shrink-0">{checked.size}/{cat.max}</span>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={cat.key} className={`${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-44">
                          <div className="text-[12px] font-medium">{cat.label}</div>
                          <div className="text-[9px] text-text-tertiary">{cat.standard} -- {cat.standardDesc}</div>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: cat.max + 1 }, (_, i) => (
                            <button key={i} onClick={() => updateWrittenRubric(student.id, cat.key, i)}
                              title={descriptors?.[i] || ''}
                              className={`w-8 h-8 rounded text-[12px] font-bold border-2 transition-all ${val === i ? 'bg-navy border-navy text-white' : 'bg-white border-gray-200 hover:border-navy/40'}`}>
                              {i}
                            </button>
                          ))}
                        </div>
                        <span className="text-[12px] font-bold text-navy ml-2">{val}/{cat.max}</span>
                      </div>
                      {showRubricGuide && descriptors && (
                        <div className="px-3 pb-2">
                          <div className="bg-surface-alt/60 rounded-lg px-3 py-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${cat.max + 1}, 1fr)` }}>
                            {Array.from({ length: cat.max + 1 }, (_, i) => (
                              <div key={i} className={`text-[8px] leading-tight px-1 py-1 rounded ${val === i ? 'bg-navy/10 font-semibold text-navy' : 'text-text-tertiary'}`}>
                                <span className="font-bold text-[9px]">{i}:</span> {descriptors[i] || '—'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {content.extendedWriting.notes.length > 0 && (
                <details className="mt-1.5">
                  <summary className="text-[10px] text-purple-600 cursor-pointer hover:underline font-medium">Scoring notes</summary>
                  <ul className="mt-1.5 space-y-1 pl-4 list-disc">
                    {content.extendedWriting.notes.map((n, i) => (
                      <li key={i} className="text-[10px] text-text-tertiary leading-snug">{n}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {/* Teacher judgment. The stored keys are still named for the
                original two-wave test; only the labels change per version. */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-semibold text-navy">
                  {content.usesClassImpression
                    ? (content.administration === 'single_sitting' ? 'Teacher Impression' : 'Wave 2 Teacher Impression')
                    : 'Performance in Current Class'}
                </h4>
                {content.teacherSignal === 'retention_rating' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-navy/10 text-navy font-semibold">
                    Counts toward the composite
                  </span>
                )}
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                {/* Class impression */}
                {content.usesClassImpression && (
                <div className="px-4 py-3 bg-white">
                  <p className="text-[11px] text-text-secondary mb-2">
                    After seeing oral + written data, which class do you think this student belongs in?
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {ENGLISH_CLASSES.map(cls => (
                      <button key={cls} onClick={() => updateScore(student.id, 'wave2_class_impression', sc.wave2_class_impression === cls ? null : cls)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          sc.wave2_class_impression === cls
                            ? 'text-white ring-2 ring-offset-1'
                            : 'border border-border hover:opacity-80'
                        }`}
                        style={sc.wave2_class_impression === cls
                          ? { backgroundColor: classToTextColor(cls), ringColor: classToTextColor(cls) }
                          : { backgroundColor: classToColor(cls), color: classToTextColor(cls) }
                        }>
                        {cls}
                      </button>
                    ))}
                    <button onClick={() => updateScore(student.id, 'wave2_class_impression', sc.wave2_class_impression === 'Unsure' ? null : 'Unsure')}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        sc.wave2_class_impression === 'Unsure'
                          ? 'bg-gray-600 text-white ring-2 ring-gray-400 ring-offset-1'
                          : 'bg-gray-100 text-text-secondary border border-border hover:bg-gray-200'
                      }`}>
                      Unsure
                    </button>
                  </div>
                </div>
                )}
                {/* From Fall 2026 the teacher signal is the four-dimension
                    Teacher Ratings every other grade uses, entered on their own
                    phase. Nothing to fill in here. */}
                {content.teacherSignal === 'anecdotal_ratings' && (
                  <div className="px-4 py-3 bg-blue-50/40">
                    <p className="text-[11px] text-text-secondary">
                      Teacher judgment for this student is recorded on the{' '}
                      <strong className="text-navy">Teacher Ratings</strong> phase, the same as every other grade.
                      It feeds the composite from there.
                    </p>
                  </div>
                )}
                {content.teacherSignal === 'retention_rating' && (
                <div className={`px-4 py-3 bg-gray-50/50 ${content.usesClassImpression ? 'border-t border-border' : ''}`}>
                  <p className="text-[11px] text-text-secondary mb-2">
                    Within their current class ({student.english_class}), how is this student performing?
                  </p>
                  <div className="flex gap-2">
                    {([
                      { value: 'weak', label: 'Weak', desc: 'Struggling, may need extra support', color: 'bg-red-100 text-red-700 border-red-300', active: 'bg-red-500 text-white ring-2 ring-red-400' },
                      { value: 'core', label: 'Core', desc: 'Right where they should be', color: 'bg-gray-100 text-gray-700 border-gray-300', active: 'bg-gray-600 text-white ring-2 ring-gray-400' },
                      { value: 'strong', label: 'Strong', desc: 'Excelling, could move up', color: 'bg-green-100 text-green-700 border-green-300', active: 'bg-green-500 text-white ring-2 ring-green-400' },
                    ] as const).map(opt => (
                      <button key={opt.value}
                        onClick={() => updateScore(student.id, 'wave2_retention_rating', sc.wave2_retention_rating === opt.value ? null : opt.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                          sc.wave2_retention_rating === opt.value ? opt.active + ' ring-offset-1' : opt.color
                        }`}>
                        <div className="font-bold">{opt.label}</div>
                        <div className="text-[9px] opacity-80 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// ORAL TEST ENTRY - Per-Student Adaptive Form
// ============================================================================

// ============================================================================
// INTERACTIVE ORF SUB-COMPONENTS FOR LEVEL TEST
// ============================================================================

// ─── COMPONENT 1: Clickable Letter Grids ────────────────────────────────────

function AlphabetGrids({ sc, studentId, updateScore, content }: {
  sc: G1Scores
  studentId: string
  updateScore: (sid: string, key: string, val: number | string | boolean | null) => void
  content: G1Content
}) {
  const ALPHABET_LETTERS = content.alphabet.letters
  const NAME_MAX = content.alphabet.nameMax
  const SOUND_MAX = content.alphabet.soundMax
  // Letter names grid
  const [nameStatus, setNameStatus] = useState<Record<number, boolean>>({})
  const [soundStatus, setSoundStatus] = useState<Record<number, boolean>>({})
  const [wordsCount, setWordsCount] = useState<number>(sc.o_alpha_words ?? 0)
  const [wordsNote, setWordsNote] = useState<string>(sc.o_alpha_words_note ?? '')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      // Initialize name status from saved score
      if (sc.o_alpha_names != null && sc.o_alpha_names > 0) {
        const ns: Record<number, boolean> = {}
        for (let i = 0; i < sc.o_alpha_names; i++) ns[i] = true
        setNameStatus(ns)
      }
      // Initialize sound status from saved score
      if (sc.o_alpha_sounds != null && sc.o_alpha_sounds > 0) {
        const ss: Record<number, boolean> = {}
        for (let i = 0; i < sc.o_alpha_sounds; i++) ss[i] = true
        setSoundStatus(ss)
      }
      if (sc.o_alpha_words != null) setWordsCount(sc.o_alpha_words)
      if (sc.o_alpha_words_note != null) setWordsNote(sc.o_alpha_words_note)
      setInitialized(true)
    }
  }, [sc.o_alpha_names, sc.o_alpha_sounds, sc.o_alpha_words, sc.o_alpha_words_note, initialized])

  const toggleName = (idx: number) => {
    setNameStatus(prev => {
      const next = { ...prev }
      if (next[idx]) { delete next[idx] } else { next[idx] = true }
      const count = Object.values(next).filter(Boolean).length
      updateScore(studentId, 'o_alpha_names', count)
      return next
    })
    setInitialized(true)
  }

  const toggleSound = (idx: number) => {
    setSoundStatus(prev => {
      const next = { ...prev }
      if (next[idx]) { delete next[idx] } else { next[idx] = true }
      const count = Object.values(next).filter(Boolean).length
      updateScore(studentId, 'o_alpha_sounds', count)
      return next
    })
    setInitialized(true)
  }

  const nameCount = Object.values(nameStatus).filter(Boolean).length
  const soundCount = Object.values(soundStatus).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Letter Names Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-navy">Letter Names</p>
          <span className={`text-[12px] font-bold ${nameCount >= NAME_MAX * 0.75 ? 'text-green-600' : nameCount >= NAME_MAX * 0.5 ? 'text-amber-600' : 'text-text-secondary'}`}>
            {nameCount}/{NAME_MAX}
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 mb-2">
          <p className="text-[10px] text-blue-700">Say: "Tell me the name of each letter." Point to each letter. Tap green = correct.</p>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {ALPHABET_LETTERS.map((letter, i) => (
            <button key={`name-${i}`} onClick={() => toggleName(i)}
              className={`px-2 py-3 rounded-xl text-[18px] font-bold font-serif transition-all ${
                nameStatus[i] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
                'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
              }`} style={{ touchAction: 'manipulation' }}>
              {letter}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => {
            const ns: Record<number, boolean> = {}; ALPHABET_LETTERS.forEach((_, i) => { ns[i] = true }); setNameStatus(ns); updateScore(studentId, 'o_alpha_names', ALPHABET_LETTERS.length); setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setNameStatus({}); updateScore(studentId, 'o_alpha_names', 0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>

      {/* Letter Sounds Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-navy">Letter Sounds</p>
          <span className={`text-[12px] font-bold ${soundCount >= SOUND_MAX * 0.75 ? 'text-green-600' : soundCount >= SOUND_MAX * 0.5 ? 'text-amber-600' : 'text-text-secondary'}`}>
            {soundCount}/{SOUND_MAX}
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 mb-2">
          <p className="text-[10px] text-blue-700">Say: "Now tell me the sound each letter makes." Point to each letter. Tap green = correct sound.</p>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {ALPHABET_LETTERS.map((letter, i) => (
            <button key={`sound-${i}`} onClick={() => toggleSound(i)}
              className={`px-2 py-3 rounded-xl text-[18px] font-bold font-serif transition-all ${
                soundStatus[i] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
                'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
              }`} style={{ touchAction: 'manipulation' }}>
              /{letter}/
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => {
            const ss: Record<number, boolean> = {}; ALPHABET_LETTERS.forEach((_, i) => { ss[i] = true }); setSoundStatus(ss); updateScore(studentId, 'o_alpha_sounds', ALPHABET_LETTERS.length); setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setSoundStatus({}); updateScore(studentId, 'o_alpha_sounds', 0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>

      {/* Words Given */}
      <div className="bg-surface-alt/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-navy">Words Given /5</p>
          <span className={`text-[12px] font-bold ${wordsCount >= 4 ? 'text-green-600' : wordsCount >= 2 ? 'text-amber-600' : 'text-text-secondary'}`}>
            {wordsCount}/5
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 mb-3">
          <p className="text-[10px] text-blue-700">Say: "Can you tell me a word that starts with [letter]?" Pick 5 letters from above. Check how many words they can produce.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => {
                setWordsCount(v)
                updateScore(studentId, 'o_alpha_words', v)
              }}
                className={`w-10 h-10 rounded-xl text-[13px] font-bold transition-all ${
                  wordsCount === v
                    ? 'bg-navy text-white ring-2 ring-navy/30'
                    : 'bg-surface text-text-secondary hover:bg-surface-alt border border-border'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <input
          value={wordsNote}
          onChange={(e: any) => {
            setWordsNote(e.target.value)
            updateScore(studentId, 'o_alpha_words_note', e.target.value || null)
          }}
          placeholder="Optional: note which words they said..."
          className="w-full mt-3 px-3 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy bg-surface"
        />
      </div>

      <p className="text-[10px] text-text-tertiary italic">Stopping rule: If student misses 5 consecutive letter names, stop and move on.</p>
    </div>
  )
}

// ─── COMPONENT 2: Phoneme Manipulation ──────────────────────────────────────

function PhonemeManipulation({ sc, studentId, updateScore, content }: {
  sc: G1Scores
  studentId: string
  updateScore: (sid: string, key: string, val: number | boolean | null) => void
  content: G1Content
}) {
  const { modelWord, words, max, stoppingRule, l1Note } = content.phoneme

  const phonemeTotal = words.reduce(
    (total, pw) => total + pw.probes.filter(pr => !!(sc as any)[pr.key]).length, 0)

  return (
    <div className="space-y-4">
      {/* Teacher model word -- demonstrated, never scored */}
      {modelWord ? (
        <div className="bg-amber-50 rounded-xl px-5 py-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[12px] font-bold text-amber-900">Teacher model first</p>
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Not scored
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Demonstrate the task with <span className="font-bold font-serif">{modelWord.word}</span> before the student
            tries. This word appears on the student copy for this purpose only &mdash; do not record points for it.
          </p>
          <div className="mt-2 bg-white/60 rounded-lg px-4 py-3 text-[11px] text-amber-900 space-y-1.5">
            <p><span className="font-bold">1.</span> Push a counter for each sound while saying <span className="font-semibold">{modelWord.sounds.join(' ')}</span></p>
            <p><span className="font-bold">2.</span> Say: <span className="font-semibold">"{modelWord.sounds.length} sounds. The first sound is {modelWord.sounds[0]}."</span></p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-xl px-5 py-4 border border-amber-200">
          <p className="text-[12px] font-bold text-amber-900 mb-2">Teacher Model First!</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Model the whole task with an example word before the student tries each word below.
          </p>
        </div>
      )}

      {/* Per-word assessment */}
      <div className="space-y-4">
        {words.map((pw) => {
          const wordTotal = pw.probes.filter(pr => !!(sc as any)[pr.key]).length
          const wordMax = pw.probes.length
          return (
            <div key={pw.word} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[20px] font-bold font-serif text-navy">{pw.word}</span>
                  <div className="flex gap-1">
                    {pw.sounds.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-navy/5 rounded text-[11px] font-mono text-navy">{s}</span>
                    ))}
                  </div>
                </div>
                <span className={`text-[12px] font-bold ${
                  wordTotal === wordMax ? 'text-green-600' : wordTotal > 0 ? 'text-amber-600' : 'text-text-tertiary'
                }`}>
                  {wordTotal}/{wordMax}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {pw.probes.map(probe => {
                  const checked = !!(sc as any)[probe.key]
                  return (
                    <label key={probe.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-alt cursor-pointer transition-all">
                      <input type="checkbox" checked={checked}
                        onChange={() => updateScore(studentId, probe.key, !checked)}
                        className="w-5 h-5 rounded border-2 border-navy/30 text-green-600 focus:ring-green-500" />
                      <div>
                        <span className="text-[12px] font-medium text-text-primary">{probe.label}</span>
                        <span className="text-[10px] text-text-tertiary ml-2">&rarr; {probe.answer}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {l1Note && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-blue-800 mb-1">Note on L1 interference</p>
          <p className="text-[10px] text-blue-700 leading-relaxed">{l1Note}</p>
        </div>
      )}

      <div className="flex items-center justify-between bg-navy/5 rounded-xl px-4 py-3 border border-navy/10 gap-4">
        <span className="text-[13px] font-bold text-navy whitespace-nowrap">Phoneme Total: {phonemeTotal} / {max}</span>
        <span className="text-[10px] text-text-tertiary italic text-right">{stoppingRule}</span>
      </div>
    </div>
  )
}


// ─── Level B: HFW clickable word grid (unchanged) ───────────────────────────

function LevelBWordGrid({ score, onScore, content }: { score: number | null | undefined; onScore: (n: number | null) => void; content: G1Content }) {
  const LEVEL_B_WORDS = content.levelB.words
  const bMax = content.levelB.max
  const bumpUp = content.passageConfigs.B.bumpUpThreshold ?? Math.ceil(bMax * 0.75)
  const [wordStatus, setWordStatus] = useState<Record<number, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (score != null && score > 0 && !initialized) {
      const ws: Record<number, boolean> = {}
      for (let i = 0; i < score; i++) ws[i] = true
      setWordStatus(ws)
      setInitialized(true)
    }
  }, [score, initialized])

  const toggle = (idx: number) => {
    setWordStatus(prev => {
      const next = { ...prev }
      if (next[idx]) { delete next[idx] } else { next[idx] = true }
      const count = Object.values(next).filter(Boolean).length
      onScore(count)
      return next
    })
    setInitialized(true)
  }

  const correctCount = Object.values(wordStatus).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
        <p className="text-[11px] font-semibold text-blue-800">Say: "Read each word. Try your best."</p>
        <p className="text-[10px] text-blue-600 mt-0.5">Point to each word. Give 3-5 seconds per word. Tap to mark correct (green), tap again to undo.</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {LEVEL_B_WORDS.map((word, i) => (
          <button key={i} onClick={() => toggle(i)}
            className={`px-3 py-3 rounded-xl text-[16px] font-serif font-bold transition-all ${
              wordStatus[i] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
              'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
            }`}>
            {word}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-bold ${correctCount >= bumpUp ? 'text-green-600' : correctCount >= bMax * 0.4 ? 'text-amber-600' : 'text-text-secondary'}`}>
          {correctCount}/{bMax} correct
        </span>
        <div className="flex gap-2">
          <button onClick={() => { const ws: Record<number, boolean> = {}; LEVEL_B_WORDS.forEach((_, i) => { ws[i] = true }); setWordStatus(ws); onScore(LEVEL_B_WORDS.length); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setWordStatus({}); onScore(0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
      {correctCount >= bumpUp && <p className="text-[10px] text-blue-600 font-medium">Score is {bumpUp}+. You may want to re-test at Level C.</p>}
      {initialized && correctCount === 0 && <p className="text-[10px] text-amber-600 font-medium">Cannot read any words. You may want to re-test at Level A.</p>}
    </div>
  )
}

// ─── Level C: Clickable sentence words ──────────────────────────────────────

function LevelCSentences({ score, onScore, content }: { score: number | null | undefined; onScore: (n: number | null) => void; content: G1Content }) {
  const LEVEL_C_SENTENCES = content.levelC.sentences
  const cMax = content.levelC.max
  const allWords = LEVEL_C_SENTENCES.flatMap((s, si) => s.words.map((w, wi) => ({ word: w, sentIdx: si, wordIdx: wi, key: `${si}-${wi}` })))
  const [wordStatus, setWordStatus] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (score != null && score > 0 && !initialized) {
      const ws: Record<string, boolean> = {}
      let count = 0
      allWords.forEach(w => { if (count < score) { ws[w.key] = true; count++ } })
      setWordStatus(ws)
      setInitialized(true)
    }
  }, [score, initialized])

  const toggle = (key: string) => {
    setWordStatus(prev => {
      const next = { ...prev }
      if (next[key]) { delete next[key] } else { next[key] = true }
      const count = Object.values(next).filter(Boolean).length
      onScore(count)
      return next
    })
    setInitialized(true)
  }

  const correctCount = Object.values(wordStatus).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
        <p className="text-[11px] font-semibold text-blue-800">Say: "Read these sentences out loud. Try your best."</p>
        <p className="text-[10px] text-blue-600 mt-0.5">1 pt per word read correctly. Self-corrections count as correct. Tap to mark correct, tap again to undo.</p>
      </div>
      <div className="space-y-3">
        {LEVEL_C_SENTENCES.map((sent, si) => (
          <div key={si} className="flex items-center gap-2">
            <span className="text-[11px] text-text-tertiary font-bold w-5 shrink-0">{si + 1}.</span>
            <div className="flex gap-1.5 flex-wrap">
              {sent.words.map((word, wi) => {
                const key = `${si}-${wi}`
                return (
                  <button key={key} onClick={() => toggle(key)}
                    className={`px-3 py-2 rounded-lg text-[16px] font-serif transition-all ${
                      wordStatus[key] === true ? 'bg-green-100 text-green-800 border-2 border-green-400' :
                      'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
                    }`}>
                    {word}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-bold ${correctCount >= cMax * 0.8 ? 'text-green-600' : correctCount >= cMax * 0.45 ? 'text-amber-600' : 'text-text-secondary'}`}>
          {correctCount}/{cMax} correct
        </span>
        <div className="flex gap-2">
          <button onClick={() => { const ws: Record<string, boolean> = {}; allWords.forEach(w => { ws[w.key] = true }); setWordStatus(ws); onScore(allWords.length); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setWordStatus({}); onScore(0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
      {correctCount >= cMax * 0.8 && <p className="text-[10px] text-blue-600 font-medium">If they can give you a full sentence, you may want to re-test at Level D.</p>}
      {initialized && correctCount === 0 && <p className="text-[10px] text-amber-600 font-medium">Cannot read any words. You may want to re-test at Level B.</p>}
    </div>
  )
}

// ─── Level D/E/F: Passage reader (unchanged from original) ─────────────────

function LevelDEFPassage({ level, wordsRead, errors, timeSeconds, initialWordMarks, onUpdate, content }: {
  level: string; wordsRead: number | null | undefined; errors: number | null | undefined; timeSeconds: number | null | undefined;
  /**
   * Which word got which mark, so reopening the passage shows the reading as
   * it was left. Without it a teacher who closes the modal -- for a long break,
   * or by accident -- comes back to a clean passage, and saving again writes
   * the error count back as zero over a real one.
   */
  initialWordMarks?: Record<number, 'error' | 'self_correct' | null> | null
  onUpdate: (field: string, val: number | null | Record<string, unknown>) => void
  content: G1Content
}) {
  const [showPassage, setShowPassage] = useState(false)
  const [wordMarks, setWordMarks] = useState<Record<number, 'error' | 'self_correct' | null>>({})
  const [lastWordIdx, setLastWordIdx] = useState<number | null>(null)
  const [timing, setTiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [pausedForBreak, setPausedForBreak] = useState(false)
  const [notes, setNotes] = useState('')
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const passage = content.passages[level]
  if (!passage) return null
  const words = passage.text.split(/\s+/)

  useEffect(() => {
    if (timing) {
      startRef.current = Date.now() - (elapsed * 1000)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000))
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timing])

  const wRead = lastWordIdx !== null ? lastWordIdx + 1 : words.length
  const errCount = Object.entries(wordMarks).filter(([i, m]) => m === 'error' && (lastWordIdx === null || Number(i) <= lastWordIdx)).length
  const scCount = Object.entries(wordMarks).filter(([i, m]) => m === 'self_correct' && (lastWordIdx === null || Number(i) <= lastWordIdx)).length
  const t = elapsed || 1
  const cwpm = Math.round(((wRead - errCount) / t) * 60)
  const accuracy = wRead > 0 ? Math.round(((wRead - errCount) / wRead) * 1000) / 10 : 0
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  // The clock is stopped part-way and the reading can carry on. True after a
  // Pause, and also when a saved passage is reopened -- so `pausedForBreak`,
  // set only by the button, is what labels the break; a reopened passage that
  // was actually finished must not claim someone is on a break.
  const canResume = !timing && !finished && elapsed > 0

  const handleWordClick = (idx: number) => {
    if (lastWordIdx !== null && idx > lastWordIdx) return
    if (lastWordIdx === idx) { setLastWordIdx(null); return }

    const current = wordMarks[idx] || null
    if (current === null) {
      setWordMarks(prev => ({ ...prev, [idx]: 'error' }))
    } else if (current === 'error') {
      setWordMarks(prev => ({ ...prev, [idx]: 'self_correct' }))
    } else if (current === 'self_correct') {
      setWordMarks(prev => ({ ...prev, [idx]: null }))
      setLastWordIdx(idx)
    }
  }

  const handleSave = () => {
    onUpdate('o_orf_words_read', wRead)
    onUpdate('o_orf_errors', errCount)
    // Record the ACTUAL elapsed time, including past 60 seconds. The old code
    // discarded any time >= 60s, and the composite then assumed exactly 60 --
    // so a reader who took 95 seconds was scored as if they had taken 60.
    onUpdate('o_orf_time_seconds', elapsed > 0 ? elapsed : null)
    onUpdate('o_orf_word_marks', wordMarks)
    setFinished(true)
    setTiming(false)
    setShowPassage(false)
  }

  const handleReset = () => {
    setWordMarks({})
    setLastWordIdx(null)
    setTiming(false)
    setElapsed(0)
    setFinished(false)
    setPausedForBreak(false)
    setNotes('')
  }

  useEffect(() => {
    if (wordsRead != null && wordsRead > 0 && wordsRead < words.length && lastWordIdx === null && !showPassage) {
      setLastWordIdx(wordsRead - 1)
    }
  }, [wordsRead])

  // Bring back the marks and the clock, so reopening the passage shows the
  // reading where it was left rather than a clean page.
  useEffect(() => {
    if (initialWordMarks && Object.keys(initialWordMarks).length > 0 && Object.keys(wordMarks).length === 0) {
      setWordMarks(initialWordMarks)
    }
    if (timeSeconds != null && timeSeconds > 0 && elapsed === 0) setElapsed(timeSeconds)
  }, [])

  const lines: { word: string; idx: number }[][] = []
  for (let i = 0; i < words.length; i += 10) {
    lines.push(words.slice(i, i + 10).map((w, j) => ({ word: w, idx: i + j })))
  }

  return (
    <>
      <button onClick={() => setShowPassage(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-all">
        <BookOpen size={14} /> {finished ? 'Done -- ' : ''}Open Passage: "{passage.title}" ({passage.wordCount} words)
      </button>

      {showPassage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowPassage(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[850px] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
            <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-green-50 shrink-0">
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">Passage {level}: {passage.title}</h3>
                <p className="text-[10px] text-text-secondary">{passage.wordCount} words</p>
              </div>
              <button onClick={() => setShowPassage(false)} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
            </div>

            <div className="flex items-center justify-between px-6 py-2.5 bg-navy-dark text-white shrink-0">
              <div className="flex items-center gap-3">
                {!timing && !finished && (
                  <button onClick={() => { setTiming(true); setFinished(false); setPausedForBreak(false) }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[12px] font-semibold">
                    {canResume ? 'Resume' : 'Start'}
                  </button>
                )}
                {/* Pause is for a break, not for the end of the reading. The
                    clock picks up where it stopped, so the break is not
                    counted in the CWPM -- which is the whole point of it. */}
                {timing && (
                  <button onClick={() => { setTiming(false); setPausedForBreak(true) }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-semibold">
                    Pause
                  </button>
                )}
                {(timing || canResume) && (
                  <button onClick={() => { setTiming(false); setPausedForBreak(false); setFinished(true) }}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold ${timing ? 'animate-pulse' : ''}`}>
                    Stop
                  </button>
                )}
                {finished && (
                  <button onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium">
                    Reset
                  </button>
                )}
                <span className={`text-[24px] font-mono font-bold tabular-nums ${
                  pausedForBreak ? 'text-amber-300'
                    : elapsed >= content.timing.ceilingSeconds ? 'text-red-400'
                    : elapsed >= content.timing.struggleStopSeconds ? 'text-gold' : ''
                }`}>{formatTime(elapsed)}</span>
                {pausedForBreak && (
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                    Paused &mdash; clock stopped for a break
                  </span>
                )}
                {timing && elapsed >= content.timing.struggleStopSeconds && (
                  <span className={`text-[10px] leading-tight max-w-[230px] ${
                    elapsed >= content.timing.ceilingSeconds ? 'text-red-300 font-semibold' : 'text-white/70'
                  }`}>
                    {elapsed >= content.timing.ceilingSeconds
                      ? 'Two minutes. End the passage and move on.'
                      : 'Reading capably? Let them finish. Struggling? Stop and skip comprehension.'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-5 text-[11px]">
                <div className="text-center"><div className="text-[18px] font-bold">{errCount}</div><div className="text-white/60 text-[8px] uppercase">Errors</div></div>
                <div className="text-center"><div className="text-[18px] font-bold">{scCount}</div><div className="text-white/60 text-[8px] uppercase">SC</div></div>
                <div className="text-center"><div className="text-[18px] font-bold text-gold">{elapsed > 0 ? cwpm : '--'}</div><div className="text-white/60 text-[8px] uppercase">CWPM</div></div>
                <div className="text-center"><div className={`text-[18px] font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 90 ? 'text-amber-400' : elapsed > 0 ? 'text-red-400' : ''}`}>{elapsed > 0 ? `${accuracy}%` : '--'}</div><div className="text-white/60 text-[8px] uppercase">Acc</div></div>
                <div className="text-center"><div className="text-[18px] font-bold">{wRead}/{words.length}</div><div className="text-white/60 text-[8px] uppercase">Words</div></div>
              </div>
            </div>

            <div className="px-6 py-1.5 bg-accent-light border-b border-border text-[10px] text-navy shrink-0">
              <strong>Click:</strong> 1x = <span className="text-red-600 font-bold">error</span> | 2x = <span className="text-amber-600 font-bold">self-correct</span> | 3x = <span className="text-red-600 font-bold">last word read</span> | 4x = reset
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {lastWordIdx !== null && (
                <div className="mb-3 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
                  <span className="text-[11px] text-blue-800 font-medium">
                    Last word: "{words[lastWordIdx]}" -- <span className="font-bold">{lastWordIdx + 1}/{words.length}</span>
                    {lastWordIdx + 1 < words.length && <span className="text-blue-600 ml-1">(didn't finish)</span>}
                  </span>
                  <button onClick={() => setLastWordIdx(null)} className="text-[10px] text-red-500 hover:text-red-700">Clear</button>
                </div>
              )}
              <div className="leading-[2.8]">
                {lines.map((line, li) => (
                  <div key={li} className="flex flex-wrap gap-x-1 mb-1">
                    <span className="text-[8px] text-text-tertiary w-5 text-right mr-2 mt-2 shrink-0">{li * 10 + 1}</span>
                    {line.map(({ word, idx }) => {
                      const mark = wordMarks[idx] || null
                      const isPastLast = lastWordIdx !== null && idx > lastWordIdx
                      const isLastWord = lastWordIdx === idx
                      return (
                        <button key={idx} onClick={() => handleWordClick(idx)}
                          className={`px-1.5 py-1 rounded-lg text-[17px] font-serif font-medium transition-all select-none ${
                            isPastLast ? 'text-gray-300 border-2 border-transparent cursor-default' :
                            isLastWord ? 'bg-red-500 text-white border-2 border-red-600 ring-2 ring-red-300 font-bold' :
                            mark === 'error' ? 'bg-red-100 text-red-700 border-2 border-red-400 line-through decoration-2' :
                            mark === 'self_correct' ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' :
                            'hover:bg-surface-alt border-2 border-transparent text-text-primary'
                          }`} style={{ touchAction: 'manipulation' }}>
                          {word}
                          {mark === 'self_correct' && !isPastLast && <span className="text-[8px] align-super ml-0.5">SC</span>}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-surface-alt/30 shrink-0 space-y-2">
              <input value={notes} onChange={(e: any) => setNotes(e.target.value)}
                placeholder="Quick notes (e.g. struggled with blends, good expression)..."
                className="w-full px-3 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy bg-white" />
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-text-tertiary">
                  {elapsed > 0 && <>CWPM: <strong className="text-navy">{cwpm}</strong> | Accuracy: <strong className={accuracy >= 95 ? 'text-green-600' : accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}>{accuracy}%</strong> | </>}
                  Errors: <strong className="text-red-600">{errCount}</strong> | SC: <strong className="text-amber-600">{scCount}</strong>
                </div>
                <div className="flex items-center gap-2">
                  {/* Stop the clock the moment the student finishes, without
                      closing the passage -- the teacher still has to mark the
                      last word and any errors, and the timer must not keep
                      running while they do. */}
                  {timing && (
                    <button onClick={() => { setTiming(false); setFinished(true) }}
                      className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all animate-pulse">
                      Done reading -- stop timer
                    </button>
                  )}
                  {!timing && finished && elapsed > 0 && (
                    <span className="text-[11px] text-text-tertiary">
                      Timer stopped at <strong className="text-navy">{formatTime(elapsed)}</strong>
                    </span>
                  )}
                  <button onClick={handleSave}
                    className="px-5 py-2 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 transition-all">
                    Save & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// ORAL TEST ENTRY MAIN
// ============================================================================

function OralTestEntry({ content, students, scores, updateScore, onSave, saving, selectedIdx, onSelectIdx, activeWave, onClearOral, onRestoreAttempt }: {
  content: G1Content
  students: Student[]
  scores: Record<string, G1Scores>
  updateScore: (sid: string, key: string, val: number | string | boolean | null) => void
  onSave: (sids: string[]) => Promise<void>
  saving: boolean
  selectedIdx: number
  onSelectIdx: (idx: number) => void
  activeWave: 1 | 2
  onClearOral: (sid: string, name: string) => Promise<void>
  onRestoreAttempt: (sid: string, attemptIdx: number) => void
}) {
  const { confirmDialog } = useApp()
  const PASSAGE_CONFIGS = content.passageConfigs
  const COMP_QUESTIONS = content.compQuestions
  const COMP_SCORING_EXAMPLES = content.compScoringExamples
  const LEVEL_A_QUESTIONS = content.levelA.questions
  const LEVEL_A_RUBRIC = content.levelA.rubric

  const student = students[selectedIdx]
  if (!student) return <div className="p-8 text-center text-text-tertiary">No students found.</div>

  const sc = scores[student.id] || {}
  const passageLevel = (sc.o_passage_level || '') as PassageLevel | ''
  const config = passageLevel ? PASSAGE_CONFIGS[passageLevel as PassageLevel] : null
  const compNotAdministered = !!sc.o_comp_not_administered

  // Turning the flag on clears any comprehension scores already entered, so the
  // record cannot hold both "not asked" and a set of answers. Confirm first if
  // there is something to lose.
  const handleToggleCompNotAdministered = async (sid: string, cur: G1Scores) => {
    const compKeys = ['o_comp_q1', 'o_comp_q2', 'o_comp_q3', 'o_comp_q4', 'o_comp_q5'] as const
    if (cur.o_comp_not_administered) {
      updateScore(sid, 'o_comp_not_administered', null)
      return
    }
    const entered = compKeys.filter(k => cur[k] != null)
    if (entered.length > 0) {
      const ok = await confirmDialog({
        title: 'Clear comprehension scores?',
        message: `${entered.length} comprehension ${entered.length === 1 ? 'answer has' : 'answers have'} already been scored. Marking the questions as not administered will clear ${entered.length === 1 ? 'it' : 'them'}.`,
        confirmLabel: 'Clear and mark',
        danger: true,
      })
      if (!ok) return
      compKeys.forEach(k => updateScore(sid, k, null))
    }
    updateScore(sid, 'o_comp_not_administered', true)
  }

  const studentHasOralData = (sid: string) => {
    const s = scores[sid] || {}
    return !!(s.o_passage_level || s.o_alpha_names != null)
  }

  const getClassImpression = (sid: string): string | null => {
    const s = scores[sid] || {}
    return content.usesClassImpression ? (s.wave1_class_impression || null) : null
  }

  // For Level A: compute per-question total
  const aTotal = (sc.o_a_q1 ?? 0) + (sc.o_a_q2 ?? 0) + (sc.o_a_q3 ?? 0) + (sc.o_a_q4 ?? 0) + (sc.o_a_q5 ?? 0)

  return (
    <div className="flex h-[calc(100vh-220px)]">
      {/* Student List Sidebar */}
      <div className="w-64 border-r border-border bg-surface-alt/50 overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Students</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">{students.filter(s => studentHasOralData(s.id)).length}/{students.length} entered</p>
        </div>
        <div className="py-1">
          {students.map((s, idx) => {
            const done = studentHasOralData(s.id)
            return (
              <button key={s.id} onClick={() => onSelectIdx(idx)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-all ${
                  idx === selectedIdx
                    ? 'bg-navy/10 border-r-2 border-navy'
                    : 'hover:bg-surface-alt'
                }`}>
                {done
                  ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                  : <Circle size={13} className="text-text-tertiary flex-shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] truncate ${idx === selectedIdx ? 'font-semibold text-navy' : 'text-text-primary'}`}>
                    {s.english_name}
                  </p>
                  <p className="text-[10px] text-text-tertiary truncate">{s.korean_name}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getClassImpression(s.id) && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200" title={content.administration === 'single_sitting' ? 'Impression from the oral session' : 'Wave 1 impression'}>
                      {getClassImpression(s.id)!.slice(0, 3)}
                    </span>
                  )}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: classToColor(s.english_class as EnglishClass), color: classToTextColor(s.english_class as EnglishClass) }}>
                    {s.english_class.slice(0, 3)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Entry Form */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Student Header + Nav */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">{student.english_name}</h3>
            <p className="text-[12px] text-text-secondary">{student.korean_name} -- {student.english_class}</p>
          </div>
          <div className="flex items-center gap-2">
            {studentHasOralData(student.id) && (
              <button onClick={() => onClearOral(student.id, student.english_name)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 border border-red-200 transition-all">
                <RotateCcw size={12} /> Clear
              </button>
            )}
            <button onClick={() => { onSave([student.id]); if (selectedIdx > 0) onSelectIdx(selectedIdx - 1) }}
              disabled={selectedIdx === 0 || saving}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30 transition-all">
              <ChevronLeft size={14} /> Prev
            </button>
            <button onClick={() => onSave([student.id])} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button onClick={() => { onSave([student.id]); if (selectedIdx < students.length - 1) onSelectIdx(selectedIdx + 1) }}
              disabled={selectedIdx === students.length - 1 || saving}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30 transition-all">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Before-you-start notes: universal, then Grade 1 oral, then the
            cautions specific to this test version. */}
        <TestNotesPanel
          storageKey="oral-g1"
          groups={[
            { label: 'Grade 1 oral test', notes: G1_ORAL_NOTES },
            ...(content.adminNotes.length > 0
              ? [{ label: `${content.label} notes`, notes: content.adminNotes }]
              : []),
          ]}
        />

        {/* Section 1: Alphabet Recognition -- clickable grids */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Component 1: Alphabet Recognition</h4>
          <p className="text-[11px] text-text-secondary mb-4">Letters: {content.alphabet.letters.join(', ')} ({content.alphabet.letters.length} letters)</p>
          <AlphabetGrids key={student.id} sc={sc} studentId={student.id} updateScore={updateScore} content={content} />
        </div>

        {/* Section 2: Phoneme Manipulation -- redesigned */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Component 2: Phoneme Manipulation</h4>
          <p className="text-[11px] text-text-secondary mb-4">
            Words: {content.phoneme.words.map(w => w.word).join(', ')} &mdash; segmenting, counting, isolating sounds
            {content.phoneme.modelWord && <> (model word <span className="font-semibold">{content.phoneme.modelWord.word}</span> is not scored)</>}
          </p>
          <PhonemeManipulation key={student.id} sc={sc} studentId={student.id} updateScore={updateScore} content={content} />
        </div>

        {/* Section 3: Oral Reading Fluency -- Passage Level Selection */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-3">Component 3: Oral Reading Fluency</h4>

          <div className="mb-4">
            <label className="text-[11px] font-medium text-text-secondary block mb-2">Passage Level</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C', 'D', 'E', 'F'] as PassageLevel[]).map(level => (
                <button key={level} onClick={async () => {
                  if (passageLevel && level !== passageLevel) {
                    const hasData = ['o_orf_raw', 'o_orf_words_read', 'o_comp_q1', 'o_a_q1', 'o_a_q2', 'o_a_q3'].some(f => (sc as any)[f] != null)
                    if (hasData && !await confirmDialog({ title: `Switch from Level ${passageLevel} to Level ${level}?`, message: 'Current scores will be archived. Only the last level attempted counts toward scoring.', confirmLabel: 'Switch' })) return
                  }
                  updateScore(student.id, 'o_passage_level', level)
                }}
                  className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                    passageLevel === level
                      ? 'bg-navy text-white shadow-sm ring-2 ring-navy/30'
                      : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                  }`}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Previous attempts -- click to restore */}
          {Array.isArray((sc as any).passages_attempted) && (sc as any).passages_attempted.length > 0 && (
            <div className="mb-4 bg-amber-50/50 border border-amber-100 rounded-lg px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">Previous Attempts (click to restore)</p>
              <div className="flex gap-2 flex-wrap">
                {(sc as any).passages_attempted.map((att: any, i: number) => (
                  <button key={i} onClick={async () => {
                    if (!await confirmDialog({ title: `Restore the Level ${att.level} attempt?`, message: 'Current passage data will be swapped into the archive.', confirmLabel: 'Restore' })) return
                    onRestoreAttempt(student.id, i)
                  }}
                    className="inline-flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-100/60 hover:bg-amber-200/80 border border-amber-200 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer">
                    <RotateCcw size={10} />
                    <span className="font-bold">Lv {att.level}</span>
                    {att.o_orf_raw != null && <span className="text-text-tertiary">Score: {att.o_orf_raw}</span>}
                    {att.o_a_q1 != null && <span className="text-text-tertiary">Interview: {(att.o_a_q1 || 0) + (att.o_a_q2 || 0) + (att.o_a_q3 || 0) + (att.o_a_q4 || 0) + (att.o_a_q5 || 0)}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config && (
            <div className="bg-blue-50/50 rounded-lg px-4 py-3 mb-4 border border-blue-100">
              <p className="text-[12px] font-semibold text-navy">{config.label}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{config.description}</p>
              <p className="text-[10px] text-text-tertiary mt-1">
                You choose the level. If you misjudged, pick another one &mdash; the current scores are archived, not lost,
                and you can restore an earlier attempt at any time.
              </p>
              {config.bumpUpThreshold != null && (
                <p className="text-[10px] text-blue-600 mt-0.5">A score of {config.bumpUpThreshold}+ suggests re-testing at the next level up.</p>
              )}
              {config.bumpDownThreshold != null && (
                <p className="text-[10px] text-amber-600">If the student cannot read any words, consider the level below.</p>
              )}
            </div>
          )}

          {/* Level A -- holistic: ONE rating for the whole interview */}
          {passageLevel === 'A' && content.levelA.mode === 'holistic' && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <p className="text-[11px] font-semibold text-blue-800">Say: "I'm going to ask you some questions. Just try your best."</p>
              </div>

              <div className="bg-surface-alt/50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-2">Ask all five questions</p>
                <ol className="space-y-1 list-decimal list-inside">
                  {LEVEL_A_QUESTIONS.map((q, qi) => (
                    <li key={qi} className="text-[12px] text-text-primary">{q.q}</li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-navy mb-2">
                  Rate the interview as a whole <span className="text-text-tertiary font-normal">/{content.levelA.max}</span>
                </p>
                <div className="space-y-1.5">
                  {LEVEL_A_RUBRIC.map(r => {
                    const selected = sc.o_orf_raw === r.score
                    return (
                      <button key={r.score}
                        onClick={() => updateScore(student.id, 'o_orf_raw', selected ? null : r.score)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                          selected
                            ? 'bg-navy text-white border-navy ring-2 ring-navy/20'
                            : 'bg-surface text-text-secondary border-border hover:bg-surface-alt'
                        }`}>
                        <span className={`w-7 h-7 rounded-lg text-[13px] font-bold flex items-center justify-center shrink-0 ${
                          selected ? 'bg-white/20 text-white' : 'bg-navy/10 text-navy'
                        }`}>{r.score}</span>
                        <span className="min-w-0">
                          <span className={`block text-[12px] font-semibold ${selected ? '' : 'text-navy'}`}>{r.label}</span>
                          <span className={`block text-[10px] leading-snug ${selected ? 'opacity-85' : 'text-text-tertiary'}`}>{r.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between bg-navy/5 rounded-xl px-4 py-3 border border-navy/10">
                <span className="text-[13px] font-bold text-navy">
                  Level A Score: {sc.o_orf_raw ?? '--'} / {content.levelA.max}
                </span>
                {config?.bumpUpThreshold != null && (sc.o_orf_raw ?? 0) >= config.bumpUpThreshold && (
                  <span className="text-[10px] text-blue-600 font-medium">You may want to re-test at Level B.</span>
                )}
              </div>
            </div>
          )}

          {/* Level A -- per-question rubric scoring (original test) */}
          {passageLevel === 'A' && content.levelA.mode === 'per_question' && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <p className="text-[11px] font-semibold text-blue-800">Say: "I'm going to ask you some questions. Just try your best."</p>
              </div>

              <div className="space-y-3">
                {LEVEL_A_QUESTIONS.map((q, qi) => {
                  const qKey = `o_a_q${qi + 1}` as keyof G1Scores
                  const qVal = (sc as any)[qKey] as number | null | undefined

                  return (
                    <div key={qi} className="bg-surface-alt/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-navy/10 text-navy text-[11px] font-bold flex items-center justify-center shrink-0">{qi + 1}</span>
                        <span className="text-[12px] font-medium text-text-primary">{q.q}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {LEVEL_A_RUBRIC.map(r => (
                          <button key={r.score} onClick={() => updateScore(student.id, qKey, qVal === r.score ? null : r.score)}
                            title={`${r.label}: ${r.desc}`}
                            className={`flex-1 px-2 py-2.5 rounded-xl text-center transition-all ${
                              qVal === r.score
                                ? r.score === 0 ? 'bg-red-500 text-white' :
                                  r.score === 1 ? 'bg-orange-500 text-white' :
                                  r.score === 2 ? 'bg-amber-500 text-white' :
                                  r.score === 3 ? 'bg-blue-500 text-white' :
                                  'bg-green-500 text-white'
                                : 'bg-surface text-text-secondary hover:bg-surface-alt border border-border'
                            }`}>
                            <div className="text-[14px] font-bold">{r.score}</div>
                            <div className={`text-[8px] mt-0.5 leading-tight ${qVal === r.score ? 'opacity-90' : 'text-text-tertiary'}`}>{r.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between bg-navy/5 rounded-xl px-4 py-3 border border-navy/10 mt-3">
                <span className="text-[13px] font-bold text-navy">Total: {aTotal} / {content.levelA.max}</span>
                {config?.bumpUpThreshold != null && aTotal >= config.bumpUpThreshold && <span className="text-[10px] text-blue-600 font-medium">Score is {config.bumpUpThreshold}+. You may want to re-test at Level B.</span>}
                {aTotal > 0 && aTotal < 5 && <span className="text-[10px] text-red-600 font-medium">Very limited English production.</span>}
              </div>

              {/* Rubric reference */}
              <details className="mt-2">
                <summary className="text-[10px] text-purple-600 cursor-pointer hover:underline font-medium">View full rubric descriptions</summary>
                <div className="mt-2 space-y-1">
                  {LEVEL_A_RUBRIC.map(r => (
                    <div key={r.score} className="flex items-start gap-2 text-[10px] px-2 py-1">
                      <span className="w-5 h-5 rounded-lg bg-navy/10 text-navy font-bold flex items-center justify-center shrink-0">{r.score}</span>
                      <div><span className="font-semibold text-navy">{r.label}:</span> <span className="text-text-secondary">{r.desc}</span></div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {passageLevel === 'B' && (
            <LevelBWordGrid key={student.id} score={sc.o_orf_raw} onScore={(n: number | null) => updateScore(student.id, 'o_orf_raw', n)} content={content} />
          )}

          {passageLevel === 'C' && (
            <LevelCSentences key={student.id} score={sc.o_orf_raw} onScore={(n: number | null) => updateScore(student.id, 'o_orf_raw', n)} content={content} />
          )}

          {passageLevel && config?.hasCwpm && (
            <div className="space-y-4">
              <LevelDEFPassage
                key={student.id + '-' + passageLevel}
                level={passageLevel}
                wordsRead={sc.o_orf_words_read}
                initialWordMarks={sc.o_orf_word_marks}
                errors={sc.o_orf_errors}
                timeSeconds={sc.o_orf_time_seconds}
                onUpdate={(field: string, val: number | null) => updateScore(student.id, field, val)}
                content={content}
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">
                    Words Read (:60) <span className="text-text-tertiary">/{config.wordCount}</span>
                  </label>
                  <input type="number" min={0} max={config.wordCount ?? 100}
                    value={sc.o_orf_words_read ?? ''}
                    onChange={e => updateScore(student.id, 'o_orf_words_read', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                    placeholder="--"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Errors</label>
                  <input type="number" min={0}
                    value={sc.o_orf_errors ?? ''}
                    onChange={e => updateScore(student.id, 'o_orf_errors', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                    placeholder="--"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">
                    Time (sec) <span className="text-text-tertiary">if finished early</span>
                  </label>
                  <input type="number" min={1} max={60}
                    value={sc.o_orf_time_seconds ?? ''}
                    onChange={e => updateScore(student.id, 'o_orf_time_seconds', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                    placeholder="60"
                  />
                </div>
              </div>

              {sc.o_orf_words_read != null && (
                <div className="bg-green-50 rounded-lg px-4 py-2.5 border border-green-100">
                  <span className="text-[11px] text-green-700 font-medium">
                    CWPM: {Math.round(((sc.o_orf_words_read - (sc.o_orf_errors ?? 0)) / (sc.o_orf_time_seconds || 60)) * 60)}
                    <span className="text-green-600/70 ml-2">(The app calculates weighted CWPM automatically)</span>
                  </span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium text-text-secondary block mb-2">NAEP Fluency Rating</label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} onClick={() => updateScore(student.id, 'o_naep', sc.o_naep === n ? null : n)}
                      className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-left text-[11px] transition-all ${
                        sc.o_naep === n
                          ? 'bg-navy text-white ring-2 ring-navy/30'
                          : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                      }`}>
                      <span className="font-bold flex-shrink-0">{n}</span>
                      <span className={sc.o_naep === n ? 'opacity-90' : ''}>{NAEP_LABELS[n]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Comprehension (only for D, E, F) */}
        {config && config.compQuestions > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-4">
            <h4 className="text-[13px] font-semibold text-navy mb-1">
              Comprehension <span className="text-text-tertiary font-normal">/{config.compMax}</span>
            </h4>
            <p className="text-[11px] text-text-secondary mb-2">Ask after reading. Passage turned over.</p>

            {/* Not-administered switch. A student stopped mid-passage never heard
                these questions -- recording zeros would read as "answered wrong". */}
            <label className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 mb-3 cursor-pointer border transition-all ${
              compNotAdministered
                ? 'bg-slate-100 border-slate-300'
                : 'bg-surface-alt/60 border-border hover:border-navy/30'
            }`}>
              <input type="checkbox" checked={compNotAdministered}
                onChange={() => handleToggleCompNotAdministered(student.id, sc)}
                className="w-4 h-4 mt-0.5 rounded border-2 border-navy/30 text-slate-600 focus:ring-slate-500 shrink-0" />
              <span>
                <span className="text-[11px] font-semibold text-text-primary flex items-center gap-1.5">
                  <Ban size={11} className="text-slate-500" />
                  Student struggled &mdash; comprehension not administered
                </span>
                <span className="block text-[10px] text-text-tertiary mt-0.5">
                  Check this when the student was stopped during the passage and never heard the questions.
                  Comprehension is then excluded from the score rather than counted as zero.
                </span>
              </span>
            </label>

            {!compNotAdministered && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              <p className="text-[9px] text-amber-800 font-semibold mb-1">Scoring Guide</p>
              <div className="flex gap-4 text-[9px] text-amber-700">
                <span><span className="font-bold text-red-600">0</span> = No response, wrong, or Korean only</span>
                <span><span className="font-bold text-amber-600">1</span> = Partial, vague, or incomplete in English</span>
                <span><span className="font-bold text-green-600">2</span> = Correct and reasonably complete in English</span>
              </div>
            </div>
            )}

            <div
              aria-disabled={compNotAdministered}
              className={`space-y-3 transition-opacity ${compNotAdministered ? 'opacity-40 pointer-events-none select-none' : ''}`}
            >
              {COMP_QUESTIONS[passageLevel]?.map((cq, qi) => {
                const key = `o_comp_q${qi + 1}` as keyof G1Scores
                const examples = COMP_SCORING_EXAMPLES[passageLevel]?.[qi]
                return (
                  <div key={qi}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-primary">
                          <span className="font-semibold text-navy">Q{qi + 1}</span>
                          <span className="text-text-tertiary ml-1 text-[10px]">[{cq.dok}]</span>
                          <span className="ml-2">{cq.q}</span>
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {[0, 1, 2].map(v => {
                          const titles = ['No response / wrong / Korean only', 'Partial or incomplete answer', 'Correct and complete']
                          return (
                            <button key={v} onClick={() => updateScore(student.id, key, (sc as any)[key] === v ? null : v)}
                              title={titles[v]}
                              className={`w-9 h-9 rounded-lg text-[12px] font-bold transition-all ${
                                (sc as any)[key] === v
                                  ? v === 0 ? 'bg-red-500 text-white' : v === 1 ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                                  : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                              }`}>
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {examples && (
                      <details className="ml-6 mt-1">
                        <summary className="text-[9px] text-purple-600 cursor-pointer hover:underline font-medium">Scoring examples</summary>
                        <div className="grid grid-cols-3 gap-2 mt-1.5 text-[9px]">
                          <div className="bg-red-50 rounded px-2 py-1.5"><span className="font-bold text-red-600">0:</span> <span className="text-red-800">{examples[0]}</span></div>
                          <div className="bg-amber-50 rounded px-2 py-1.5"><span className="font-bold text-amber-600">1:</span> <span className="text-amber-800">{examples[1]}</span></div>
                          <div className="bg-green-50 rounded px-2 py-1.5"><span className="font-bold text-green-600">2:</span> <span className="text-green-800">{examples[2]}</span></div>
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 5: Open Response -- compare the two pictures */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Open Response (Two Pictures)</h4>
          <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100 mb-2">
            <p className="text-[11px] font-semibold text-blue-800">Say: "{content.openResponse.say}"</p>
            {/* Kept directly under the script: this is the section where a
                student most often has nothing to give. */}
            <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
              {STOPPING_NOTES.map((n, i) => (
                <li key={i} className="text-[10px] text-blue-700/90 leading-snug">{n}</li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] text-text-tertiary mb-1"><span className="font-semibold text-text-secondary">On the page:</span> {content.openResponse.stimulus}</p>
          <p className="text-[11px] text-text-secondary mb-3">{content.openResponse.instructions}</p>

          <div className="space-y-1.5 mb-3">
            {content.openResponse.rubric.map(r => {
              const selected = sc.o_open_response === r.score
              return (
                <button key={r.score}
                  onClick={() => updateScore(student.id, 'o_open_response', selected ? null : r.score)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-xl text-left transition-all border ${
                    selected
                      ? 'bg-navy text-white border-navy ring-2 ring-navy/20'
                      : 'bg-surface text-text-secondary border-border hover:bg-surface-alt'
                  }`}>
                  <span className={`w-7 h-7 rounded-lg text-[13px] font-bold flex items-center justify-center shrink-0 ${
                    selected ? 'bg-white/20 text-white' : 'bg-navy/10 text-navy'
                  }`}>{r.score}</span>
                  <span className="min-w-0">
                    <span className={`block text-[12px] font-semibold ${selected ? '' : 'text-navy'}`}>{r.label}</span>
                    <span className={`block text-[10px] leading-snug ${selected ? 'opacity-85' : 'text-text-tertiary'}`}>{r.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="text-[11px] font-bold text-navy">
            Open Response: {sc.o_open_response ?? '--'} / {content.openResponse.max}
          </div>
        </div>

        {/* Section 6: Teacher judgment + notes */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Teacher Notes</h4>
          <p className="text-[11px] text-text-secondary mb-3">
            Anything worth remembering at the leveling meeting: reading behaviors, error patterns,
            how the student handled the session.
          </p>

          {/* Retention rating, on the tests that use it. From Fall 2026 the
              teacher signal is the Teacher Ratings phase instead, so nothing
              appears here. */}
          {content.teacherSignal === 'retention_rating' && (
            <div className="rounded-lg p-3 mb-3 bg-blue-50/60 border border-blue-200/60">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] text-text-secondary">
                  Within {student.english_class}, how is this student performing?
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-navy/10 text-navy font-semibold shrink-0">
                  Counts toward the composite
                </span>
              </div>
              <div className="flex gap-2">
                {([
                  { value: 'weak', label: 'Weak', desc: 'Struggling, may need extra support', color: 'bg-red-100 text-red-700 border-red-300', active: 'bg-red-500 text-white ring-2 ring-red-400' },
                  { value: 'core', label: 'Core', desc: 'Right where they should be', color: 'bg-gray-100 text-gray-700 border-gray-300', active: 'bg-gray-600 text-white ring-2 ring-gray-400' },
                  { value: 'strong', label: 'Strong', desc: 'Excelling, could move up', color: 'bg-green-100 text-green-700 border-green-300', active: 'bg-green-500 text-white ring-2 ring-green-400' },
                ] as const).map(opt => (
                  <button key={opt.value}
                    onClick={() => updateScore(student.id, 'wave2_retention_rating', sc.wave2_retention_rating === opt.value ? null : opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                      sc.wave2_retention_rating === opt.value ? opt.active + ' ring-offset-1' : opt.color
                    }`}>
                    <div className="font-bold">{opt.label}</div>
                    <div className="text-[9px] opacity-80 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {content.usesClassImpression && (
          <div className="rounded-lg p-3 mb-3 bg-blue-50/60 border border-blue-200/60">
            <p className="text-[11px] text-text-secondary mb-2">
              Which class do you think this student belongs in based on this oral test? Pick "Unsure" if you need the algorithm to decide.
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {ENGLISH_CLASSES.map(cls => (
                <button key={cls} onClick={() => updateScore(student.id, 'wave1_class_impression', sc.wave1_class_impression === cls ? null : cls)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    sc.wave1_class_impression === cls
                      ? 'text-white ring-2 ring-offset-1'
                      : 'border border-border hover:opacity-80'
                  }`}
                  style={sc.wave1_class_impression === cls
                    ? { backgroundColor: classToTextColor(cls), ringColor: classToTextColor(cls) }
                    : { backgroundColor: classToColor(cls), color: classToTextColor(cls) }
                  }>
                  {cls}
                </button>
              ))}
              <button onClick={() => updateScore(student.id, 'wave1_class_impression', sc.wave1_class_impression === 'Unsure' ? null : 'Unsure')}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  sc.wave1_class_impression === 'Unsure'
                    ? 'bg-gray-600 text-white ring-2 ring-gray-400 ring-offset-1'
                    : 'bg-gray-100 text-text-secondary border border-border hover:bg-gray-200'
                }`}>
                Unsure
              </button>
            </div>
          </div>
          )}

          <textarea
            value={sc.teacher_notes || ''}
            onChange={e => updateScore(student.id, 'teacher_notes', e.target.value)}
            placeholder="Optional notes about this student's performance..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-16"
          />
        </div>

        {/* Live Preview of Calculated Scores */}
        {(sc.o_passage_level || sc.o_alpha_names != null) && (
          <StudentScorePreview scores={sc} student={student} content={content} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// STUDENT SCORE PREVIEW (live calculation while entering)
// ============================================================================

function StudentScorePreview({ scores, student, content }: { scores: G1Scores; student: Student; content: G1Content }) {
  const metrics = calculateG1Composite(scores, content, student.english_class as EnglishClass)

  return (
    <div className="bg-gradient-to-br from-navy/5 to-navy/10 border border-navy/20 rounded-xl p-5 mb-4">
      <h4 className="text-[13px] font-semibold text-navy mb-3 flex items-center gap-2">
        <Eye size={14} /> Live Score Preview
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${metrics.wave === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {content.usesClassImpression
            ? (metrics.wave === 1 ? 'Wave 1: Oral + Teacher Impression' : 'Wave 2: 30% oral + 30% written + 40% teacher')
            : (metrics.wave === 1 ? 'Oral only -- written test not entered yet' : 'Complete: 55% oral + 45% written')}
        </span>
      </h4>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Written</p>
          <p className="text-[18px] font-bold text-navy">{Math.round(metrics.writtenPct)}%</p>
          {content.extendedWriting.scoring === 'in_total' && (
            <p className="text-[9px] text-text-tertiary">
              {metrics.writtenMC + (metrics.writingShort ?? 0) + metrics.writingBonus}/{g1WrittenTotalMax(content)} incl. writing
            </p>
          )}
        </div>
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Oral</p>
          <p className="text-[18px] font-bold text-navy">{Math.round(metrics.oralScore)}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Composite</p>
          <p className="text-[18px] font-bold text-navy">{Math.round(metrics.composite)}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Suggested</p>
          <p className="text-[14px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
            style={{ backgroundColor: classToColor(metrics.suggestedClass), color: classToTextColor(metrics.suggestedClass) }}>
            {metrics.suggestedClass}
          </p>
        </div>
      </div>

      {metrics.cwpm != null && (
        <div className="flex items-center gap-4 mb-3 text-[11px] flex-wrap">
          <span className="text-text-secondary">Passage {metrics.passageLevel}</span>
          <span className="text-navy font-semibold">Raw CWPM: {metrics.cwpm}</span>
          {metrics.accuracy != null && (
            <span className={metrics.accuracy >= 95 ? 'text-green-600' : metrics.accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}>
              Accuracy: <strong>{metrics.accuracy}%</strong>
            </span>
          )}
          {metrics.weightedCwpm != null && <span className="text-text-secondary">Weighted: {metrics.weightedCwpm}</span>}
          {metrics.compNotAdministered
            ? <span className="text-text-tertiary italic" title="Student was stopped during the passage; the questions were never asked.">Comp: not administered</span>
            : metrics.compTotal != null && <span className="text-text-secondary">Comp: {metrics.compTotal}/{metrics.compMax}</span>}
          {metrics.effectiveLevel !== metrics.passageLevel && (
            <span className="w-full text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Scored as level {metrics.effectiveLevel}. The student did not sustain level {metrics.passageLevel}
              {metrics.compNotAdministered ? ' — stopped before the end' : ''}
              {metrics.accuracy != null && metrics.accuracy < 90 ? ` — ${metrics.accuracy}% accuracy is below the 90% frustration threshold` : ''}.
              Consider re-testing at level {metrics.effectiveLevel}.
            </span>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-navy/10">
        <p className="text-[10px] font-semibold text-navy mb-2 uppercase tracking-wider">Standards Baseline</p>
        <div className="flex flex-wrap gap-1.5">
          {metrics.standardsBaseline.map(std => (
            <span key={std.code}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${
                std.met
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
              {std.met ? <CheckCircle2 size={10} /> : <Circle size={10} />}
              {std.code}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// RESULTS VIEW - All Students Summary + Placement
// ============================================================================

function ResultsView({ students, scores, levelTest, anecdotals }: {
  students: Student[]
  scores: Record<string, G1Scores>
  levelTest: LevelTest
  /** Teacher Ratings, keyed by student id. Empty on tests that predate them. */
  anecdotals?: Record<string, G1AnecdotalRating>
}) {
  const [sortBy, setSortBy] = useState<'composite' | 'name' | 'suggested'>('composite')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const content = g1ContentForTest(levelTest as any)
  const GRADE_1_QUESTIONS = content.written.questions
  const G1_QUESTION_SECTIONS = content.written.sectionKeys
  const WRITTEN_SECTIONS = content.written.sections
  const G1_WRITING_CATEGORIES = content.extendedWriting.categories
  const G1_WRITING_MAX = content.extendedWriting.max
  const G1_MC_MAX = content.written.mcMax
  const writingInTotal = content.extendedWriting.scoring === 'in_total'
  const writtenTotalMax = g1WrittenTotalMax(content)
  const G1_SECTION_LABELS: Record<string, string> = {}
  GRADE_1_QUESTIONS.forEach(q => { if (!G1_SECTION_LABELS[q.section]) G1_SECTION_LABELS[q.section] = q.domain })

  const rows = useMemo(() => {
    const tested = students.map(s => {
      const sc = scores[s.id] || {}
      const anec = anecdotals?.[s.id] ?? null
      const metrics = calculateG1Composite(sc, content, s.english_class as EnglishClass, anec)
      return {
        student: s,
        scores: sc,
        anecdotal: anec,
        ...metrics,
        // The absolute band keeps its own names so it stays readable beside
        // the placement that actually decides.
        absoluteComposite: metrics.composite,
        absoluteClass: metrics.suggestedClass,
        weighted: g1WeightedComposite(metrics, sc, content, anec),
      }
    }).filter(r => r.scores.o_passage_level || r.scores.w_letter_names != null || (r.scores.written_answers && Object.keys(r.scores.written_answers).length > 0))

    // Placement: rank the tested students by the weighted composite and cut
    // into six equal groups. A student with nothing to weight keeps the
    // absolute suggestion rather than being ranked on a fabricated number.
    const rankable = tested.filter(r => r.weighted != null)
    const ordered = [...rankable].sort((a, b) => (a.weighted as number) - (b.weighted as number))
    const placement = new Map<string, EnglishClass>()
    ordered.forEach((r, idx) => placement.set(r.student.id, g1ClassFromRank(idx, ordered.length)))

    return tested.map(r => ({
      ...r,
      suggestedClass: placement.get(r.student.id) ?? r.absoluteClass,
      percentile: r.weighted != null && ordered.length > 1
        ? ordered.findIndex(o => o.student.id === r.student.id) / (ordered.length - 1)
        : null,
    })).sort((a, b) => {
      if (sortBy === 'composite') return (b.weighted ?? -1) - (a.weighted ?? -1)
      if (sortBy === 'name') return a.student.english_name.localeCompare(b.student.english_name)
      if (sortBy === 'suggested') {
        const ai = ENGLISH_CLASSES.indexOf(a.suggestedClass)
        const bi = ENGLISH_CLASSES.indexOf(b.suggestedClass)
        return ai !== bi ? ai - bi : (b.weighted ?? -1) - (a.weighted ?? -1)
      }
      return 0
    })
  }, [students, scores, sortBy, content, anecdotals])

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    ENGLISH_CLASSES.forEach(c => counts[c] = 0)
    rows.forEach(r => counts[r.suggestedClass] = (counts[r.suggestedClass] || 0) + 1)
    return counts
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="px-10 py-12 text-center">
        <p className="text-text-tertiary">
          {content.administration === 'single_sitting'
            ? 'No scores entered yet. Enter the Oral test or the Written test first.'
            : 'No scores entered yet. Complete the Oral test (Wave 1) or Written test (Wave 2) first.'}
        </p>
      </div>
    )
  }

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-navy">Results & Suggested Placement</h3>
          <p className="text-[12px] text-text-secondary mt-1">
            {rows.length} students scored.{' '}
            {content.usesClassImpression
              ? 'Wave 1 = 50% oral + 50% teacher impression. Wave 2 = 30% oral + 30% written + 40% teacher ratings.'
              : `Students with oral data only are scored on the oral test alone until the written test is entered; complete records use 55% oral + 45% written, where the written score is all ${g1WrittenTotalMax(content)} points including writing.`}
          </p>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-border rounded-lg text-[12px] bg-surface">
          <option value="composite">Sort by Composite (high to low)</option>
          <option value="name">Sort by Name</option>
          <option value="suggested">Sort by Suggested Class</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <p className="text-[11px] font-semibold text-text-secondary mb-2 uppercase tracking-wider">Suggested Class Distribution</p>
        <div className="flex gap-2">
          {ENGLISH_CLASSES.map(cls => (
            <div key={cls} className="flex-1 text-center">
              <div className="text-[18px] font-bold" style={{ color: classToColor(cls) }}>{classCounts[cls]}</div>
              <div className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                {cls}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-tertiary mt-3 leading-relaxed">
          Placement ranks students on the weighted composite (40% oral, 15% MC, 35% writing, 10% Teacher Ratings,
          rescaled when a part is missing) and cuts the grade into six equal groups &mdash; the same rule grades 2&ndash;5 use.
          Because the groups are forced equal, some movement is guaranteed regardless of ability.
          The <strong>Band</strong> column is the absolute score from the passage the student sustained; it is reference
          only, and where it disagrees with the placement the row says so.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-alt">
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">#</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Student</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Passage</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">MC<br/>/{G1_MC_MAX}</th>
              {content.shortWriting && <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Short<br/>/{content.shortWriting.max}</th>}
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
                {writingInTotal ? 'Writing' : 'Wr Bonus'}<br/>/{G1_WRITING_MAX}
              </th>
              {writingInTotal && <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-navy font-semibold">Written<br/>/{writtenTotalMax}</th>}
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">CWPM</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Comp</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Oral</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-navy font-bold"
                title="Weighted composite: 40% oral + 15% MC + 35% writing + 10% teacher rating, rescaled when a part is missing. This is what placement ranks on.">Composite</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold"
                title="Absolute band from the passage the student sustained. Reference only -- it does not decide placement.">Band<br/><span className="normal-case">(ref)</span></th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Suggested</th>
              {content.usesClassImpression && <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Impression</th>}
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold"
                title="Average of the four Teacher Ratings dimensions, on the 1-4 scale every grade uses.">
                {content.teacherSignal === 'anecdotal_ratings' ? 'Teacher' : 'Retention'}
              </th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Standards</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const mcScore = row.writtenMC
              const wrBonus = row.writingBonus
              const metCount = row.standardsBaseline.filter(s => s.met).length
              const expanded = expandedStudent === row.student.id

              return (<>
                <tr key={row.student.id}
                  onClick={() => setExpandedStudent(expanded ? null : row.student.id)}
                  className={`border-t border-border cursor-pointer transition-colors ${idx % 2 === 0 ? '' : 'bg-surface-alt/30'} hover:bg-blue-50/50`}>
                  <td className="px-4 py-2.5 text-text-tertiary">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ backgroundColor: classToColor(row.student.english_class as EnglishClass), color: classToTextColor(row.student.english_class as EnglishClass) }}>
                        {row.student.english_class.slice(0, 3)}
                      </span>
                      <span className="font-medium text-navy">{row.student.english_name}</span>
                      <span className="text-text-tertiary">{row.student.korean_name}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <span className="font-bold text-navy">{row.passageLevel}</span>
                  </td>
                  <td className="text-center px-3 py-2.5">{mcScore}</td>
                  {content.shortWriting && <td className="text-center px-3 py-2.5">{row.writingShort ?? '--'}</td>}
                  <td className="text-center px-3 py-2.5">{wrBonus > 0 ? wrBonus : '--'}</td>
                  {writingInTotal && (
                    <td className="text-center px-3 py-2.5 font-semibold text-navy">
                      {mcScore + (row.writingShort ?? 0) + wrBonus}
                    </td>
                  )}
                  <td className="text-center px-3 py-2.5">{row.cwpm ?? '--'}</td>
                  <td className="text-center px-3 py-2.5">
                    {row.compNotAdministered
                      ? <span className="text-text-tertiary italic text-[10px]" title="Not administered — student was stopped during the passage.">n/a</span>
                      : row.compTotal != null ? `${row.compTotal}/${row.compMax}` : '--'}
                  </td>
                  <td className="text-center px-3 py-2.5">{Math.round(row.oralScore)}</td>
                  <td className="text-center px-3 py-2.5">
                    {row.weighted != null ? (
                      <span className={`text-[13px] font-bold ${
                        row.weighted >= 0.70 ? 'text-green-600' : row.weighted >= 0.40 ? 'text-amber-600' : 'text-red-600'
                      }`}>{Math.round(row.weighted * 100)}</span>
                    ) : <span className="text-text-tertiary text-[10px]">--</span>}
                  </td>
                  {/* Absolute band, kept beside the placement as the reference
                      for why a student reads where they do. */}
                  <td className="text-center px-3 py-2.5">
                    <span className="text-[10px] text-text-tertiary">{Math.round(row.absoluteComposite)}</span>
                    <span className="block text-[9px] text-text-tertiary opacity-70">{row.absoluteClass}</span>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: classToColor(row.suggestedClass), color: classToTextColor(row.suggestedClass) }}>
                      {row.suggestedClass}
                    </span>
                    {row.suggestedClass !== row.absoluteClass && (
                      <span className="block text-[8px] text-amber-600 mt-0.5" title="The rank-based placement and the absolute band disagree for this student.">differs from band</span>
                    )}
                  </td>
                  {content.usesClassImpression && (
                  <td className="text-center px-3 py-2.5">
                    {(row.scores.wave2_class_impression || row.scores.wave1_class_impression) ? (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row.scores.wave2_class_impression ? 'border-2 border-navy' : 'border-2 border-amber-300 opacity-60'}`}
                        style={{ backgroundColor: classToColor((row.scores.wave2_class_impression || row.scores.wave1_class_impression) as EnglishClass), color: classToTextColor((row.scores.wave2_class_impression || row.scores.wave1_class_impression) as EnglishClass) }}>
                        {row.scores.wave2_class_impression || row.scores.wave1_class_impression}
                        {!row.scores.wave2_class_impression && <span className="text-[8px] ml-0.5">(W1)</span>}
                      </span>
                    ) : <span className="text-text-tertiary text-[10px]">--</span>}
                  </td>
                  )}
                  <td className="text-center px-3 py-2.5">
                    {content.teacherSignal === 'anecdotal_ratings' ? (() => {
                      const a = row.anecdotal
                      const vals = a ? [a.receptive_language, a.productive_language, a.engagement_pace, a.placement_recommendation].filter(v => v != null) as number[] : []
                      if (vals.length === 0) return <span className="text-text-tertiary text-[10px]">--</span>
                      const avg = vals.reduce((x, y) => x + y, 0) / vals.length
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          avg >= 3.5 ? 'bg-green-100 text-green-700' :
                          avg >= 2.5 ? 'bg-blue-100 text-blue-700' :
                          avg >= 1.5 ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                        }`} title={`${vals.length} of 4 dimensions rated`}>
                          {avg.toFixed(1)}
                        </span>
                      )
                    })() : row.scores.wave2_retention_rating ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.scores.wave2_retention_rating === 'strong' ? 'bg-green-100 text-green-700' :
                        row.scores.wave2_retention_rating === 'weak' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {row.scores.wave2_retention_rating}
                      </span>
                    ) : <span className="text-text-tertiary text-[10px]">--</span>}
                  </td>
                  <td className="text-center px-3 py-2.5 relative group">
                    <span className={`text-[11px] font-medium cursor-help ${metCount >= 8 ? 'text-green-600' : metCount >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {metCount}/{row.standardsBaseline.length}
                    </span>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white border border-border rounded-xl shadow-xl p-3 z-50 text-left">
                      <p className="text-[10px] font-bold text-navy mb-1.5">Standards Baseline</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {row.standardsBaseline.map((std: any) => (
                          <div key={std.code} className="flex items-center gap-1.5 text-[9px]">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${std.met ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className={`font-semibold ${std.met ? 'text-green-700' : 'text-red-600'}`}>{std.code}</span>
                            <span className="text-text-tertiary">{std.score}/{std.threshold}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={13} className="px-4 py-4 bg-blue-50/50 border-t border-blue-200">
                      <div className="max-w-5xl">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-[13px] font-bold text-navy">Leveling Dossier: {row.student.english_name}</h4>
                          <span className="text-[10px] text-text-tertiary">{row.student.korean_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: classToColor(row.student.english_class as EnglishClass), color: classToTextColor(row.student.english_class as EnglishClass) }}>
                            Current: {row.student.english_class}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-1"
                            style={{ backgroundColor: classToColor(row.suggestedClass), color: classToTextColor(row.suggestedClass) }}>
                            Suggested: {row.suggestedClass}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Written MC ({mcScore}/{G1_MC_MAX})</p>
                            {row.scores.written_answers && Object.keys(row.scores.written_answers).length > 0 ? (
                              <>
                                {G1_QUESTION_SECTIONS.map(sec => {
                                  const qs = GRADE_1_QUESTIONS.filter(q => q.section === sec)
                                  const correct = qs.reduce((sum, q) => sum + (row.scores.written_answers![q.qNum] === q.correct ? 1 : 0), 0)
                                  const pct = qs.length > 0 ? (correct / qs.length) * 100 : 0
                                  return (
                                    <div key={sec} className="flex items-center justify-between text-[10px] py-0.5">
                                      <span className="text-text-secondary">{G1_SECTION_LABELS[sec]}</span>
                                      <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{correct}/{qs.length}</span>
                                    </div>
                                  )
                                })}
                              </>
                            ) : (
                              <>
                                {WRITTEN_SECTIONS.filter(s => s.key !== 'w_writing').map(sec => {
                                  const val = (row.scores as any)[sec.key] ?? 0
                                  const pct = sec.max > 0 ? (val / sec.max) * 100 : 0
                                  return (
                                    <div key={sec.key} className="flex items-center justify-between text-[10px] py-0.5">
                                      <span className="text-text-secondary">{sec.label}</span>
                                      <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{val}/{sec.max}</span>
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </div>
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Star size={10} /> {writingInTotal ? 'Extended Writing' : 'Writing Bonus'} ({wrBonus}/{G1_WRITING_MAX})</p>
                            {row.scores.written_rubric && Object.keys(row.scores.written_rubric).length > 0 ? (
                              G1_WRITING_CATEGORIES.map(cat => {
                                const val = row.scores.written_rubric![cat.key] ?? 0
                                return (
                                  <div key={cat.key} className="flex items-center justify-between text-[10px] py-0.5">
                                    <span className="text-text-secondary">{cat.label}</span>
                                    <span className={`font-bold ${val >= 4 ? 'text-green-600' : val >= 2 ? 'text-amber-600' : val > 0 ? 'text-red-500' : 'text-text-tertiary'}`}>{val}/{cat.max}</span>
                                  </div>
                                )
                              })
                            ) : (
                              <div className="text-[10px] text-text-tertiary">No writing rubric data</div>
                            )}
                          </div>
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Oral / Reading</p>
                            <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between"><span className="text-text-secondary">Passage Level</span><span className="font-bold text-navy">{row.passageLevel}</span></div>
                              <div className="flex justify-between"><span className="text-text-secondary">CWPM</span><span className="font-bold">{row.cwpm ?? '--'}</span></div>
                              <div className="flex justify-between"><span className="text-text-secondary">Comprehension</span><span className={row.compNotAdministered ? 'text-text-tertiary italic' : 'font-bold'}>{row.compNotAdministered ? 'not administered' : row.compTotal != null ? `${row.compTotal}/${row.compMax}` : '--'}</span></div>
                              <div className="flex justify-between"><span className="text-text-secondary">Oral Score</span><span className="font-bold">{Math.round(row.oralScore)}</span></div>
                              <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-text-secondary font-semibold">Composite</span><span className={`font-extrabold text-[12px] ${row.composite >= 70 ? 'text-green-600' : row.composite >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(row.composite)}</span></div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Standards ({metCount}/{row.standardsBaseline.length} met)</p>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                              {row.standardsBaseline.map((std: any) => (
                                <div key={std.code} className="flex items-center gap-1.5 text-[9px]">
                                  <span className={`text-[10px] ${std.met ? 'text-green-600' : 'text-red-500'}`}>{std.met ? 'Met' : 'X'}</span>
                                  <span className="font-semibold text-navy">{std.code}</span>
                                  <span className="text-text-tertiary ml-auto">{std.score}/{std.threshold}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>)
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-surface border border-border rounded-xl p-5">
        <h4 className="text-[12px] font-semibold text-navy mb-3">Placement Band Descriptions</h4>
        <div className="grid grid-cols-3 gap-3">
          {([
            ['Lily', 'Pre-reader / minimal English. Passage A. Building letter recognition.'],
            ['Camellia', 'Emerging letter knowledge, some sight words. Passage A-B.'],
            ['Daisy', 'Solid letter knowledge, beginning reader. Passage B-C.'],
            ['Sunflower', 'Reading simple connected text. Passage C-D.'],
            ['Marigold', 'Reading with developing fluency. Passage D-E. CWPM 15-35.'],
            ['Snapdragon', 'Fluent reader, strong comprehension. Passage E-F. CWPM 30+.'],
          ] as [EnglishClass, string][]).map(([cls, desc]) => (
            <div key={cls} className="flex items-start gap-2 text-[11px]">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                {cls}
              </span>
              <span className="text-text-secondary">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// EXPORTS for use in LevelingView
// ============================================================================

export default Grade1ScoreEntry
export { calculateG1Composite, suggestG1Class, ResultsView as G1ResultsView, NAEP_MULTIPLIERS }
export type { G1Scores, PassageLevel }
