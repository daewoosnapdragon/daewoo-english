// ─── Gentle checks under the comment box ─────────────────────────
// Report card comments follow a few house rules (about 200 words, no talk
// of moving levels, no superlatives or comparisons, nothing copied from
// another comment). Nothing here can judge whether a comment is *good*;
// these are the checks a word list and some counting can make honestly.
// They come back as grey hints, never blocks, in a stable order: the word
// count first, then anything that would embarrass the teacher in front of
// a parent (another child's name, a leftover placeholder), then the
// softer hints. Every function is pure so it can be tested.

export interface CommentHint {
  kind: 'words' | 'name' | 'placeholder' | 'banned' | 'similar' | 'list' | 'template' | 'long'
  text: string
}

export const COMMENT_TARGET_WORDS = 200

/** Words in the comment, ignoring blanks and punctuation-only tokens. */
export function wordCount(text: string): number {
  return (text || '').split(/\s+/).filter(w => /[A-Za-z0-9ㄱ-힝]/.test(w)).length
}

// Phrases Victoria asked teachers to keep out of comments, with the reason
// a teacher sees. Matching is case-insensitive on whole words.
const BANNED: Array<{ re: RegExp; label: string }> = [
  { re: /\blevel(?:ed|ing|s)?\s*(?:up|down)\b|\bleveling\b/i, label: 'mentions moving levels' },
  { re: /\bfavou?rite\s+student\b|\bmy\s+favou?rite\b/i, label: '“favorite” reads as favoritism' },
  { re: /\b(?:the\s+)?best\s+(?:student|writer|reader|speaker|in\s+(?:the\s+)?class)\b/i, label: 'compares with the class' },
  { re: /\bthan\s+(?:the\s+)?other\s+students\b|\bthan\s+(?:his|her|their)\s+classmates\b|\bcompared\s+(?:to|with)\s+(?:the\s+)?(?:class|others)\b/i, label: 'compares with other students' },
  { re: /\btop\s+of\s+the\s+class\b|\bbottom\s+of\s+the\s+class\b/i, label: 'ranks the student in the class' },
]

export function findBanned(text: string): string[] {
  const out: string[] = []
  for (const b of BANNED) {
    const m = b.re.exec(text || '')
    if (m) out.push(`“${m[0].trim()}” ${b.label}`)
  }
  return out
}

// Leftovers from the phrase bank or from a copied comment.
const PLACEHOLDERS: RegExp[] = [
  /\bSTUDENT\s*NAME\b/, /\{name\}|\{he\}|\{his\}|\{him\}/i, /\bXXXXX?\b/, /\bDOMAIN\b/, /_{3,}/,
  /\bhe\/she\b/i, /\bhis\/her\b/i, /\bhim\/her\b/i, /\bhimself\/herself\b/i, /\bs?he\s*\/\s*s?he\b/i,
]

/** Each leftover placeholder once, as written. */
export function findPlaceholders(text: string): string[] {
  const seen = new Set<string>()
  for (const re of PLACEHOLDERS) {
    const m = re.exec(text || '')
    if (m) seen.add(m[0])
  }
  return Array.from(seen)
}

/**
 * Other students' names in the comment. Only the first word of each roster
 * name is checked, capitalised and whole-word, and names that could also
 * be ordinary words (Grace, Sunny, May…) are skipped only when they are
 * not capitalised in the text; a capitalised match is reported either way,
 * since in a comment a capital mid-sentence is almost always a name.
 */
export function findOtherNames(text: string, thisName: string, rosterNames: string[]): string[] {
  const mine = (thisName || '').trim().split(/\s+/)[0]?.toLowerCase()
  const out: string[] = []
  for (const full of rosterNames) {
    const first = (full || '').trim().split(/\s+/)[0]
    if (!first || first.length < 3 || first.toLowerCase() === mine) continue
    const re = new RegExp(`(^|[^A-Za-z])${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`)
    if (re.test(text || '') && !out.includes(first)) out.push(first)
  }
  return out
}

