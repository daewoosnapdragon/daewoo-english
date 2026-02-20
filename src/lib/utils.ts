import { GradingScaleEntry, EnglishClass, CLASS_ORDER } from '@/types'

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
  const p = Math.round(pct * 100)
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
    Lily: '#E8B4B8',
    Camellia: '#F5D0A9',
    Daisy: '#F9E79F',
    Sunflower: '#ABEBC6',
    Marigold: '#AED6F1',
    Snapdragon: '#D2B4DE',
  }
  return colors[cls] || '#E5E7EB'
}

export function classToTextColor(cls: EnglishClass): string {
  const colors: Record<string, string> = {
    Lily: '#9B2C3A',
    Camellia: '#92400E',
    Daisy: '#78350F',
    Sunflower: '#065F46',
    Marigold: '#1E40AF',
    Snapdragon: '#5B21B6',
  }
  return colors[cls] || '#374151'
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
  reading: 'Reading', phonics: 'Phonics', writing: 'Writing',
  speaking: 'Speaking', language: 'Language',
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
 */
export function calculateWeightedAverage(
  items: WeightedGradeInput[],
  grade: number,
  customWeights?: Record<AssessmentType, number> | null,
): number | null {
  if (items.length === 0) return null

  const weights = customWeights || DEFAULT_WEIGHTS[grade] || DEFAULT_WEIGHTS[3]

  // Group by assessment type
  const groups: Record<AssessmentType, number[]> = {
    formative: [], summative: [], performance_task: [],
  }
  items.forEach(item => {
    if (item.maxScore > 0) {
      const pct = (item.score / item.maxScore) * 100
      groups[item.assessmentType].push(pct)
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
