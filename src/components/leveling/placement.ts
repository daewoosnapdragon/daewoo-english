// ─── Placement maths ─────────────────────────────────────────────────
// Shared, so the Results tab and the analysis page cannot answer "where does
// this child go" two different ways. They did: one ranked on the composite and
// cut the grade into sextiles, the other read the Band's absolute class cut,
// and the two agreed only by accident -- and would have drifted apart the
// moment the written papers were marked, since the composite moves with them
// and the Band does not.
//
// Nothing here writes. Placement is decided by these functions and persisted
// where calcAuto's result is saved.

import { Student, EnglishClass } from '@/types'
import {
  compRatioForComposite, capComponent, compositeWeightsFor, DECODING_WEIGHTS,
  IMPLAUSIBLE_CWPM, IMPLAUSIBLE_READ_SECONDS, type CompositeTerm, type CompositeWeights,
} from '@/lib/utils'
import {
  calculateG2Band, bandScalesFromG2, bandScalesFromG3, bandScalesFromG4, bandScalesFromG5,
  type LevelCwpmNorm,
} from '@/components/leveling/grade2Band'
import { getG2Content, g2VersionKeyForTest } from '@/components/leveling/grade2Content'
import { getG3Content, g3VersionKeyForTest } from '@/components/leveling/grade3Content'
import { getG4Content, g4VersionKeyForTest } from '@/components/leveling/grade4Content'
import { getG5Content, g5VersionKeyForTest } from '@/components/leveling/grade5Content'

// Written MC total — update here when test format changes
// Written MC total varies by grade: G2=25, G3=21, G4=28, G5=20
/**
 * Points available on the written multiple choice.
 *
 * Grade 1's total is version-dependent (25 on the original test, 19 from Fall
 * 2026), so it is recorded on each score as calculated_metrics.written_mc_max.
 * Pass that in wherever it is to hand; the grade fallback is only for records
 * saved before the field existed.
 */
export function getWrittenMcTotal(grade: number | string, storedMax?: number | null): number {
  if (storedMax != null && storedMax > 0) return storedMax
  // DOK-weighted: DOK1=1pt, DOK2+=2pt
  const g = Number(grade)
  if (g === 1) return 25 // original Grade 1 test; Fall 2026 onward supplies storedMax
  if (g === 2) return 32; if (g === 3) return 26; if (g === 4) return 40; if (g === 5) return 37
  return 26 // fallback
}

// Minimal grade config for recalculating adjusted MC from per-question answers
// This mirrors WrittenTestEntry's question data but only needs qNum, correct, dok
/** Both grade modules key versions the same way; either resolver will do. */
export function versionKeyForTest(test: { academic_year?: string | null; semester?: string | null; grade?: number | string }): string {
  const g = Number((test as any).grade)
  if (g === 3) return g3VersionKeyForTest(test as any)
  if (g === 4) return g4VersionKeyForTest(test as any)
  if (g === 5) return g5VersionKeyForTest(test as any)
  return g2VersionKeyForTest(test as any)
}

