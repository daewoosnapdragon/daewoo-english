import { GradingScaleEntry, EnglishClass, CLASS_ORDER } from '@/types'

// ─── Student Display Name ─────────────────────────────────────────────
// Korean naming: LAST NAME FIRST NAME (ENGLISH NAME)
// If English name exists, use it. Otherwise use Korean first name.
// Korean names: "이지수" → given name is last 2 chars (or 1 if name is 2 chars total)
// english_name field stores: "Lee Ji Su" or "Lee Ji Su (Alex)"
// We want: "Alex" if has English name, "Ji Su" if not

export function getDisplayName(student: { english_name?: string; korean_name?: string }): string {
  const en = student.english_name?.trim() || ''
  // Check for English nickname in parentheses: "Lee Ji Su (Alex)" → "Alex"  
  const parenMatch = en.match(/\(([^)]+)\)/)
  if (parenMatch) return parenMatch[1].trim()
  
  // If english_name has multiple words, use the first name (skip the last-name, which is first word)
  // "Lee Ji Su" → "Ji Su", "Kim Ha Jin" → "Ha Jin"
  // But "Sa Yul" (2 words) → "Yul" (single char given name)
  const parts = en.split(/\s+/).filter(Boolean)
  if (parts.length >= 3) return parts.slice(1).join(' ') // "Lee Ji Su" → "Ji Su"
  if (parts.length === 2) return parts[1] // "Sa Yul" → "Yul"
  if (parts.length === 1 && en.length > 0) return en // single word name
  
  // Fallback to korean_name: skip first character (family name), rest is given name
  const kr = student.korean_name?.trim() || ''
  if (kr.length >= 3) return kr.slice(1) // "이지수" → "지수"
  if (kr.length === 2) return kr[1] // "사율" → "율"
  return kr || 'Unknown'
}

// Full name for formal contexts: "English Name (Korean Name)" or just Korean if no English
export function getFullDisplayName(student: { english_name?: string; korean_name?: string }): string {
  const en = student.english_name?.trim() || ''
  const kr = student.korean_name?.trim() || ''
  if (en && kr) return `${en} (${kr})`
  return en || kr || 'Unknown'
}

// ─── Grade Calculations ──────────────────────────────────────────────

const DEFAULT_SCALE: GradingScaleEntry[] = [
  { letter: 'A+', min: 97, max: 100 }, { letter: 'A', min: 93, max: 96 },
  { letter: 'A-', min: 90, max: 92 }, { letter: 'B+', min: 87, max: 89 },
  { letter: 'B', min: 83, max: 86 }, { letter: 'B-', min: 80, max: 82 },
  { letter: 'C+', min: 77, max: 79 }, { letter: 'C', min: 73, max: 76 },
  { letter: 'C-', min: 70, max: 72 }, { letter: 'D+', min: 67, max: 69 },
  { letter: 'D', min: 63, max: 66 }, { letter: 'D-', min: 60, max: 62 },
  { letter: 'E', min: 0, max: 59 },
]

export function percentToLetter(pct: number, scale?: GradingScaleEntry[]): string {
  const s = scale || DEFAULT_SCALE
  const p = Math.round(pct)
  for (const g of s) {
    if (p >= g.min) return g.letter
  }
  return 'E'
}

export function letterToColor(letter: string): string {
  if (!letter) return '#94a3b8'
  if (letter.startsWith('A')) return '#059669'
  if (letter.startsWith('B')) return '#2563eb'
  if (letter.startsWith('C')) return '#d97706'
  if (letter.startsWith('D')) return '#dc2626'
  return '#991b1b'
}

export function classToColor(cls: EnglishClass): string {
  const colors: Record<string, string> = {
    Lily: '#D4A5B0',
    Camellia: '#C8A88E',
    Daisy: '#E8DFA0',
    Sunflower: '#AED6CF',
    Marigold: '#91ADC8',
    Snapdragon: '#B4A8CC',
  }
  return colors[cls] || '#C8CED8'
}

export function classToTextColor(cls: EnglishClass): string {
  const colors: Record<string, string> = {
    Lily: '#8B3A4A',
    Camellia: '#7A5A30',
    Daisy: '#6B5E1A',
    Sunflower: '#2A6B5E',
    Marigold: '#3A5A8A',
    Snapdragon: '#5A3D8A',
  }
  return colors[cls] || '#5A6275'
}

