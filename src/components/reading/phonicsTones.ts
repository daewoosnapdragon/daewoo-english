import type { PhonicsBand, PhonicsMark } from '@/lib/phonics'

// Colours for the three bands and the three word marks, shared by the heat
// map, the student strip, the progress grid, the cell detail and the check
// screen. Kept in components/ so Tailwind sees the class names.

export const BAND_TONE: Record<PhonicsBand, string> = {
  mastered: 'bg-good text-white',
  developing: 'bg-warn-soft text-warn',
  beginning: 'bg-bad-soft text-bad',
}
export const BAND_CHIP: Record<PhonicsBand, string> = {
  mastered: 'bg-good text-white border-good',
  developing: 'bg-warn-soft text-warn border-warn/30',
  beginning: 'bg-bad-soft text-bad border-bad/30',
}
export const BAND_TEXT: Record<PhonicsBand, string> = { mastered: 'text-good', developing: 'text-warn', beginning: 'text-bad' }
export const BAND_DOT: Record<PhonicsBand, string> = { mastered: 'bg-good', developing: 'bg-warn', beginning: 'bg-bad' }
export const BAND_RANGE: Record<PhonicsBand, string> = { mastered: '90%+', developing: '70–89%', beginning: '<70%' }

/** Word tiles on the check screen and in the cell detail: green right, amber partly, red wrong. */
export const MARK_TILE: Record<PhonicsMark, string> = {
  correct: 'bg-good-soft border-good/50 text-good',
  partial: 'bg-warn-soft border-warn/50 text-warn',
  error: 'bg-bad-soft border-bad/50 text-bad',
}
/** The small badge on a marked tile, and the cell in the missed-words table. */
export const MARK_SOLID: Record<PhonicsMark, string> = { correct: 'bg-good', partial: 'bg-warn', error: 'bg-bad' }
export const MARK_SOFT: Record<PhonicsMark, string> = { correct: 'bg-good-soft text-good', partial: 'bg-warn-soft text-warn', error: 'bg-bad-soft text-bad' }
export const MARK_LABEL: Record<PhonicsMark, { en: string; ko: string }> = {
  correct: { en: 'correct', ko: '정답' },
  partial: { en: 'partly', ko: '부분 정답' },
  error: { en: 'error', ko: '오답' },
}

/** Short date for grid headers and chips. */
export function fmtShort(d: string, lang: 'en' | 'ko'): string {
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
}
export function fmtLong(d: string, lang: 'en' | 'ko'): string {
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
