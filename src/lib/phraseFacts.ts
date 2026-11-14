// ─── Blanks the app can fill itself ──────────────────────────────
// A few bank sentences leave ____ for numbers the fact sheet already has:
// words per minute now and in September, the reading level then and now,
// days absent, the last rubric's ideas and organization scores. When
// every number a sentence needs is known, the blanks are filled; when
// any is missing, the sentence keeps its blanks for the teacher.

export interface KnownFacts {
  cwpmNow?: number | null
  cwpmThen?: number | null
  levelNow?: string | null
  levelThen?: string | null
  absences?: number | null
  /** Criterion label → level, from the latest rubric piece. */
  rubric?: Record<string, number> | null
}

/** Replaces the blanks in order; the original text comes back if any value is missing. */
export function fillBlanks(text: string, values: Array<string | number | null | undefined>): string {
  if (values.some(v => v == null || v === '')) return text
  let i = 0
  return (text || '').replace(/_{3,}/g, () => (i < values.length ? String(values[i++]) : '____'))
}

const rubricScore = (facts: KnownFacts, re: RegExp): number | null => {
  for (const [label, v] of Object.entries(facts.rubric || {})) if (re.test(label) && v != null) return v
  return null
}

/** The values each sentence wants, by seed key. Anything not listed keeps its blanks. */
const FILLERS: Record<string, (f: KnownFacts) => Array<string | number | null | undefined>> = {
  'reading-029': f => [f.cwpmNow != null ? Math.round(f.cwpmNow) : null, f.cwpmThen != null ? Math.round(f.cwpmThen) : null],
  'reading-030': f => [f.levelThen, f.levelNow],
  'behavior-042': f => [f.absences],
  'behavior-069': f => [f.absences],
  'writing-033': f => [rubricScore(f, /idea/i), rubricScore(f, /organi[sz]/i)],
}

export function fillKnownBlanks(seedKey: string | null | undefined, text: string, facts: KnownFacts): string {
  const want = seedKey ? FILLERS[seedKey] : null
  if (!want) return text
  const values = want(facts)
  // The reading-level and words-per-minute lines only make sense when the two numbers differ.
  if ((seedKey === 'reading-029' || seedKey === 'reading-030') && values[0] != null && values[1] != null && String(values[0]) === String(values[1])) return text
  return fillBlanks(text, values)
}
