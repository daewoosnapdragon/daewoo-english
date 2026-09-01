// ─── Item-level export ───────────────────────────────────────────────
// The results CSV stops at section totals, so the most specific thing it can
// say about a class is "weak at reading". Everything needed to say WHICH
// question and WHICH wrong answer has been stored per student all along --
// `written_answers` holds the letter actually chosen -- and nothing read it
// back out. The content files even carry authored notes explaining what each
// distractor means; they had no data to join to.
//
// Shared by both results screens on purpose. Grade 1 renders its own view from
// its own module and grades 2-5 render another, so a copy in each is a copy
// that drifts -- and the whole value of this file is that the five grades land
// in one comparable shape.

/**
 * Long format, one row per student per scored element, because the paper is
 * not rectangular: grades differ in question count and writing categories, and
 * only some have a short response. A wide sheet would need a different column
 * set per grade and grow a column every time a test is re-authored.
 */
export const DIAGNOSTICS_HEADERS = [
  'Student', 'Korean Name', 'Current Class', 'Suggested', 'Element', 'Ref', 'Section',
  'Standard', 'Domain', 'DOK', 'Response', 'Correct', 'Is Correct', 'Points', 'Max',
]

export interface DiagItem {
  qNum: number
  section?: string
  sectionLabel?: string
  standard?: string
  domain?: string
  /** Null on Grade 1, whose items are not depth-of-knowledge weighted. */
  dok?: number | null
  correct: string
  acceptable?: string[]
  acceptAny?: boolean
}

export interface DiagCategory { key: string; label?: string; max: number; standard?: string }

export interface DiagPaper {
  items: DiagItem[]
  cats: DiagCategory[]
  /** Null where the paper has no short constructed response at all. */
  shortMax: number | null
  /** Points the item is worth. Flat 1 where the version does not DOK-weight. */
  weightOf: (q: DiagItem) => number
}

export interface DiagStudent {
  name: string
  korean: string
  currentClass: string
  suggested: string
  /** qNum -> chosen letter. */
  answers: Record<number, string>
  /** Writing rubric category key -> score. */
  rubric: Record<string, number>
  /**
   * Passed as a value, not read from a key: Grade 1 stores this as
   * `writing_short` and grades 2-5 as `written_short_writing`.
   */
  shortWriting: number | null
}

/** Whether a chosen letter earns the point. An unanswered item never does. */
function scores(q: DiagItem, chosen: string): boolean {
  if (!chosen) return false
  if (q.acceptAny) return true
  if (chosen === q.correct) return true
  return Array.isArray(q.acceptable) && q.acceptable.includes(chosen)
}

export function buildDiagnosticsRows(paper: DiagPaper, students: DiagStudent[]): (string | number)[][] {
  const out: (string | number)[][] = []
  students.forEach(s => {
    const answers = s.answers || {}
    const rubric = s.rubric || {}
    // A student with no written paper at all contributes nothing -- rows of
    // blanks would read as wrong answers in every tally downstream.
    const sat = Object.keys(answers).length > 0 || Object.keys(rubric).length > 0 || s.shortWriting != null
    if (!sat) return
    const who = [s.name, s.korean || '', s.currentClass || '', s.suggested || '']

    paper.items.forEach(q => {
      const chosen = answers[q.qNum] ?? ''
      const w = paper.weightOf(q)
      // An unanswered item is emitted blank rather than dropped or scored 0, so
      // "never reached it" stays distinguishable from "got it wrong".
      const unanswered = chosen === ''
      const ok = scores(q, chosen)
      out.push([...who, 'mc', q.qNum, q.sectionLabel || q.section || '',
        q.standard || '', q.domain || '', q.dok ?? '',
        chosen, q.acceptAny ? 'any' : q.correct,
        unanswered ? '' : (ok ? 1 : 0), unanswered ? '' : (ok ? w : 0), w])
    })

    paper.cats.forEach(cat => {
      const v = rubric[cat.key]
      if (v == null) return
      out.push([...who, 'writing_category', cat.key, cat.label || '',
        cat.standard || '', 'Writing', '', '', '', '', v, cat.max])
    })

    // 0 is a score, not a blank, so this tests for null rather than falsiness.
    if (paper.shortMax != null && s.shortWriting != null) {
      out.push([...who, 'short_writing', 'short_writing', 'Short writing',
        '', 'Writing', '', '', '', '', s.shortWriting, paper.shortMax])
    }
  })
  return out
}