export function getGradeConfigForComposite(grade: number, versionKey?: string): { questions: { qNum: number; correct: string; dok: number }[]; dokWeighted: boolean } | null {
  // Grade 2 from Fall 2026 on is authored in grade2Content.ts and scores flat
  // (one point per item), so the key and the weighting both come from there.
  if (grade === 2 && versionKey) {
    const g2 = getG2Content(versionKey)
    if (g2) {
      return {
        questions: g2.written.questions.map(q => ({ qNum: q.qNum, correct: q.correct, dok: q.dok ?? 1 })),
        dokWeighted: false,
      }
    }
  }
  // Grade 2: 25 questions
  if (grade === 2) return { dokWeighted: true, questions: [
    {qNum:1,correct:'b',dok:2},{qNum:2,correct:'b',dok:1},{qNum:3,correct:'d',dok:2},{qNum:4,correct:'a',dok:1},{qNum:5,correct:'a',dok:2},
    {qNum:6,correct:'a',dok:2},{qNum:7,correct:'d',dok:2},{qNum:8,correct:'c',dok:1},{qNum:9,correct:'b',dok:1},
    {qNum:10,correct:'b',dok:2},{qNum:11,correct:'c',dok:1},{qNum:12,correct:'d',dok:1},{qNum:13,correct:'b',dok:2},{qNum:14,correct:'c',dok:1},{qNum:15,correct:'c',dok:1},
    {qNum:16,correct:'a',dok:1},{qNum:17,correct:'b',dok:1},{qNum:18,correct:'a',dok:1},{qNum:19,correct:'b',dok:1},{qNum:20,correct:'c',dok:1},
    {qNum:21,correct:'a',dok:1},{qNum:22,correct:'d',dok:1},{qNum:23,correct:'b',dok:1},{qNum:24,correct:'c',dok:1},{qNum:25,correct:'a',dok:1},
  ]}
  if (grade === 3 && versionKey) {
    const g3 = getG3Content(versionKey)
    if (g3) {
      return {
        questions: g3.written.questions.map(q => ({ qNum: q.qNum, correct: q.correct, dok: q.dok ?? 1 })),
        dokWeighted: false,
      }
    }
  }
  // Grade 3: 21 questions
  if (grade === 3) return { dokWeighted: true, questions: [
    {qNum:1,correct:'d',dok:1},{qNum:2,correct:'a',dok:1},{qNum:3,correct:'d',dok:1},{qNum:4,correct:'b',dok:2},{qNum:5,correct:'b',dok:2},
    {qNum:6,correct:'b',dok:1},{qNum:7,correct:'d',dok:1},{qNum:8,correct:'b',dok:1},{qNum:9,correct:'a',dok:1},{qNum:10,correct:'d',dok:1},{qNum:11,correct:'b',dok:1},{qNum:12,correct:'d',dok:1},{qNum:13,correct:'c',dok:1},
    {qNum:14,correct:'d',dok:1},{qNum:15,correct:'b',dok:1},{qNum:16,correct:'c',dok:2},
    {qNum:17,correct:'b',dok:1},{qNum:18,correct:'c',dok:1},{qNum:19,correct:'d',dok:1},{qNum:20,correct:'c',dok:2},{qNum:21,correct:'b',dok:3},
  ]}
  if (grade === 4 && versionKey) {
    const g4 = getG4Content(versionKey)
    if (g4) {
      return {
        questions: g4.written.questions.map(q => ({ qNum: q.qNum, correct: q.correct, dok: q.dok ?? 1 })),
        dokWeighted: false,
      }
    }
  }
  // Grade 4: 28 questions
  if (grade === 4) return { dokWeighted: true, questions: [
    {qNum:1,correct:'b',dok:2},{qNum:2,correct:'c',dok:1},{qNum:3,correct:'a',dok:1},{qNum:4,correct:'c',dok:2},{qNum:5,correct:'d',dok:2},
    {qNum:6,correct:'b',dok:1},{qNum:7,correct:'c',dok:2},{qNum:8,correct:'b',dok:3},{qNum:9,correct:'c',dok:2},{qNum:10,correct:'b',dok:2},{qNum:11,correct:'a',dok:2},
    {qNum:12,correct:'c',dok:1},{qNum:13,correct:'a',dok:1},{qNum:14,correct:'c',dok:1},{qNum:15,correct:'a',dok:1},{qNum:16,correct:'b',dok:1},{qNum:17,correct:'a',dok:1},
    {qNum:18,correct:'c',dok:1},{qNum:19,correct:'c',dok:2},{qNum:20,correct:'b',dok:2},{qNum:21,correct:'b',dok:2},{qNum:22,correct:'a',dok:2},
    {qNum:23,correct:'b',dok:1},{qNum:24,correct:'a',dok:1},{qNum:25,correct:'d',dok:1},{qNum:26,correct:'b',dok:1},{qNum:27,correct:'a',dok:1},{qNum:28,correct:'d',dok:1},
  ]}
  if (grade === 5 && versionKey) {
    const g5 = getG5Content(versionKey)
    if (g5) {
      return {
        questions: g5.written.questions.map(q => ({ qNum: q.qNum, correct: q.correct, dok: q.dok ?? 1 })),
        dokWeighted: false,
      }
    }
  }
  // Grade 5: 25 questions
  if (grade === 5) return { dokWeighted: true, questions: [
    {qNum:1,correct:'c',dok:1},{qNum:2,correct:'d',dok:2},{qNum:3,correct:'b',dok:2},{qNum:4,correct:'b',dok:2},{qNum:5,correct:'d',dok:2},
    {qNum:6,correct:'d',dok:1},{qNum:7,correct:'a',dok:1},{qNum:8,correct:'b',dok:1},{qNum:9,correct:'c',dok:1},
    {qNum:10,correct:'a',dok:1},{qNum:11,correct:'b',dok:1},{qNum:12,correct:'b',dok:1},{qNum:13,correct:'d',dok:1},{qNum:14,correct:'d',dok:1},{qNum:15,correct:'b',dok:1},
    {qNum:16,correct:'a',dok:2},{qNum:17,correct:'d',dok:2},{qNum:18,correct:'c',dok:1},{qNum:19,correct:'c',dok:2},{qNum:20,correct:'c',dok:3},
    {qNum:21,correct:'b',dok:2},{qNum:22,correct:'c',dok:2},{qNum:23,correct:'c',dok:1},{qNum:24,correct:'b',dok:2},{qNum:25,correct:'b',dok:3},
  ]}
  return null
}

