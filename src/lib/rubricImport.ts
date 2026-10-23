import type { Band, RubricCriterion } from '@/components/curriculum/rubric-library'

// ─── Rubric import: shape check ──────────────────────────────────
// A rubric a teacher uploads (PDF, photo) is read by Claude into a loose
// shape: a name, and criteria with however many levels the paper used.
// This module turns that loose shape into the app's strict one (every
// criterion exactly four levels, 1 = needs guidance … 4 = exceeds, unique
// keys, non-empty text) and reports everything it had to change or could
// not fix, so the teacher reviews those lines before saving. Pure, no I/O,
// so the same check runs on the server and in tests.

/** What the model is asked to return. Levels are in the paper's own order, lowest first. */
export interface ExtractedCriterion {
  label: string
  /** Descriptors ordered from the lowest performance to the highest. */
  levels: string[]
  /** Level headings as printed, same order as levels, if the paper had them. */
  level_names?: string[]
  /** A CCSS-style code if the paper names one, e.g. W.3.1. */
  standard?: string | null
}
export interface ExtractedRubric {
  name: string
  /** The grade band the paper seems written for, if it says. */
  band?: 'k2' | 'g35' | null
  criteria: ExtractedCriterion[]
  /** Anything the reader could not place: a scoring note, a row it skipped. */
  notes?: string[]
}

export type IssueLevel = 'fix' | 'check'
export interface ImportIssue {
  /** 'fix' = must be resolved before the rubric is usable; 'check' = was changed on the way in, worth a look. */
  level: IssueLevel
  /** Index into the normalised criteria, or null for the rubric as a whole. */
  criterion: number | null
  message: string
}

export interface ImportResult {
  name: string
  band: Band
  criteria: RubricCriterion[]
  issues: ImportIssue[]
  notes: string[]
}

export const MAX_CRITERIA = 20
const MAX_LABEL = 80
const MAX_LEVEL_TEXT = 600

const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')

/** A stable key from a label: 'Ideas & details' → 'ideas_details'. */
export function keyFromLabel(label: string, taken: Set<string>): string {
  let base = label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9가-힣]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  if (!base) base = 'criterion'
  let key = base, n = 2
  while (taken.has(key)) key = `${base}_${n++}`
  taken.add(key)
  return key
}

/** A standard code the app recognises: strand.grade.number, e.g. W.3.1, RL.K.2, SL.4.1a. */
export function normalizeStandard(raw: unknown): string | undefined {
  const s = clean(raw).toUpperCase().replace(/\s+/g, '')
  if (!s) return undefined
  const m = s.match(/^(?:CCSS\.?)?(?:ELA-LITERACY\.)?(RL|RI|RF|W|SL|L)\.?(K|\d{1,2})\.?(\d{1,2}[A-F]?)$/)
  return m ? `${m[1]}.${m[2]}.${m[3]}` : undefined
}

/**
 * Four levels out of however many the paper had. 4 stays. 3 (common: below /
 * meets / exceeds) gets an empty level 1, with level 2 marked as the paper's
 * lowest, because the app's 1 is "needs guidance" below "developing". 5 or 6
 * drops the lowest, since many papers put "no attempt" there and the app has a
 * 0 for that. 2 or fewer cannot be spread out honestly; they are padded with
 * blanks for the teacher to write. Returns the levels and what it did.
 */
export function fitToFour(levels: string[]): { levels: [string, string, string, string]; note: string | null } {
  const l = levels.map(clean)
  const n = l.length
  if (n === 4) return { levels: [l[0], l[1], l[2], l[3]], note: null }
  if (n === 3) return { levels: ['', l[0], l[1], l[2]], note: 'The paper has 3 levels. They were placed at 2–4 and level 1 left for you to write.' }
  if (n === 5) return { levels: [l[1], l[2], l[3], l[4]], note: `The paper has 5 levels. The lowest (“${l[0].slice(0, 40)}${l[0].length > 40 ? '…' : ''}”) was dropped, since 0 covers no evidence in the app.` }
  if (n === 6) return { levels: [l[2], l[3], l[4], l[5]], note: 'The paper has 6 levels. The two lowest were dropped; check the four that remain.' }
  if (n > 6) return { levels: [l[n - 4], l[n - 3], l[n - 2], l[n - 1]], note: `The paper has ${n} levels. The top four were kept; check them.` }
  const padded = [...l, '', '', '', ''].slice(0, 4) as [string, string, string, string]
  return { levels: padded, note: n === 0 ? 'No level descriptors were found for this criterion.' : `Only ${n} level${n === 1 ? '' : 's'} found. Write the missing ones.` }
}

