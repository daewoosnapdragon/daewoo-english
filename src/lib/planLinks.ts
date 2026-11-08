import { BOOK_COLORS, bookName, splitUnitTitle, type CurriculumBook, type CurriculumLesson, type CurriculumObjective, type CurriculumResource, type CurriculumSeries, type CurriculumUnit } from '@/lib/curriculumCore'
import { termDates, type CurriculumPacing, type CurriculumPlacement, type SemesterLike } from '@/lib/curriculumPacing'
import type { SubjectRow } from '@/lib/lessonSync'
import { bareObjective } from '@/lib/curriculumWeek'

// ─── Linking a day's row to the book ─────────────────────────────
// A teacher types what the class does on a day, in parent words. When the
// words name a unit of one of the class's books ("Cloudette"), picking it
// from the suggestions links the row to that unit; nothing else is needed.
// The link is what lets the app see where a class is. The words stay the
// teacher's: the lesson a row is about is kept beside it for the teacher
// and never written into what parents read.

/** A line a teacher can tap onto Students will: the words finish "Students will …". */
export interface BankLine { text: string; ccss: string[]; wida: string[] }
export interface BookUnit { id: string; name: string; badge: string; summary: string; ccss: string[]; lessons: CurriculumLesson[]; files: { name: string; url: string }[]; objectives: BankLine[] }
export interface ClassBook { placement_id: string; book_id: string; label: string; level: string; name: string; color: string; units: BookUnit[] }

export interface ClassBooksInput {
  cls: string; grade: number; year: string; monthFirst: string; monthLast: string
  semesters: SemesterLike[]; placements: CurriculumPlacement[]; pacing: CurriculumPacing[]
  series: CurriculumSeries[]; books: CurriculumBook[]; units: CurriculumUnit[]; lessons: CurriculumLesson[]; resources: CurriculumResource[]
  objectives?: CurriculumObjective[]
}

/** True when a placement's term covers some of the month. A term with no dates in Settings counts as covering it. */
function termCovers(semesters: SemesterLike[], pl: CurriculumPlacement, from: string, to: string): boolean {
  if (pl.term === 'year') return true
  const t = termDates(semesters, pl.academic_year, pl.term)
  if (!t.start || !t.end) return true
  return to >= t.start && from <= t.end
}

/**
 * The books a class and grade has in the school plan for the month on screen,
 * each with its units in the school plan's order (every unit of the book when
 * the plan lists none), their lessons and files.
 */
export function classBooks(i: ClassBooksInput): ClassBook[] {
  if (!i.year) return []
  const lessonsByUnit = new Map<string, CurriculumLesson[]>()
  for (const l of i.lessons) { const a = lessonsByUnit.get(l.unit_id); if (a) a.push(l); else lessonsByUnit.set(l.unit_id, [l]) }
  const unitById = new Map(i.units.map(u => [u.id, u]))
  const bankByUnit = new Map<string, CurriculumObjective[]>()
  for (const o of i.objectives || []) { const a = bankByUnit.get(o.unit_id); if (a) a.push(o); else bankByUnit.set(o.unit_id, [o]) }
  const out: ClassBook[] = []
  const placements = i.placements
    .filter(p => p.is_master && p.english_class === i.cls && p.grade === i.grade && p.academic_year === i.year && termCovers(i.semesters, p, i.monthFirst, i.monthLast))
  for (const pl of placements) {
    const bk = i.books.find(b => b.id === pl.book_id)
    const se = bk && i.series.find(s => s.id === bk.series_id)
    if (!bk || !se || out.some(b => b.book_id === bk.id)) continue
    const planned = i.pacing.filter(r => r.placement_id === pl.id && r.owner === 'master').sort((a, b) => a.sort_order - b.sort_order).map(r => unitById.get(r.unit_id)).filter((u): u is CurriculumUnit => !!u)
    const ordered = planned.length ? planned : i.units.filter(u => u.book_id === bk.id).sort((a, b) => a.sort_order - b.sort_order)
    out.push({
      placement_id: pl.id, book_id: bk.id, label: se.name, level: bk.level_number, name: bookName(bk, se), color: BOOK_COLORS[se.color]?.hex || '#6B655B',
      units: ordered.map(u => {
        const ls = (lessonsByUnit.get(u.id) || []).slice().sort((a, b) => a.sort_order - b.sort_order)
        const ids = new Set(ls.map(l => l.id))
        const files = i.resources.filter(r => (r.unit_id === u.id || (r.lesson_id && ids.has(r.lesson_id))) && !!r.url).map(r => ({ name: r.name, url: r.url }))
        const { badge, name } = splitUnitTitle(u.title)
        return { id: u.id, name, badge, summary: u.summary || '', ccss: u.ccss_codes || [], lessons: ls, files, objectives: unitBank(bankByUnit.get(u.id) || [], ls) }
      }),
    })
  }
  return out
}

