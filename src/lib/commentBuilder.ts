// ─── The comment builder's maths ─────────────────────────────────
// A teacher ticks what applies and the builder assembles a first draft in
// an order that reads naturally: opener, the strongest area, the other
// areas, behavior, next steps with home practice, closer. Sentences that
// say the same thing are offered least-used-first so a class's comments
// drift apart on their own. Pure; the modal does the picking.

import { fillPhrase, type Pronoun, type Tier } from '@/lib/phrases'

export interface BuilderPhrase { id: string; text: string; tier?: Tier | null; sort_order?: number }

/** Least used in the class first, then the bank's own order. */
export function leastUsedFirst<T extends BuilderPhrase>(phrases: T[], counts: Record<string, number>): T[] {
  return [...phrases].sort((a, b) => ((counts[a.id] || 0) - (counts[b.id] || 0)) || ((a.sort_order || 0) - (b.sort_order || 0)))
}

/** The areas in the order they should appear: strongest first, then by score descending, ungraded last. */
export function areaOrder(scores: Record<string, number | null>, areas: string[]): string[] {
  const graded = areas.filter(a => scores[a] != null).sort((a, b) => (scores[b] as number) - (scores[a] as number))
  const rest = areas.filter(a => scores[a] == null)
  return [...graded, ...rest]
}

/** A behavior letter maps to a tier: A strong, B on track, C working on it, D or E serious concern. */
export function tierForBehaviorGrade(letter: string | null | undefined): Tier {
  if (!letter) return 'on track'
  const l = letter.trim().toUpperCase()
  if (l.startsWith('A')) return 'strong'
  if (l.startsWith('B')) return 'on track'
  if (l.startsWith('C')) return 'needs support'
  return 'serious concern'
}

export interface BuilderSelection {
  opener: string | null
  /** In display order; each entry is the raw (unfilled) sentences ticked for that area. */
  areas: Array<{ area: string; sentences: string[] }>
  behavior: string[]
  /** Classroom lines ticked from the ladder. */
  nextSteps: string[]
  /** Home activities ticked from the ladder. */
  home: string[]
  closer: string | null
}

/** "Read ten minutes each evening." → "At home, read ten minutes each evening." */
export function homeSentence(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''
  // The first word loses its capital unless it is a placeholder, "I", or a proper noun.
  const keep = /^[{]/.test(t) || /^(I|I'm|I'll|English|Korean)\b/.test(t)
  return `At home, ${keep ? t[0] : t[0].toLowerCase()}${t.slice(1)}`
}

/**
 * A paragraph of bank sentences each starts with the name. With a pronoun
 * known, the second and third sentence-opening names become the pronoun
 * ("{name}'s" → "{his}"), the fourth uses the name again, and so on, so a
 * paragraph does not read "Sophia… Sophia… Sophia…". Placeholders only;
 * fillPhrase does the words and the capitals.
 */
export function varyNames(paragraph: string, hasPronoun: boolean): string {
  if (!hasPronoun) return paragraph
  const parts = (paragraph || '').split(/(?<=[.!?])\s+/)
  return parts.map((s, i) => {
    if (i % 3 === 0) return s
    if (/^\{name\}'s\b/.test(s)) return s.replace(/^\{name\}'s/, '{his}')
    if (/^\{name\}(?=\s|$)/.test(s)) return s.replace(/^\{name\}/, '{he}')
    return s
  }).join(' ')
}

/** The draft, filled for the student, paragraphs separated by a blank line. */
export function assembleComment(sel: BuilderSelection, student: { name: string; pronoun: Pronoun | null }): string {
  const fill = (s: string) => fillPhrase(s, student)
  const hasPronoun = !!student.pronoun
  const para = (raw: string[]) => fill(varyNames(raw.join(' '), hasPronoun))
  const paras: string[] = []
  const first: string[] = []
  if (sel.opener) first.push(sel.opener)
  const [strongest, ...others] = sel.areas.filter(a => a.sentences.length > 0)
  if (strongest) first.push(...strongest.sentences)
  if (first.length) paras.push(para(first))
  const middle = others.flatMap(a => a.sentences)
  if (middle.length) paras.push(para(middle))
  if (sel.behavior.length) paras.push(para(sel.behavior))
  const steps = [...sel.nextSteps, ...sel.home.map(homeSentence)]
  if (steps.length) paras.push(para(steps))
  if (sel.closer) paras.push(fill(sel.closer))
  return paras.join('\n\n')
}