// ─── Permissions ─────────────────────────────────────────────────────

/**
 * Who may set the active semester and browse semesters other than the active
 * one. Everyone else is pinned to whatever these accounts have made active,
 * so a teacher can never wander back into a finished semester's data.
 */
export function canManageSemesters(
  teacher: { role?: string; english_class?: string } | null | undefined
): boolean {
  return teacher?.role === 'admin' || teacher?.english_class === 'Snapdragon'
}

// ─── Formatting ──────────────────────────────────────────────────────

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `${Math.round(value * 100)}%`
}

export function formatPercentDecimal(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatScore(score: number | null, maxScore: number): string {
  if (score == null) return '—'
  return `${score}/${maxScore}`
}

// ─── Array Utilities ─────────────────────────────────────────────────

export function average(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v))
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

export function weightedAverage(
  values: { value: number | null; weight: number }[]
): number | null {
  const valid = values.filter(v => v.value != null && !isNaN(v.value!))
  if (valid.length === 0) return null
  const totalWeight = valid.reduce((a, b) => a + b.weight, 0)
  if (totalWeight === 0) return null
  return valid.reduce((a, b) => a + b.value! * b.weight, 0) / totalWeight
}

// ─── Sorting ─────────────────────────────────────────────────────────

export function sortByKoreanClassAndNumber<T extends { korean_class: string; class_number: number }>(
  students: T[]
): T[] {
  const classOrder: Record<string, number> = { '대': 1, '솔': 2, '매': 3 }
  return [...students].sort((a, b) => {
    const classCompare = (classOrder[a.korean_class] || 99) - (classOrder[b.korean_class] || 99)
    if (classCompare !== 0) return classCompare
    return a.class_number - b.class_number
  })
}

export function sortByEnglishClass<T extends { english_class: EnglishClass }>(items: T[]): T[] {
  return [...items].sort((a, b) => CLASS_ORDER[a.english_class] - CLASS_ORDER[b.english_class])
}

// ─── Validation ──────────────────────────────────────────────────────

export function validateScore(score: string | number, maxScore: number): { valid: boolean; value: number | null; error?: string } {
  if (score === '' || score === null || score === undefined) {
    return { valid: true, value: null }
  }
  const num = typeof score === 'string' ? parseFloat(score) : score
  if (isNaN(num)) return { valid: false, value: null, error: 'Invalid number' }
  if (num < 0) return { valid: false, value: null, error: 'Score cannot be negative' }
  if (num > maxScore) return { valid: false, value: null, error: `Score cannot exceed ${maxScore}` }
  return { valid: true, value: num }
}

// ─── Excel Roster Parsing ────────────────────────────────────────────

export function parseRosterHeaders(headers: string[]): Record<string, number> | null {
  const normalized = headers.map(h => h?.toString().toLowerCase().trim() || '')
  const mapping: Record<string, string[]> = {
    korean_class: ['korean class', 'korean_class', '한국반', '반'],
    class_number: ['class number', 'class_number', '번호', 'number'],
    korean_name: ['korean name', 'korean_name', '한글이름', '한글 이름', '이름'],
    english_name: ['english name', 'english_name', '영어이름', '영어 이름'],
    grade: ['grade', '학년'],
    english_class: ['english class', 'english_class', '영어반'],
    teacher: ['teacher', '교사', '선생님'],
  }

  const result: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(mapping)) {
    const idx = normalized.findIndex(h => aliases.includes(h))
    if (idx !== -1) result[field] = idx
  }

  const required = ['korean_name', 'english_name', 'grade']
  const missing = required.filter(f => !(f in result))
  if (missing.length > 0) return null

  return result
}

