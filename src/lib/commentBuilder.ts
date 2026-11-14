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
  const first = t[0]
  const rest = t.slice(1)
  // Keep a capital that starts a name or a placeholder.
  const keep = /^[{A-Z]/.test(t) && !/^(Read|Write|Ask|Listen|Practise|Practice|Keep|Make|Say|Count|Finish|Join|Use|Rewrite|Record|Sort|Build|Find|Hunt|Spell|Clap|Label|Give|Review|Trace|Three|One|Each|When|After)\b/.test(t)
  return `At home, ${keep ? first : first.toLowerCase()}${rest}`
}

/** The draft, filled for the student, paragraphs separated by a blank line. */
export function assembleComment(sel: BuilderSelection, student: { name: string; pronoun: Pronoun | null }): string {
  const fill = (s: string) => fillPhrase(s, student)
  const paras: string[] = []
  const first: string[] = []
  if (sel.opener) first.push(fill(sel.opener))
  const [strongest, ...others] = sel.areas.filter(a => a.sentences.length > 0)
  if (strongest) first.push(...strongest.sentences.map(fill))
  if (first.length) paras.push(first.join(' '))
  const middle = others.flatMap(a => a.sentences.map(fill))
  if (middle.length) paras.push(middle.join(' '))
  if (sel.behavior.length) paras.push(sel.behavior.map(fill).join(' '))
  const steps = [...sel.nextSteps.map(fill), ...sel.home.map(h => fill(homeSentence(h)))]
  if (steps.length) paras.push(steps.join(' '))
  if (sel.closer) paras.push(fill(sel.closer))
  return paras.join('\n\n')
}