/** Weighted mean over the parts that exist, renormalized to their own total. */
export function weightedMean(parts: { score: number | null; weight: number }[]): number | null {
  const present = parts.filter(p => p.score != null) as { score: number; weight: number }[]
  if (present.length === 0) return null
  const total = present.reduce((sum, p) => sum + p.weight, 0)
  if (total <= 0) return present.reduce((sum, p) => sum + p.score, 0) / present.length
  return present.reduce((sum, p) => sum + p.score * (p.weight / total), 0)
}

/**
 * Has this student sat any part of the test?
 *
 * Rank, percentile and suggested class need at least one measured component.
 * Teacher Ratings no longer feed the composite at all (see COMPOSITE_WEIGHTS),
 * so a student who has only been rated has nothing to be ranked on -- without
 * this check they would sort on the 0.5 placeholder and land mid-grade.
 */
export function isTestedRow(terms: Partial<Record<CompositeTerm, number | null>>): boolean {
  return Object.values(terms).some(v => v != null)
}

/**
 * Blend the term scores a student has under the weights their grade uses.
 *
 * A term the grade's table does not list is skipped outright rather than
 * carried at weight 0 -- otherwise a stray score from a section the grade does
 * not really have could drag a composite toward zero. Terms the grade does have
 * but the student is missing renormalize, exactly as before.
 */
export function compositeFrom(
  terms: Partial<Record<CompositeTerm, number | null>>,
  weights: CompositeWeights,
): number | null {
  return weightedMean((Object.keys(weights) as CompositeTerm[])
    .filter(k => (weights[k] ?? 0) > 0)
    .map(k => ({ score: terms[k] ?? null, weight: weights[k] as number })))
}

/**
 * Median raw CWPM per passage level, over the students who actually sustained
 * that level. Reliability uses the same gate as the outlier flags: at least
 * three readers at the level, and at least half of those who attempted it, so a
 * median is never built from one or two children.
 */
export function buildLevelCwpmNorms(students: Student[], scores: Record<string, any>): Record<string, LevelCwpmNorm> {
  const byLevel: Record<string, number[]> = {}
  students.forEach(s => {
    const calc = scores[s.id]?.calculated_metrics || {}
    const lv = calc.passage_level
    const raw = calc.cwpm
    if (!lv || raw == null || raw <= 0) return
    if (!byLevel[lv]) byLevel[lv] = []
    byLevel[lv].push(raw)
  })
  const out: Record<string, LevelCwpmNorm> = {}
  Object.entries(byLevel).forEach(([lv, vals]) => {
    const v = [...vals].sort((a, b) => a - b)
    const mid = Math.floor(v.length / 2)
    out[lv] = {
      medianCwpm: v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2,
      reliable: v.length >= 3,
    }
  })
  return out
}

