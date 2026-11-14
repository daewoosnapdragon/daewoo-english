// ─── The fact sheet beside the comment box ──────────────────────
// Everything the app already knows about a student that a report card
// comment might draw on, worked out from records that exist anyway:
// letters with the change since the progress report and since last
// semester, the rubric criteria scored on the last piece, the standard
// missed most often, the latest reading and behavior notes. Nothing here
// is typed by a teacher and nothing here is inserted into a comment; it is
// for the teacher's eyes while writing. Level-test placement is left out
// on purpose, so it cannot drift into a comment. Pure functions; the
// component does the queries.

import { percentToLetter } from '@/lib/utils'

export const FACT_DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const
export type FactDomain = typeof FACT_DOMAINS[number]
export const FACT_DOMAIN_LABEL: Record<FactDomain, string> = {
  reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language',
}

/** "+4", "−3" or "0"; null when either side is missing. */
export function pointChange(prev: number | null | undefined, cur: number | null | undefined): string | null {
  if (prev == null || cur == null) return null
  const d = Math.round(cur - prev)
  return d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0'
}

/** "B+ → A−", or "B" when the letter did not move; null when either side is missing. */
export function letterChange(prev: number | null | undefined, cur: number | null | undefined): string | null {
  if (prev == null || cur == null) return null
  const a = percentToLetter(prev), b = percentToLetter(cur)
  return a === b ? a : `${a} → ${b}`
}

/** An area needs this many papers by the progress report before a change since it is shown. */
export const MIDTERM_MIN_PAPERS = 2

/**
 * The day the progress report's grades stood at: the later of the midterm
 * cutoff and the day its comment was last saved (teachers write the comment
 * from the grades on screen). Null when the semester has no cutoff.
 */
export function midtermAsOf(cutoff: string | null | undefined, progressCommentSavedAt: string | null | undefined): string | null {
  if (!cutoff) return null
  const saved = progressCommentSavedAt ? String(progressCommentSavedAt).slice(0, 10) : null
  return saved && saved > cutoff ? saved : cutoff
}

/** Assessments dated on or before the cutoff: what the progress report was built from. */
export function assessmentsUpTo<T extends { date?: string | null }>(assessments: T[], cutoff: string | null | undefined): T[] {
  if (!cutoff) return []
  return assessments.filter(a => a.date && a.date <= cutoff)
}

export interface LetterRow {
  domain: FactDomain
  label: string
  score: number | null
  letter: string | null
  na: boolean
  sinceMidterm: string | null
  sinceLast: string | null
}

export function letterRows(cur: Record<string, number | null>, na: Record<string, boolean>, midterm: Record<string, number | null> | null, prev: Record<string, number | null> | null): LetterRow[] {
  return FACT_DOMAINS.map(d => {
    const score = na[d] ? null : cur[d] ?? null
    return {
      domain: d, label: FACT_DOMAIN_LABEL[d], score, letter: score == null ? null : percentToLetter(score), na: !!na[d],
      sinceMidterm: midterm ? pointChange(midterm[d], score) : null,
      sinceLast: prev ? letterChange(prev[d], score) : null,
    }
  })
}

// ─── What the app noticed ────────────────────────────────────────

export interface RubricCriterion { key: string; label: string; standard?: string; levels?: string[] }
export interface NoticingAssessment {
  id: string
  name: string
  date?: string | null
  type?: string | null
  domain?: string | null
  max_score?: number | null
  question_map?: Array<{ num: number; max_points?: number; standard?: string; type?: string; rubric?: { name?: string; criteria: RubricCriterion[] } | null }> | null
  /** A rubric assessment carries its criteria here; rubric_scores on the grade row are keyed by criterion key. */
  rubric?: { name?: string; criteria: RubricCriterion[] } | null
}
export interface NoticingGrade {
  assessment_id: string
  score?: number | null
  is_absent?: boolean | null
  is_exempt?: boolean | null
  rubric_scores?: Record<string, number> | null
  item_responses?: Array<{ q: number; points?: number; max?: number; levels?: Record<string, number> }> | null
}
export interface NoticingInput {
  cur: Record<string, number | null>
  na: Record<string, boolean>
  midterm: Record<string, number | null> | null
  prev: Record<string, number | null> | null
  assessments: NoticingAssessment[]
  grades: NoticingGrade[]
  readingNotes: Array<{ date: string; notes?: string | null }>
  behaviorLogs: Array<{ date: string; type?: string | null; note?: string | null }>
  absences: number
  tardies: number
  /** Plain name for a standard code, e.g. RL.3.2 → "central message". */
  standardName?: (code: string) => string
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-').map(Number)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return m && d ? `${d} ${MONTHS[m - 1]}` : iso
}