/** Lower-cased word 4-grams, the unit of "copied from another comment". */
export function shingles(text: string, n = 4): Set<string> {
  const words = (text || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '))
  return out
}

/**
 * How much of this comment also appears in another one: the share of its
 * 4-word phrases found in the most similar other comment. A student's name
 * is swapped for a token first so two comments do not look alike merely
 * because both use the child's name. 0 when the comment is too short to
 * have any phrases.
 */
export function phraseOverlap(text: string, others: Array<{ text: string; label: string }>, names: string[] = []): { pct: number; label: string } | null {
  const scrub = (t: string) => names.reduce((acc, n) => n ? acc.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), 'NAME') : acc, t || '')
  const mine = shingles(scrub(text))
  if (mine.size < 8) return null
  let best: { pct: number; label: string } | null = null
  for (const o of others) {
    if (!o.text) continue
    const theirs = shingles(scrub(o.text))
    if (theirs.size === 0) continue
    let shared = 0
    mine.forEach(s => { if (theirs.has(s)) shared++ })
    const pct = Math.round((shared / mine.size) * 100)
    if (!best || pct > best.pct) best = { pct, label: o.label }
  }
  return best
}

const NEXT_STEP = /\b(?:needs? to|should|would benefit|is working toward|is learning to|struggles? (?:with|to)|the next step|must work on|needs? (?:more )?(?:practice|support|help))\b/gi

/** How many "things to work on" the comment lists. Rough: a hint, never a rule. */
export function nextStepCount(text: string): number {
  return ((text || '').match(NEXT_STEP) || []).length
}

// The specific tics the bank's own "avoid ChatGPTisms" sheet names.
const TEMPLATE_TICS: RegExp[] = [
  /\bconsistently demonstrates\b/i, /\bdemonstrates? (?:a )?(?:strong )?(?:mastery|proficiency|command)\b/i,
  /(?:^|[.!?]\s+)overall,/i, /(?:^|[.!?]\s+)with\s+(?:his|her|their|strong|a|an|excellent)\b/i, /\bgrade-level expectations\b/i, /\bproficiency level\b/i,
]

export function findTemplateTics(text: string): string[] {
  const out: string[] = []
  for (const re of TEMPLATE_TICS) {
    const m = re.exec(text || '')
    if (m) out.push(m[0].trim().replace(/^[.!?]\s+/, ''))
  }
  return out
}

/** Average words per sentence, 0 for no sentences. */
export function averageSentenceLength(text: string): number {
  const sentences = (text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => /[A-Za-z]/.test(s))
  if (sentences.length === 0) return 0
  return sentences.reduce((a, s) => a + wordCount(s), 0) / sentences.length
}

export interface CheckInput {
  text: string
  /** This student's English name, for the other-names check. */
  studentName: string
  /** Every English name in the class. */
  rosterNames: string[]
  /** The teacher's other comments this semester, labelled with the student's name. */
  otherComments: Array<{ text: string; label: string }>
  target?: number
}

/** The grey line under the box: every hint that applies, in display order. */
export function commentChecks(input: CheckInput): CommentHint[] {
  const text = input.text || ''
  const target = input.target ?? COMMENT_TARGET_WORDS
  const hints: CommentHint[] = []
  const words = wordCount(text)
  if (words === 0) return hints
  hints.push({ kind: 'words', text: `${words} ${words === 1 ? 'word' : 'words'} · aim for about ${target}` })
  for (const n of findOtherNames(text, input.studentName, input.rosterNames)) hints.push({ kind: 'name', text: `“${n}” is another student's name` })
  for (const p of findPlaceholders(text)) hints.push({ kind: 'placeholder', text: `“${p}” left in` })
  for (const b of findBanned(text)) hints.push({ kind: 'banned', text: b })
  const overlap = phraseOverlap(text, input.otherComments, [input.studentName, ...input.rosterNames])
  if (overlap && overlap.pct >= 15) hints.push({ kind: 'similar', text: `shares ${overlap.pct}% of its phrases with ${overlap.label}'s comment` })
  const steps = nextStepCount(text)
  if (steps >= 4) hints.push({ kind: 'list', text: `${steps} things to work on; parents remember one or two` })
  for (const t of findTemplateTics(text)) hints.push({ kind: 'template', text: `“${t}” reads like a template` })
  const avg = averageSentenceLength(text)
  if (avg > 24) hints.push({ kind: 'long', text: `sentences average ${Math.round(avg)} words; shorter ones translate better` })
  return hints
}