export function computeRow(s: Student, scores: Record<string, any>, anecdotals: Record<string, any>, benchmarks: Record<string, any>, semGrades: Record<string, any[]>, grade: number | string, excludedQuestions?: number[], versionKey?: string, customWeights?: CompositeWeights, levelCwpmNorms?: Record<string, LevelCwpmNorm>) {
  const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}; const bench = benchmarks[s.english_class] || {}; const anec = anecdotals[s.id] || {}; const grades = semGrades[s.id] || []
  const gradeMcTotal = getWrittenMcTotal(grade, calc.written_mc_max)
  // CWPM: prefer best_weighted_cwpm (highest across all passage attempts), then weighted_cwpm, then raw
  // Oral uses a SHARED grade-wide benchmark (Snapdragon cwpm_end) so all students are
  // compared on the same absolute scale — just like writing (/20) and MC (/total).
  // Using per-class benchmarks was causing lower-class students who slightly exceed their
  // easy benchmark to outscore higher-class students who are objectively much stronger.
  // ── What the table shows is the stopwatch number ──
  // The column used to show best_weighted_cwpm: raw rate multiplied by passage
  // difficulty AND by the NAEP rating, so a child clocked at 180 on level E
  // with NAEP 4 printed as 297. That is not a reading rate, and it sat under a
  // heading that read like one. Difficulty now enters the score once, at the
  // band floor, so the display no longer has any reason to carry it.
  const rawCwpmValue = calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null
  // The teacher declared the oral session over, whatever it produced.
  const oralComplete = !!(sc.oral_complete || sc.o_test_complete)
  const adjustedCwpm = calc.best_weighted_cwpm ?? calc.weighted_cwpm ?? null
  // The passage the rate was actually clocked on, which is also the passage the
  // band scores. best_passage_level belongs to the old best-attempt logic and
  // could disagree with both.
  const oralPassageLevel = calc.passage_level ?? null
  const otherAttempts = Array.isArray(sc.passages_attempted) ? sc.passages_attempted.length : 0
  // Use the highest class benchmark (Snapdragon) as the shared reference for the grade
  const snapBench = benchmarks['Snapdragon'] || {}
  const sharedCwpmEnd = snapBench.cwpm_end > 0 ? snapBench.cwpm_end : (bench.cwpm_end > 0 ? bench.cwpm_end : 0)
  // Capped at the ceiling every component shares -- see COMPONENT_CAP. Exceeding
  // the benchmark is real and should show, but uncapped ratios distort the composite.
  const cwpmRatio = rawCwpmValue != null && sharedCwpmEnd > 0 ? capComponent(rawCwpmValue / sharedCwpmEnd) : null
  // Written test: ALL students take the SAME test, so use raw % of max possible (not class benchmarks)
  // This ensures cross-class comparability — a 20/40 MC is 50% regardless of which class the student is in
  const writingRatio = sc.writing != null ? capComponent(sc.writing / 20) : null

  // ── Adjusted MC: recalculate excluding bad questions ──
  const excluded = excludedQuestions && excludedQuestions.length > 0 ? new Set(excludedQuestions) : null
  let mcPct: number | null = null
  let adjMcScore: number | null = null
  let adjMcMax: number | null = null
  if (excluded && sc.written_answers && typeof sc.written_answers === 'object') {
    // Recalculate from per-question answers
    const gradeConfig = getGradeConfigForComposite(Number(grade), versionKey)
    if (gradeConfig) {
      let adjCorrect = 0
      let adjMax = 0
      gradeConfig.questions.forEach((q: any) => {
        if (excluded.has(q.qNum)) return
        const w = gradeConfig.dokWeighted && q.dok >= 2 ? 2 : 1
        adjMax += w
        if (sc.written_answers[q.qNum] === q.correct) adjCorrect += w
      })
      adjMcScore = adjCorrect
      adjMcMax = adjMax
      mcPct = adjMax > 0 ? capComponent(adjCorrect / adjMax) : null
    } else {
      mcPct = sc.written_mc != null ? capComponent(sc.written_mc / gradeMcTotal) : null
    }
  } else {
    mcPct = sc.written_mc != null ? capComponent(sc.written_mc / gradeMcTotal) : null
  }

  const wrAcc = sc.word_reading_correct != null && sc.word_reading_attempted > 0 ? capComponent(sc.word_reading_correct / sc.word_reading_attempted) : null
  // Comprehension: comp_total / comp_max. A scored 0 counts. "Not scored yet"
  // carries nothing. "Not administered" is scored at the top of the Frustration
  // band rather than dropped -- see compRatioForComposite.
  const compRatio = compRatioForComposite(calc)
  const compUnmeasured = !!calc.comp_not_administered
  // Grade 2 only: phonics / 25 and sentences / 35
  const studentGrade = Number(s.grade)
  // The Fall 2026 sentence set is 36 points, not the legacy 35, and a future
  // version may move again -- so read the max off the score where the oral
  // screen recorded it, and only fall back to the legacy totals for records
  // saved before it did.
  const phonicsRatio = studentGrade === 2 && calc.phonics_total != null && calc.phonics_total > 0 ? capComponent(calc.phonics_total / (calc.phonics_max || 25)) : null
  const sentRatio = studentGrade === 2 && calc.sentence_total != null && calc.sentence_total > 0 ? capComponent(calc.sentence_total / (calc.sentence_max || 35)) : null
  const testRatios = [cwpmRatio, writingRatio, mcPct, wrAcc, compRatio, phonicsRatio, sentRatio].filter(v => v != null) as number[]
  const testScore = testRatios.length > 0 ? testRatios.reduce((a, b) => a + b, 0) / testRatios.length : 0.5
  // Oral term = the band, 0-100 rescaled to 0-1. Set below, once the band has
  // been computed. Ratios of rate and comprehension no longer feed the
  // composite at all: they were being passage-weighted a second time on top of
  // a benchmark that was not, which pushed nearly every competent reader past
  // the old 1.2 ceiling and left the whole top of the grade tied there.
  let oralScore: number | null = null
  // Decoding: Grade 2's phonics grid and sentence set. These used to be averaged
  // into the MC term, which had two effects nobody chose -- each was worth 5% of
  // the composite, and a student who missed one section silently reweighted the
  // others. They are their own term now, on explicit weights.
  const decodingScore = weightedMean([
    { score: phonicsRatio, weight: DECODING_WEIGHTS.phonics },
    { score: sentRatio, weight: DECODING_WEIGHTS.sentences },
  ])
  // MC is the written multiple choice and nothing else, in every grade.
  const mcScore = mcPct
  // The short constructed response on the Grade 3 and 5 papers. Teachers have
  // always scored it; until now nothing read it.
  const shortWritingScore = calc.short_writing_total != null && calc.short_writing_max > 0
    ? capComponent(calc.short_writing_total / calc.short_writing_max)
    : null
  const writingRubricScore = writingRatio // already null if no data (raw / 20)
  // Grade average: still computed for display in hover card, but NOT included in composite
  const gv = grades.filter((g: any) => g.score != null && (g.semester_name?.toLowerCase().includes('fall') || g.semesters?.name?.toLowerCase().includes('fall') || g.semesters?.type?.startsWith('fall'))); const gradeScore = gv.length > 0 ? gv.reduce((sum: number, g: any) => sum + g.score, 0) / gv.length / 100 : null
  // A student nobody rated carries no teacher signal at all -- its 10% is
  // redistributed below rather than filled in with a middling guess. Some
  // teachers are new and have rated no one; their students must not be pulled
  // toward the middle for it. The 0.5 here is never blended into a composite,
  // only a placeholder for the unrated case, so read `hasAnec` before showing
  // it anywhere.
  const av = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation].filter((v: any) => v != null) as number[]
  const anecScore = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / (av.length * 4) : 0.5
  // Composite: test evidence only -- see COMPOSITE_WEIGHTS. When a component is
  // missing, its weight is redistributed proportionally among the rest.
  const hasAnec = av.length > 0
  const hasGrades = gradeScore != null
  const gScore = gradeScore ?? 0.5
  // The band: floor and ceiling from the passage sustained, position inside it
  // from the passage-relative measures. Null for a student with no passage,
  // who therefore has no oral evidence to be scored on.
  const g2 = studentGrade === 2 && versionKey ? getG2Content(versionKey) : null
  const g3 = studentGrade === 3 && versionKey ? getG3Content(versionKey) : null
  const g4 = studentGrade === 4 && versionKey ? getG4Content(versionKey) : null
  const g5 = studentGrade === 5 && versionKey ? getG5Content(versionKey) : null
  const bandScales = g2 ? bandScalesFromG2(g2)
    : g3 ? bandScalesFromG3(g3)
    : g4 ? bandScalesFromG4(g4)
    : g5 ? bandScalesFromG5(g5) : null
  const band = bandScales
    ? calculateG2Band({
        passageLevel: calc.passage_level ?? null,
        phonicsTotal: calc.phonics_total ?? null,
        syllableTotal: calc.syllable_total ?? null,
        sentenceTotal: calc.sentence_total ?? null,
        compTotal: calc.comp_total ?? null,
        compNotAdministered: calc.comp_not_administered ?? null,
        accuracyPct: calc.accuracy_pct ?? null,
        naep: calc.naep ?? sc.naep ?? null,
        cwpm: rawCwpmValue,
      }, bandScales, levelCwpmNorms?.[calc.passage_level as string])
    : null

  // The band IS the oral score. Its floor is the passage the student sustained,
  // so passage difficulty settles the ordering before anything else does, and
  // the measures inside it only position a student within that level. This is
  // the model Grade 1 has always used; grades 2-5 now share it.
  // A session marked complete with no passage on record is not missing data.
  // The student sat down, was given a passage and could not read it -- an
  // attempt that scored nothing is evidence, and the lowest evidence there is.
  // Scored 0 rather than dropped, so they rank at the bottom of the grade and
  // receive a placement instead of falling out of the ranking altogether.
  oralScore = band ? band.composite / 100 : (oralComplete ? 0 : null)

  const termScores = {
    oral: oralScore, decoding: decodingScore, mc: mcScore,
    shortWriting: shortWritingScore, writing: writingRubricScore,
  }
  // Whether the student has sat any part of the test. A teacher rating on its
  // own does not make them rankable -- see isTestedRow.
  const isTested = isTestedRow(termScores)
  const composite = compositeFrom(termScores, customWeights ?? compositeWeightsFor(grade)) ?? 0.5
  // Outlier flags: score is 0 or below 10% of class auto-median
  // Only flag when enough classmates have data for that component (>=3 or >=50% of class) to make the median meaningful
  const outlierFlags: string[] = []
  const oralReliable = bench._auto_oral_count >= 3 && bench._auto_oral_count >= (bench._class_size || 1) * 0.5
  const writingReliable = bench._auto_writing_count >= 3 && bench._auto_writing_count >= (bench._class_size || 1) * 0.5
  const mcReliable = bench._auto_mc_count >= 3 && bench._auto_mc_count >= (bench._class_size || 1) * 0.5
  if (oralReliable && rawCwpmValue != null && (rawCwpmValue === 0 || (bench._auto_oral_median > 0 && rawCwpmValue < bench._auto_oral_median * 0.1))) outlierFlags.push('oral')
  // The other end. A rate this high is almost always a stopwatch started late:
  // the words read cover the passage, the clock covers part of it. Ungated by
  // class median on purpose -- it is implausible in absolute terms, and it
  // feeds the band, so it should be checked before it decides a placement.
  const readSeconds = sc.orf_time_seconds ?? null
  if (rawCwpmValue != null && (rawCwpmValue > IMPLAUSIBLE_CWPM || (readSeconds != null && readSeconds > 0 && readSeconds < IMPLAUSIBLE_READ_SECONDS && (sc.orf_words_read ?? 0) > 40))) outlierFlags.push('rate')
  if (writingReliable && sc.writing != null && (sc.writing === 0 || (bench._auto_writing_median > 0 && sc.writing < bench._auto_writing_median * 0.1))) outlierFlags.push('writing')
  if (mcReliable && sc.written_mc != null && (sc.written_mc === 0 || (bench._auto_mc_median > 0 && sc.written_mc < bench._auto_mc_median * 0.1))) outlierFlags.push('mc')

  return { student: s, score: sc, calc, bench, anec, grades, cwpmRatio, writingRatio, mcPct, wrAcc, compRatio, testScore, oralScore: oralScore ?? 0.5, mcScore: mcScore ?? 0.5, writingRubricScore: writingRubricScore ?? 0.5, gradeScore: gScore, anecScore, hasAnec, isTested, composite, rawCwpm: rawCwpmValue, rawWriting: sc.writing ?? null, rawMc: sc.written_mc ?? null, adjMcScore, adjMcMax, rawComp: calc.comp_total ?? null, compMax: calc.comp_max ?? null, compUnmeasured,
    // Grade 2's oral test also scores a phonics grid and a sentence-reading
    // set. Both already fed the composite through mcScore; neither was on the
    // table, so a teacher could not see the section they had just marked.
    rawPhonics: calc.phonics_total ?? null, phonicsMax: calc.phonics_max ?? 25,
    rawSentence: calc.sentence_total ?? null, sentenceMax: calc.sentence_max ?? 35,
    // Syllable counting exists only from Fall 2026 on, and unlike phonics and
    // sentences it feeds the Band alone -- never the composite. `syllable_max`
    // is null on a test without the section, which is what gates the column.
    rawSyllable: calc.syllable_total ?? null, syllableMax: calc.syllable_max ?? null,
    rawShortWriting: calc.short_writing_total ?? null, shortWritingMax: calc.short_writing_max ?? null,
    // The teacher declared the oral session over. A student can be complete and
    // still have nothing to score -- that is the whole reason the flag exists --
    // so it is kept apart from isTested rather than folded into it.
    oralComplete,
    // Complete, but nothing was read: the 0 above is the whole of their oral
    // evidence. Worth marking on the table so it does not read as a low score
    // among comparable low scores.
    attemptedNothing: oralComplete && band == null,
    decodingScore, shortWritingScore, passageLevel: calc.passage_level ?? null, oralPassageLevel, adjustedCwpm, otherAttempts, accuracyPct: calc.accuracy_pct ?? null, naep: calc.naep ?? sc.naep ?? null, hasGrades, outlierFlags, band }
}