function weakestStrongest(cur: Record<string, number | null>, na: Record<string, boolean>, midterm: Record<string, number | null> | null): string[] {
  const scored = FACT_DOMAINS.filter(d => !na[d] && cur[d] != null)
  if (scored.length < 2) return []
  const sorted = [...scored].sort((a, b) => (cur[a] as number) - (cur[b] as number))
  const weak = sorted[0], strong = sorted[sorted.length - 1]
  const out: string[] = []
  const move = (d: FactDomain) => {
    const ch = midterm ? pointChange(midterm[d], cur[d]) : null
    if (!ch || ch === '0') return ''
    const n = Math.abs(Math.round((cur[d] as number) - (midterm![d] as number)))
    return ch.startsWith('+') ? ` and gained ${n} point${n === 1 ? '' : 's'} since the progress report` : ` and slipped ${n} point${n === 1 ? '' : 's'} since the progress report`
  }
  out.push(`${FACT_DOMAIN_LABEL[weak]} is the weakest area${move(weak)}.`)
  if ((cur[strong] as number) - (cur[weak] as number) >= 5) out.push(`${FACT_DOMAIN_LABEL[strong]} is the strongest${move(strong)}.`)
  return out
}

/** The most recent rubric-scored piece, criterion by criterion. */
function latestRubric(assessments: NoticingAssessment[], grades: NoticingGrade[]): string | null {
  const byId = new Map(assessments.map(a => [a.id, a]))
  const candidates = grades
    .filter(g => !g.is_absent && !g.is_exempt)
    .map(g => ({ g, a: byId.get(g.assessment_id) }))
    .filter(x => x.a && ((x.g.rubric_scores && Object.keys(x.g.rubric_scores).length > 0) || (x.g.item_responses || []).some(r => r.levels && Object.keys(r.levels).length > 0)))
    .sort((x, y) => String(y.a!.date || '').localeCompare(String(x.a!.date || '')))
  const top = candidates[0]
  if (!top) return null
  const a = top.a!, g = top.g
  // Criteria keys repeat across rubrics (a library rubric is a, b, c), so each
  // rubric item is read against its own criteria, never a shared map.
  const parts: string[] = []
  const paperCriteria = a.rubric?.criteria?.length ? a.rubric.criteria : (a.question_map || []).find(q => q.rubric?.criteria?.length)?.rubric?.criteria
  if (paperCriteria?.length && g.rubric_scores) {
    for (const c of paperCriteria) { const v = g.rubric_scores[c.key]; if (v != null) parts.push(`${c.label || c.key} ${Number(v)}`) }
  }
  for (const q of a.question_map || []) {
    if (!q.rubric?.criteria?.length) continue
    const r = (g.item_responses || []).find(x => x.q === q.num)
    if (!r?.levels) continue
    for (const c of q.rubric.criteria) { const v = r.levels[c.key]; if (v != null) parts.push(`${c.label || c.key} ${Number(v)}`) }
  }
  if (parts.length === 0) return null
  return `${a.name}${a.date ? `, ${fmtDate(a.date)}` : ''}: ${parts.join(', ')} (out of 4).`
}

/** The standard with the lowest share of points, over at least four possible points. */
function mostMissedStandard(assessments: NoticingAssessment[], grades: NoticingGrade[], standardName?: (code: string) => string): string | null {
  const byId = new Map(assessments.map(a => [a.id, a]))
  const per: Record<string, { earned: number; possible: number }> = {}
  for (const g of grades) {
    if (g.is_absent || g.is_exempt) continue
    const a = byId.get(g.assessment_id)
    if (!a?.question_map || !g.item_responses) continue
    for (const q of a.question_map) {
      const r = g.item_responses.find(x => x.q === q.num)
      if (!r) continue
      if (q.rubric?.criteria?.length && r.levels) {
        for (const c of q.rubric.criteria) {
          const code = c.standard || q.standard
          const lv = r.levels[c.key]
          if (!code || lv == null) continue
          const e = (per[code] ||= { earned: 0, possible: 0 }); e.earned += Number(lv); e.possible += 4
        }
        continue
      }
      if (!q.standard) continue
      const max = Number(r.max ?? q.max_points ?? 0)
      if (!(max > 0)) continue
      const e = (per[q.standard] ||= { earned: 0, possible: 0 }); e.earned += Number(r.points || 0); e.possible += max
    }
  }
  const rows = Object.entries(per).filter(([, v]) => v.possible >= 4).map(([code, v]) => ({ code, pct: v.earned / v.possible }))
  if (rows.length === 0) return null
  rows.sort((x, y) => x.pct - y.pct)
  const worst = rows[0]
  if (worst.pct >= 0.8) return null
  const name = standardName ? standardName(worst.code) : worst.code
  const shown = name && name !== worst.code ? `${worst.code}, ${name}` : worst.code
  return `Most-missed standard: ${shown} (${Math.round(worst.pct * 100)}% of points).`
}

