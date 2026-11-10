import type { PhonicsBand } from '@/lib/phonics'

// Colours for the packet's four bands, shared by the heat map, the student
// strip, the progress grid and the check screen. Kept in components/ so
// Tailwind sees the class names.

export const BAND_TONE: Record<PhonicsBand, string> = {
  mastered: 'bg-good text-white',
  proficient: 'bg-good-soft text-good',
  developing: 'bg-warn-soft text-warn',
  beginning: 'bg-bad-soft text-bad',
}
export const BAND_CHIP: Record<PhonicsBand, string> = {
  mastered: 'bg-good text-white border-good',
  proficient: 'bg-good-soft text-good border-good/30',
  developing: 'bg-warn-soft text-warn border-warn/30',
  beginning: 'bg-bad-soft text-bad border-bad/30',
}
export const BAND_TEXT: Record<PhonicsBand, string> = { mastered: 'text-good', proficient: 'text-good', developing: 'text-warn', beginning: 'text-bad' }
export const BAND_DOT: Record<PhonicsBand, string> = { mastered: 'bg-good', proficient: 'bg-good/60', developing: 'bg-warn', beginning: 'bg-bad' }

/** Short date for grid headers and chips. */
export function fmtShort(d: string, lang: 'en' | 'ko'): string {
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
}
export function fmtLong(d: string, lang: 'en' | 'ko'): string {
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