/**
 * A unit's objective bank in order. A unit with no bank yet offers its lessons'
 * "students will" lines instead, each once, so every book has something to tap.
 */
export function unitBank(bank: CurriculumObjective[], lessons: CurriculumLesson[]): BankLine[] {
  if (bank.length) return bank.slice().sort((a, b) => a.sort_order - b.sort_order).map(o => ({ text: bareObjective(o.text), ccss: o.ccss_codes || [], wida: o.wida || [] })).filter(o => !!o.text)
  const seen = new Set<string>(), out: BankLine[] = []
  for (const l of lessons) {
    const text = bareObjective(l.objective).replace(/\.$/, '')
    if (!text || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    out.push({ text, ccss: l.ccss_codes || [], wida: [] })
  }
  return out
}

/** The day's Students will line with one more objective on it, unless it is already there. */
export function addObjective(current: string, text: string): string {
  const cur = current.trim()
  if (!cur) return text
  if (norm(cur).includes(norm(text))) return current
  return `${cur.replace(/[;.,]\s*$/, '')}; ${text}`
}

/** Lower case, straight quotes, one space, no dashes or punctuation at the ends: for comparing what was typed with a unit's name. */
export const norm = (s: string) => (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim()

export interface UnitMatch { book: ClassBook; unit: BookUnit }

/** The books a row's subject points at: the book of that name, or every book when no subject is picked yet. Any other subject gets none. */
export function booksForLabel(label: string, books: ClassBook[]): ClassBook[] {
  const l = norm(label)
  if (!l) return books
  return books.filter(b => norm(b.label) === l || norm(b.name) === l)
}

/**
 * The units whose name (or "Unit 6"-style badge) matches what is typed: names
 * starting with it first, then a word starting with it, then anywhere in the
 * name; book and plan order break ties. Two letters at least.
 */
export function matchUnits(typed: string, books: ClassBook[], limit = 6): UnitMatch[] {
  const q = norm(typed)
  if (q.length < 2) return []
  const scored: { m: UnitMatch; score: number; order: number }[] = []
  let order = 0
  for (const book of books) for (const unit of book.units) {
    order++
    const name = norm(unit.name), full = norm(`${unit.badge} ${unit.name}`)
    const score = name.startsWith(q) ? 0 : name.split(/[\s\-:·,]+/).some(w => w.startsWith(q)) ? 1 : (name.includes(q) || full.includes(q)) ? 2 : -1
    if (score >= 0) scored.push({ m: { book, unit }, score, order })
  }
  return scored.sort((a, b) => a.score - b.score || a.order - b.order).slice(0, limit).map(x => x.m)
}

/** The row still names its unit: the unit's name is somewhere in the words. With no name to check against, the link stays. */
export const stillNamesUnit = (content: string, unitName: string | undefined) => !unitName || norm(content).includes(norm(unitName))

/** A row with the link it should keep after its words changed to `content`: the unit and lesson go when the words no longer name the unit. */
export function withContent(row: SubjectRow, content: string, unitName: string | undefined): SubjectRow {
  if (!row.unit_id || stillNamesUnit(content, unitName)) return { ...row, content }
  return { label: row.label, content }
}

/** A row linked to a unit: the unit's name as the words (unless the teacher's words already name it), the book as the subject, no lesson yet. */
export function linkedRow(row: SubjectRow, book: ClassBook, unit: BookUnit): SubjectRow {
  const content = stillNamesUnit(row.content, unit.name) && row.content.trim() ? row.content : unit.name
  return { label: book.label, content, unit_id: unit.id, placement_id: book.placement_id }
}

/** A row copied into another week: the words and the unit come along, the lesson does not, since next week is usually another lesson. */
export function copiedRow(row: SubjectRow): SubjectRow {
  const { lesson_id: _l, ...rest } = row
  return { ...rest }
}

/** Text safe to put inside the printed page's HTML. */
export const escapeHtml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