// ─── Date Utilities ──────────────────────────────────────────────────

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateKo(date: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function getWeekDates(startDate: Date, numDays: number = 5): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

// Korean Standard Time helpers (UTC+9)
export function getKSTDate(): Date {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
  return kst
}

export function getKSTDateString(): string {
  const d = getKSTDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getKSTNow(): string {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
}

// Domain display name helper
const DOMAIN_DISPLAY: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing',
  speaking: 'Speaking & Listening', language: 'Language Standards',
}
export function domainLabel(d: string): string {
  return DOMAIN_DISPLAY[d] || d.charAt(0).toUpperCase() + d.slice(1)
}

// ─── Assessment Weighting System ──────────────────────────────────────
// Grade-level defaults for assessment type weights
// Keys: formative, summative, performance_task

export type AssessmentType = 'formative' | 'summative' | 'performance_task'

export const DEFAULT_WEIGHTS: Record<number, Record<AssessmentType, number>> = {
  1: { formative: 40, summative: 25, performance_task: 35 },
  2: { formative: 35, summative: 35, performance_task: 30 },
  3: { formative: 30, summative: 40, performance_task: 30 },
  4: { formative: 30, summative: 40, performance_task: 30 },
  5: { formative: 30, summative: 40, performance_task: 30 },
}

export interface WeightedGradeInput {
  score: number
  maxScore: number
  assessmentType: AssessmentType
}

/**
 * Calculate weighted average for a set of graded assessments within a single domain.
 * Groups by assessment type, averages within each group, then applies type weights.
 * Falls back to unweighted average if only one type exists or weights aren't configured.
 * Supports class-specific override keys like "3-Snapdragon" falling back to grade-level "3".
 */
export function calculateWeightedAverage(
  items: WeightedGradeInput[],
  grade: number,
  customWeights?: Record<AssessmentType, number> | null,
  englishClass?: string | null,
  allWeights?: Record<string, Record<AssessmentType, number>> | null,
): number | null {
  if (items.length === 0) return null

  // Priority: customWeights > class-specific override > grade default
  let weights = customWeights || null
  if (!weights && allWeights && englishClass) {
    const classKey = `${grade}-${englishClass}`
    if (allWeights[classKey]) weights = allWeights[classKey]
  }
  if (!weights && allWeights) {
    const gradeKey = String(grade)
    if (allWeights[gradeKey]) weights = allWeights[gradeKey]
  }
  if (!weights) weights = DEFAULT_WEIGHTS[grade] || DEFAULT_WEIGHTS[3]

  // Group by assessment type
  const groups: Record<AssessmentType, number[]> = {
    formative: [], summative: [], performance_task: [],
  }
  items.forEach(item => {
    if (item.maxScore > 0) {
      const pct = (item.score / item.maxScore) * 100
      const aType = groups[item.assessmentType] ? item.assessmentType : 'formative'
      groups[aType].push(pct)
    }
  })

  // Average within each group
  const groupAvgs: { type: AssessmentType; avg: number; weight: number }[] = []
  for (const [type, pcts] of Object.entries(groups) as [AssessmentType, number[]][]) {
    if (pcts.length > 0) {
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length
      groupAvgs.push({ type, avg, weight: weights[type] })
    }
  }

  if (groupAvgs.length === 0) return null

  // If only one type has data, return its simple average (no weighting needed)
  if (groupAvgs.length === 1) return groupAvgs[0].avg

  // Weighted average: normalize weights to sum to 100 for present types only
  const totalWeight = groupAvgs.reduce((s, g) => s + g.weight, 0)
  if (totalWeight === 0) return groupAvgs.reduce((s, g) => s + g.avg, 0) / groupAvgs.length

  return groupAvgs.reduce((s, g) => s + (g.avg * (g.weight / totalWeight)), 0)
}

// ─── Comprehension: does this score carry information? ───────────────
// Three states have to stay apart when reading a stored level test score:
//   • not administered — the student was stopped mid-passage and never heard
//     the questions. Carries nothing; excluded.
//   • not entered yet  — the teacher has not scored them. Carries nothing.
//   • scored           — including a genuine 0, which IS evidence of weak
//     comprehension and should count against placement.
//
// Scores saved from the entry screens record `comp_answered` (how many
// questions were scored) and store a null `comp_total` when none were, so the
// three states are distinguishable. Rows saved before that field existed cannot
// tell a real 0 from an unscored set, so they keep the old behavior of
// counting only positive totals rather than being retroactively penalized.
export function compIsCountable(calc: {
  comp_total?: number | null
  comp_answered?: number | null
  comp_not_administered?: boolean | null
} | null | undefined): boolean {
  if (!calc) return false
  if (calc.comp_not_administered) return false
  if (calc.comp_total == null) return false
  if (calc.comp_answered != null) return calc.comp_answered > 0
  return calc.comp_total > 0
}

// ─── Comprehension: what an unadministered set is worth ──────────────
// Every grade's guide puts the top of the Frustration band at 40% of the
// comprehension total (4/10 where the guide states it outright). Used when a
// grade's content does not carry its own `frustrationCompMax`.
export const COMP_FRUSTRATION_RATIO = 0.4

// ─── One ceiling for every composite component ───────────────────────
// Fluency used to be the only ratio allowed above 1.0: its cap was 1.2 while
// writing (/20), MC (/total) and the teacher rating all topped out at 1.0.
// That asymmetry is what let a student measured on the oral test alone finish
// above a fully measured classmate — with the other components missing, their
// composite WAS the one ratio that had headroom, so it could land above 100
// while a complete record was pulled back toward 1.0.
//
// The ceiling is 1.0 again, and now it never binds. It was 1.2 while the oral
// term was a rate divided by a grade-wide benchmark: that ratio ran well past
// 1.0 for most competent readers, so a ceiling of 1.0 would have flattened the
// whole top of the grade. The oral term is now the band, which is bounded 0-100
// by construction, and every other term is a score over its own max. Nothing
// can exceed 1.0 on its own, so this is a guard rather than a scoring decision
// — and composites read as a percentage again instead of clustering at 120.
export const COMPONENT_CAP = 1.0

/** Clamp a component ratio to the shared ceiling. Null passes through. */
export function capComponent(ratio: number | null | undefined): number | null {
  if (ratio == null) return null
  return Math.min(ratio, COMPONENT_CAP)
}

/**
 * The comprehension ratio to feed the composite, or null when comprehension
 * carries nothing at all.
 *
 * NOT weighted by passage difficulty. It was for a while, to fix a real
 * problem — 10/10 on the easy passage and 10/10 on the hard one scored the
 * same, so answering nine questions about a much harder text ranked BELOW ten
 * about an easier one. The band fixes that properly: difficulty now sets the
 * floor a student starts from, and weighting comprehension too would count the
 * same passage twice, which is how a whole cohort ended up tied at the ceiling.
 *
 * Comprehension's real job is inside the band, where it carries the most weight
 * of any positioning input, per the guides: when accuracy and comprehension
 * disagree, comprehension decides.
 *
 * "Not administered" is NOT missing data. The teacher stops the passage and
 * skips the questions precisely BECAUSE the student was struggling, so the
 * fact of it is evidence of the bottom band. Dropping it from the composite
 * used to leave the student ranked on fluency alone — which put them ABOVE a
 * classmate who sat the questions and scored badly. It is scored instead at
 * the top of the Frustration band: low, but not the zero of a student who
 * genuinely answered nothing right.
 *
 * That floor is left UNWEIGHTED on purpose. It is a statement about the
 * student — "this reader was in frustration territory" — not about the text,
 * and multiplying it by the difficulty of a passage they demonstrably could
 * not sustain would let a failed hard passage outscore an honest middling
 * result on an easier one. The Band column already reads a passage that was
 * attempted but not sustained at its effective level.
 *
 * Flagged on the placement table either way, so a student who was stopped for
 * a reason other than ability can be caught by eye.
 */
export function compRatioForComposite(calc: {
  comp_total?: number | null
  comp_max?: number | null
  comp_answered?: number | null
  comp_not_administered?: boolean | null
  comp_frustration_max?: number | null
  passage_multiplier?: number | null
} | null | undefined): number | null {
  if (!calc) return null
  if (compIsCountable(calc)) return capComponent(calc.comp_total! / (calc.comp_max || 15))
  if (calc.comp_not_administered) {
    const max = calc.comp_max || 15
    return calc.comp_frustration_max != null
      ? calc.comp_frustration_max / max
      : COMP_FRUSTRATION_RATIO
  }
  return null
}

// ─── Level test → reading record adapter ─────────────────────────────
// Level placement tests (oral section) measure CWPM, accuracy, NAEP, etc.
// These should surface in the Reading Fluency views alongside ad-hoc reading_assessments.
// Older tests stored CWPM as raw_scores.passage_cwpm; the rebuilt OralTestEntry25
// stores it as raw_scores.orf_cwpm and also fills calculated_metrics.cwpm.
export interface LevelTestReadingRecord {
  id: string
  student_id: string
  date: string
  passage_title: string
  passage_level: string | null
  word_count: number
  time_seconds: number
  errors: number
  self_corrections: number
  cwpm: number
  accuracy_rate: number | null
  reading_level: string | null
  notes: string
  naep_fluency: number | null
  assessed_by: null
  is_level_test: true
  level_test_id: string
}

export function levelTestToReadingRecord(
  score: { level_test_id: string; raw_scores: any; calculated_metrics?: any },
  testDate: string,
  studentId: string
): LevelTestReadingRecord | null {
  if (!testDate) return null
  const raw = score.raw_scores || {}
  const calc = score.calculated_metrics || {}
  const cwpm = calc.cwpm ?? raw.passage_cwpm ?? raw.orf_cwpm ?? null
  if (cwpm == null || cwpm <= 0) return null
  const accuracy = calc.accuracy_pct ?? raw.orf_accuracy ?? null
  const naep = calc.naep ?? raw.naep ?? null
  const passageLevel = calc.best_passage_level ?? calc.passage_level ?? raw.passage_level ?? null
  const words = raw.orf_words_read ?? raw.word_count ?? 0
  const errors = raw.orf_errors ?? 0
  const time = raw.orf_time_seconds ?? 60
  return {
    id: `lt-${score.level_test_id}`,
    student_id: studentId,
    date: testDate,
    passage_title: 'Level Test',
    passage_level: passageLevel,
    word_count: words,
    time_seconds: time,
    errors,
    self_corrections: 0,
    cwpm: Math.round(cwpm),
    accuracy_rate: accuracy != null ? Math.round(accuracy * 10) / 10 : null,
    reading_level: passageLevel,
    notes: 'From level placement test',
    naep_fluency: naep,
    assessed_by: null,
    is_level_test: true,
    level_test_id: score.level_test_id,
  }
}

export type CompositeTerm = 'oral' | 'decoding' | 'mc' | 'shortWriting' | 'writing'
export type CompositeWeights = Partial<Record<CompositeTerm, number>>

const GRADE_COMPOSITE_WEIGHTS: Record<number, CompositeWeights> = {
  // Phonics and sentence reading get their own term rather than sitting inside
  // MC, so their weight is a number someone chose instead of an emergent 5%.
  2: { oral: 0.35, decoding: 0.20, mc: 0.15, writing: 0.30 },
  3: { oral: 0.45, mc: 0.25, shortWriting: 0.05, writing: 0.25 },
  // Grade 4's paper has no short-response item. Its 5 points are not reassigned
  // -- the composite renormalizes over the terms a student has, landing Grade 4
  // near 47/26/26, which is the same mechanism that handles a missing section.
  4: { oral: 0.45, mc: 0.25, writing: 0.25 },
  5: { oral: 0.45, mc: 0.25, shortWriting: 0.05, writing: 0.25 },
}
const DEFAULT_COMPOSITE_WEIGHTS: CompositeWeights = { oral: 0.45, mc: 0.25, shortWriting: 0.05, writing: 0.25 }

export function compositeWeightsFor(grade: number | string): CompositeWeights {
  return GRADE_COMPOSITE_WEIGHTS[Number(grade)] ?? DEFAULT_COMPOSITE_WEIGHTS
}

/** Human labels for the weight editor, in the order they are shown. */
export const COMPOSITE_TERM_LABELS: [CompositeTerm, string][] = [
  ['oral', 'Oral Test'], ['decoding', 'Phonics + Sentences'], ['mc', 'MC'],
  ['shortWriting', 'Short Writing'], ['writing', 'Writing'],
]

// Within the decoding term. Equal, deliberately: the sentence set carries more
// raw points than the phonics grid, but point counts are an artifact of how the
// tasks were built, not a statement that one measures more decoding than the
// other. Change these rather than the point totals if that judgement changes.
export const DECODING_WEIGHTS = { phonics: 0.50, sentences: 0.50 }