/**
 * Attach rank, percentile and a suggested class -- to the students who have
 * actually been tested.
 *
 * Untested students are not merely skipped; they are kept out of the sorted
 * array entirely, so they do not consume rank positions and shift everyone
 * else's percentile. They come back with nulls, and the table shows them as
 * "not tested" rather than inventing a placement for them.
 */
export function rankRows<T extends { student: Student; composite: number; isTested: boolean }>(r: T[]) {
  const ranked = r.filter(row => row.isTested).sort((a, b) => a.composite - b.composite)
  const byStudent = new Map<string, { percentile: number; suggestedClass: EnglishClass }>()
  ranked.forEach((row, idx) => {
    byStudent.set(row.student.id, {
      percentile: ranked.length > 1 ? idx / (ranked.length - 1) : 0.5,
      suggestedClass: suggestClass(row, idx, ranked.length),
    })
  })
  return [...r]
    .sort((a, b) => a.composite - b.composite)
    .map(row => {
      const rank = byStudent.get(row.student.id)
      return { ...row, percentile: rank ? rank.percentile : null, suggestedClass: rank ? rank.suggestedClass : null }
    })
}

export function suggestClass(row: any, idx: number, total: number): EnglishClass {
  const PLACEMENT_CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']
  if (row.score.word_reading_correct != null && row.score.word_reading_correct < 4) return 'Lily'
  if (row.wrAcc != null && row.wrAcc < 0.1) return 'Lily'
  const p = total > 1 ? idx / (total - 1) : 0.5
  const bi = Math.min(Math.floor(p / (1 / PLACEMENT_CLASSES.length)), PLACEMENT_CLASSES.length - 1)
  return PLACEMENT_CLASSES[bi]
}
