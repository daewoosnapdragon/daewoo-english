// ─── The Phrases drawer's maths ──────────────────────────────────
// The comment bank (comment_phrases) holds sentences with {name}, {he},
// {his}, {him} and ____ in them. This file fills them in for a student,
// decides which tier and which next-step band a student's numbers point
// to, and counts how many comments in a class already use a phrase, so
// the "used 3×" grey number is honest. Pure; the drawer does the queries.

export type Pronoun = 'he' | 'she' | 'they'
export const PRONOUNS: Pronoun[] = ['he', 'she', 'they']

const FORMS: Record<Pronoun, { he: string; his: string; him: string; himself: string; is: string; has: string }> = {
  he: { he: 'he', his: 'his', him: 'him', himself: 'himself', is: 'is', has: 'has' },
  she: { he: 'she', his: 'her', him: 'her', himself: 'herself', is: 'is', has: 'has' },
  they: { he: 'they', his: 'their', him: 'them', himself: 'themself', is: 'are', has: 'have' },
}

/**
 * Fills the placeholders for one student. A pronoun at the start of a
 * sentence is capitalised. With no pronoun set, the pronoun holes stay as
 * they are, so the teacher sees what is missing.
 */
export function fillPhrase(text: string, student: { name: string; pronoun?: Pronoun | null }): string {
  let out = (text || '').replace(/\{name\}/g, student.name || '{name}')
  if (!student.pronoun) return out
  const f = FORMS[student.pronoun]
  out = out.replace(/\{(he|his|him|himself|is|has)\}/g, (_m, k: keyof typeof f) => f[k])
  // Capitalise a pronoun that opens a sentence.
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre, c) => pre + c.toUpperCase())
  return out
}

/**
 * The name a student is called, from the roster's english_name: the English
 * name in brackets when there is one ("Kim Bo Min (Sophia)" → Sophia), else
 * the given name after the family name ("Kim Bo Min" → Bo Min, "Lee Jun" →
 * Jun). A single word is returned as it is. A confirmed goes_by wins.
 */
export function goesByFrom(englishName: string | null | undefined, goesBy?: string | null): string {
  if (goesBy && goesBy.trim()) return goesBy.trim()
  const raw = (englishName || '').trim()
  const m = /\(([^)]+)\)/.exec(raw)
  if (m && m[1].trim()) return m[1].trim()
  const words = raw.replace(/\s+/g, ' ').split(' ').filter(Boolean)
  if (words.length <= 1) return raw
  return words.slice(1).join(' ')
}

/** 'serious concern' exists for behavior only: plain statements for behavior that is genuinely bad. */
export type Tier = 'strong' | 'on track' | 'needs support' | 'change over time' | 'serious concern'

/** Which tier a percentage points to: A range strong, B range on track, below that needs support. */
export function tierForScore(score: number | null | undefined): Tier | null {
  if (score == null) return null
  if (score >= 90) return 'strong'
  if (score >= 80) return 'on track'
  return 'needs support'
}

export type Band = 'Beginning' | 'Intermediate' | 'Advanced'
export const BANDS: Band[] = ['Beginning', 'Intermediate', 'Advanced']

/**
 * The next-step band to open on. Grade sets the starting point and the
 * student's WIDA level and weakest letter nudge it: a Grade 1 at WIDA 4
 * is past tracing letters, a Grade 5 at WIDA 1 is not writing paragraphs.
 */
export function suggestBand(grade: number | null | undefined, wida: number | null | undefined, weakestScore: number | null | undefined): Band {
  let i = grade == null ? 1 : grade <= 2 ? 0 : grade === 3 ? 1 : 2
  if (wida != null) { if (wida >= 4) i += 1; if (wida <= 1) i -= 1 }
  if (weakestScore != null && weakestScore < 70) i -= 1
  return BANDS[Math.max(0, Math.min(2, i))]
}

/** '1-2' | '3-5' for a grade; the bank tags sentences with these bands or 'all'. */
export function gradeBand(grade: number | null | undefined): '1-2' | '3-5' {
  return grade != null && grade <= 2 ? '1-2' : '3-5'
}

export interface PhraseLike { id: string; text: string }

/**
 * A regex that matches a phrase however it was filled in: any name, any
 * pronoun, anything short in a blank. Used to count a phrase's use across
 * a class's comments.
 */
export function phrasePattern(text: string): RegExp {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = (text || '').split(/(\{name\}|\{he\}|\{his\}|\{him\}|\{himself\}|\{is\}|\{has\}|_{3,})/)
  const body = parts.map(p => {
    if (!p) return ''
    if (p === '{name}') return "[A-Za-z][A-Za-z'\\-]*(?: [A-Za-z][A-Za-z'\\-]*)?"
    if (/^\{(he|his|him|himself|is|has)\}$/.test(p)) return '[A-Za-z]+'
    if (/^_{3,}$/.test(p)) return '.{0,60}?'
    return esc(p).replace(/\s+/g, '\\s+')
  }).join('')
  return new RegExp(body, 'i')
}

/** How many of the comments contain each phrase. Pronoun and name variants count. */
export function usageCounts(phrases: PhraseLike[], comments: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  const texts = comments.filter(Boolean)
  for (const p of phrases) {
    const re = phrasePattern(p.text)
    out[p.id] = texts.reduce((n, c) => n + (re.test(c) ? 1 : 0), 0)
  }
  return out
}

/**
 * Where to put a sentence in the box: at the cursor, with a space before
 * and after when the neighbours are not already whitespace. Returns the
 * new text and where the cursor lands.
 */
export function insertAt(text: string, cursor: number, sentence: string): { text: string; cursor: number } {
  const at = Math.max(0, Math.min(cursor, (text || '').length))
  const before = (text || '').slice(0, at), after = (text || '').slice(at)
  const lead = before && !/\s$/.test(before) ? ' ' : ''
  const trail = after && !/^\s/.test(after) ? ' ' : ''
  const piece = lead + sentence + trail
  return { text: before + piece + after, cursor: at + piece.length }
}