/** True when the descriptors look like they run high to low (the top level first). */
function looksReversed(levels: string[]): boolean {
  const first = levels[0]?.toLowerCase() || '', last = levels[levels.length - 1]?.toLowerCase() || ''
  const high = /\b(exceeds|excellent|exemplary|advanced|outstanding|mastery|4\s*[-–:]|consistently|always)\b/
  const low = /\b(beginning|emerging|needs (improvement|guidance|support)|not yet|limited|minimal|1\s*[-–:]|rarely|never|no evidence)\b/
  return high.test(first) && low.test(last)
}

/**
 * Turn the model's reading into a rubric draft and a list of issues. Never
 * throws on bad input: an unusable input comes back with no criteria and a
 * 'fix' issue explaining why.
 */
export function normalizeExtractedRubric(input: unknown, fallbackBand: Band): ImportResult {
  const issues: ImportIssue[] = []
  const src = (input && typeof input === 'object' ? input : {}) as Partial<ExtractedRubric>
  const name = clean(src.name).slice(0, 120)
  const band: Band = src.band === 'k2' || src.band === 'g35' ? src.band : fallbackBand
  const notes = Array.isArray(src.notes) ? src.notes.map(clean).filter(Boolean) : []
  const rawCriteria = Array.isArray(src.criteria) ? src.criteria : []

  if (!name) issues.push({ level: 'fix', criterion: null, message: 'No title was found. Give the rubric a name.' })

  const taken = new Set<string>()
  const criteria: RubricCriterion[] = []
  const list = rawCriteria.slice(0, MAX_CRITERIA)
  if (rawCriteria.length > MAX_CRITERIA) issues.push({ level: 'check', criterion: null, message: `The paper has ${rawCriteria.length} criteria; only the first ${MAX_CRITERIA} were kept.` })

  for (const raw of list) {
    const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<ExtractedCriterion>
    const label = clean(c.label).slice(0, MAX_LABEL)
    const rawLevels = Array.isArray(c.levels) ? c.levels.map(clean) : []
    if (!label && rawLevels.every(l => !l)) continue  // an empty row; nothing to keep

    const i = criteria.length
    if (!label) issues.push({ level: 'fix', criterion: i, message: 'This criterion has no name.' })

    let ordered = rawLevels
    if (ordered.length >= 2 && looksReversed(ordered)) {
      ordered = [...ordered].reverse()
      issues.push({ level: 'check', criterion: i, message: 'The levels seemed to run from highest to lowest, so they were turned around. Check that 1 is the lowest.' })
    }
    const fitted = fitToFour(ordered)
    if (fitted.note) issues.push({ level: fitted.levels.some(l => !l) ? 'fix' : 'check', criterion: i, message: fitted.note })
    const levels = fitted.levels.map(l => l.slice(0, MAX_LEVEL_TEXT)) as [string, string, string, string]
    if (fitted.note === null) levels.forEach((l, li) => { if (!l) issues.push({ level: 'fix', criterion: i, message: `Level ${li + 1} is empty.` }) })

    const standardRaw = clean(c.standard)
    const standard = normalizeStandard(standardRaw)
    if (standardRaw && !standard) issues.push({ level: 'check', criterion: i, message: `“${standardRaw}” is not a standard code the app recognises (W.3.1, RL.K.2 …), so it was left off.` })

    criteria.push({ key: keyFromLabel(label || `criterion ${i + 1}`, taken), label: label || `Criterion ${i + 1}`, levels, ...(standard ? { standard } : {}) })
  }

  if (criteria.length === 0) issues.push({ level: 'fix', criterion: null, message: 'No criteria were found. The file may not be a rubric, or the table may be an image too blurry to read.' })

  // Same label twice usually means the reader split one row, or the paper repeats a heading.
  const seen = new Map<string, number>()
  criteria.forEach((c, i) => {
    const k = c.label.toLowerCase()
    if (seen.has(k)) issues.push({ level: 'check', criterion: i, message: `“${c.label}” appears more than once.` })
    else seen.set(k, i)
  })

  return { name, band, criteria, issues, notes }
}

/** The check a draft must pass before it is saved. Same rules as the import, on the teacher's edited version. */
export function draftProblems(draft: { name: string; criteria: RubricCriterion[] }): string[] {
  const out: string[] = []
  if (!draft.name.trim()) out.push('The rubric has no name.')
  if (draft.criteria.length === 0) out.push('The rubric has no criteria.')
  draft.criteria.forEach((c, i) => {
    const who = c.label.trim() || `Criterion ${i + 1}`
    if (!c.label.trim()) out.push(`Criterion ${i + 1} has no name.`)
    if (!Array.isArray(c.levels) || c.levels.length !== 4) out.push(`${who} does not have four levels.`)
    else c.levels.forEach((l, li) => { if (!l.trim()) out.push(`${who}: level ${li + 1} is empty.`) })
  })
  return out
}