/** Short lines, newest first, for the teacher's eyes only. Empty when there is nothing to say. */
export function noticings(input: NoticingInput): string[] {
  const out: string[] = []
  out.push(...weakestStrongest(input.cur, input.na, input.midterm))
  const rub = latestRubric(input.assessments, input.grades)
  if (rub) out.push(rub)
  const std = mostMissedStandard(input.assessments, input.grades, input.standardName)
  if (std) out.push(std)
  const read = [...input.readingNotes].filter(r => r.notes && r.notes.trim()).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (read) out.push(`Reading check, ${fmtDate(read.date)}: “${read.notes!.trim()}”`)
  const beh = [...input.behaviorLogs].filter(b => b.note && b.note.trim()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2)
  for (const b of beh) out.push(`Behavior, ${fmtDate(b.date)}: “${b.note!.trim()}”`)
  if (input.absences >= 3 || input.tardies >= 3) out.push(`Absent ${input.absences} ${input.absences === 1 ? 'day' : 'days'}, tardy ${input.tardies}.`)
  return out
}

// ─── Rubrics this semester ───────────────────────────────────────

export interface RubricPieceCriterion {
  key: string
  label: string
  standard: string | null
  /** 0–4, null when this criterion was not scored. */
  score: number | null
  /** What the rubric says for the level scored; null at 0 or when the rubric has no descriptors. */
  descriptor: string | null
}
export interface RubricPiece {
  assessmentId: string
  name: string
  rubricName: string | null
  date: string | null
  criteria: RubricPieceCriterion[]
  /** Points earned over possible, over the criteria scored. */
  earned: number
  possible: number
}

/**
 * Every rubric-scored piece this student has, newest first, each
 * criterion with the level scored and the descriptor for that level
 * (levels[0] is level 1; level 0 has none). Rubric assessments keep
 * their criteria on the assessment and the scores in rubric_scores;
 * a rubric item inside a mixed paper keeps them in the question map and
 * the response's levels. Both are read.
 */
export function rubricPieces(assessments: NoticingAssessment[], grades: NoticingGrade[]): RubricPiece[] {
  const byId = new Map(assessments.map(a => [a.id, a]))
  const out: RubricPiece[] = []
  for (const g of grades) {
    if (g.is_absent || g.is_exempt) continue
    const a = byId.get(g.assessment_id)
    if (!a) continue
    // Criteria keys repeat across rubrics (a library rubric is a, b, c), so every
    // rubric item on a paper is read against its own criteria and kept, which is
    // how a writing task and a speaking task inside one answer-key paper both show.
    const crits: Array<{ c: RubricCriterion; rubricName: string | null; score: number | null; itemKey: string }> = []
    const push = (c: RubricCriterion, rubricName: string | null, score: number | null, itemKey: string) => { crits.push({ c, rubricName, score, itemKey }) }
    const paperRubric = a.rubric?.criteria?.length ? a.rubric : (a.question_map || []).find(q => q.rubric?.criteria?.length)?.rubric
    if (paperRubric?.criteria?.length && g.rubric_scores) {
      for (const c of paperRubric.criteria) push(c, paperRubric.name || null, g.rubric_scores[c.key] == null ? null : Number(g.rubric_scores[c.key]), 'paper')
    }
    for (const q of a.question_map || []) {
      if (!q.rubric?.criteria?.length) continue
      const r = (g.item_responses || []).find(x => x.q === q.num)
      for (const c of q.rubric.criteria) push(c, q.rubric.name || null, r?.levels?.[c.key] == null ? null : Number(r!.levels![c.key]), `q${q.num}`)
    }
    const scored = crits.filter(x => x.score != null)
    if (scored.length === 0) continue
    out.push({
      assessmentId: a.id, name: a.name, rubricName: crits.find(x => x.rubricName)?.rubricName || null, date: a.date || null,
      criteria: crits.map(({ c, score, itemKey }) => ({
        key: `${itemKey}:${c.key}`, label: c.label || c.key, standard: c.standard || null, score,
        descriptor: score != null && score >= 1 && c.levels?.[score - 1] ? c.levels[score - 1] : null,
      })),
      earned: scored.reduce((s, x) => s + (x.score as number), 0), possible: scored.length * 4,
    })
  }
  return out.sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')))
}

/** The students without a comment yet, in roster order, starting after the current one. */
export function nextWithoutComment<T extends { id: string }>(students: T[], currentId: string, hasComment: (id: string) => boolean): T | null {
  const idx = students.findIndex(s => s.id === currentId)
  const n = students.length
  for (let k = 1; k <= n; k++) {
    const s = students[(idx + k) % n]
    if (s.id !== currentId && !hasComment(s.id)) return s
  }
  return null
}
